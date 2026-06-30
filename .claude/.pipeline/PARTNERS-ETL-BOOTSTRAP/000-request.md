# PARTNERS-ETL-BOOTSTRAP — Migração one-shot do legado → core-api (Parceiros/Cadastros)

> **Size:** L · **ADR:** ADR-0001 (migration strategy), ADR-0031 · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (§4 ETL, §2). Skills: `nodejs-fs-scripter`, `nodejs-process-runner`, `database-engineer`.
> **Decisões aplicadas:** D6 (reset por e-mail), D7 (geografia fora da ETL), D8 (migrar todos com flag) — ver épico §"Decisões do dono (2026-06-02)".

## Contexto

Bootstrap **one-shot, idempotente** que migra a base legada (NestJS/TypeORM) para o core-api. Script em
`scripts/etl/` (fora de `src/` — não é feature de produto, épico §4/§104). Base pequena, chaves naturais
existem; **não** há coexistência longa.

## Decisões aplicadas

- **D6 — senha legada → reset por e-mail.** A ETL **não** migra `users.password`. Cada usuário migrado
  nasce sem senha utilizável; a ETL **emite/registra** um token de reset (ou enfileira e-mail via EmailPort,
  ADR-0010). Login só após o usuário definir a senha.
- **D7 — geografia fora da ETL.** `state`/`municipality` são seed estático no código
  (`domain/geography/*.data.ts`). A ETL **não** toca geografia.
- **D8 — migrar todos com mapeamento do flag.** Ativos e inativos; `active=false` → estado
  Inactive/Disabled do agregado (com `disableBy`/`deactivatedAt` quando o legado fornecer).

## Escopo (`scripts/etl/`)

1. **Leitura do legado** — conector read-only à fonte (dump SQL / DB legado / CSV export — definir fonte).
2. **Pipeline por entidade** (ordem por dependência de FK):
   - `suppliers` → `Supplier` (Drizzle `par_suppliers`).
   - `financiers` → `Financier` (`par_financiers`).
   - `collaborators` → `Collaborator` (`par_collaborators`); `collaborator_history` → projeção (se houver).
   - `users` → `auth.User` (sem senha; gera reset — D6) **+** `UserProfile` (`par_user_profiles`); vínculo
     `users.collaboratorId` → `UserProfile.collaboratorRef` por ID (não FK).
3. **Idempotência** — coluna de correlação `legacy_id` por tabela (ADR §2); re-rodar não duplica
   (SELECT-by-legacy_id antes de inserir; ADR-0020 sem UPSERT nativo).
4. **Quarentena** — linhas sujas (cpf/cnpj/email inválidos, enum desconhecido, FK órfã) vão para
   `scripts/etl/quarantine/<entidade>.jsonl` com o motivo; **não** abortam o lote (import parcial).
5. **Reconciliação** — relatório final por entidade: lidos / migrados / quarentenados / já-existentes.

## Pré-requisitos (bloqueiam execução — NÃO resolvidos por este request)

| # | Pré-requisito | Estado |
| --- | --- | --- |
| P1 | `PARTNERS-USER-PROFILE-PERSISTENCE` — tabela `par_user_profiles` + repo Drizzle | ✅ entregue (commit `4458e5a`) |
| P2 | Coluna `legacy_id` (correlação) nas tabelas `par_*` migráveis + migration | ⛔ pendente → ticket `PARTNERS-LEGACY-ID-COLUMNS` (1º da cadeia) |
| P3 | Permission `'contract:mass-approve'` canônica (migração do `massApprovalPermission`) | ⛔ pendente → ticket `CTR-PERMISSION-CATALOG` (2º da cadeia). **Achado:** RBAC do auth aceita permission como string livre — não há código auth a mudar; o trabalho real é um **catálogo type-safe por módulo** em `contracts` (decisão pós-consulta a security + TS + 3 especialistas externos) |
| P4 | Fluxo de reset de senha na criação de user (token/EmailPort) — D6 | ⚠️ parcial → decomposto em P4a (ETL gera token) + P4b (CLI dispara) |
| P5 | Fonte de dados do legado definida (dump SQL / acesso DB / CSV) | ✅ resolvido — dump de PROD (ver [[project-prod-dump-etl-source]]) |

## Fora de escopo

- Geografia (D7). `migrate-occupation-area` / `history/import` legados (são seed/migration à parte, épico §104).
- Borda HTTP. Coexistência/sincronização contínua (é one-shot).

## Critérios de aceite (quando executável)

- [ ] Re-rodar a ETL não duplica registros (idempotência via `legacy_id`).
- [ ] Linha suja não aborta o lote; vai para quarentena com motivo; reconciliação contabiliza.
- [ ] `users` migram sem senha; token/e-mail de reset gerado por usuário (D6).
- [ ] Inativos migram com `active=false → Inactive/Disabled` (D8).
- [ ] Geografia NÃO é tocada (D7).
- [ ] Relatório de reconciliação bate (lidos = migrados + quarentenados + já-existentes) por entidade.
- [ ] W3 verde nos módulos de script (typecheck + lint + format + testes de unidade dos mappers ETL).

## Notas de disciplina

- Script Node 24 + `--experimental-strip-types`, ESM; `node:fs/promises`/`node:child_process` (skills FS/process).
- Reusa os agregados de domínio (validação na borda → quarentena) e os repos Drizzle existentes; zero regra nova de negócio.
- One-shot idempotente; **quarentena dupla** (resumo sem PII no git + linha completa fora do repo) — ver Decisões §Q.

## Decisões consolidadas (2026-06-02, pós-consulta a 9 agentes especialistas)

Consulta read-only a `mysql-database-expert`, `mysql2-driver-expert`, `drizzle-orm-expert`, `nodejs-runtime-expert`, `docker-compose-expert`, `nodemailer-email-expert`, `security-backend-expert`, `typescript-language-expert`, `pnpm-workspace-expert`.

### Convergências técnicas (decididas pelos especialistas)

- **Leitura:** restaurar o dump num **MySQL 8.4 efêmero** (service `mysql-legacy`, `tmpfs`, network `internal:true`, sem `ports`, dump bind `:ro`, credenciais descartáveis, GRANT SELECT-only) e ler via `SELECT` com `mysql2` (`createConnection`, `multipleStatements:false`, `decimal` como string). Parser de `.sql` rejeitado.
- **`legacy_id` (P2):** `int('legacy_id')` nullable + `uniqueIndex('par_<x>_legacy_id_idx')` por tabela. NULL = nativo; não-NULL = migrado.
- **Idempotência:** SELECT-by-`legacy_id` → INSERT/skip, transação por-linha; capturar `ER_DUP_ENTRY (1062)` e CHECK-violation `(errno 3819)` → quarentena. UUID v4 novo por registro (re-run seguro via `legacy_id` UNIQUE).
- **Escrita:** `db.insert(parX)` direto no script, construindo via smart constructors do domínio (validação→quarentena). `collaboratorRef`: map em memória `legacyId→UUID`; **collaborators antes de users**.
- **⚠️ Timezone:** verificar `time_zone` do Cloud SQL legado e fixar `timezone` no pool antes de ler `TIMESTAMP`. `datetime(6)→(3)`: truncar.
- **Script:** `scripts/etl/` (reader/mapper/writer/quarantine/reconcile); `#src/*` resolve de lá; `node:test` dos mappers com **fixtures sintéticos (nunca PII real)**; `spawn` streaming p/ restore; cleanup em SIGTERM; `combine` p/ acumular erros; `QuarantineReason` tagged union; nullable→`T|null`. **Zero-dep.** Script `etl:partners` no padrão `test:integration:*`.
- **`users.password`:** skip explícito no parser + Zod `.strip()` + nunca logar.

### Decisões do dono (2026-06-02)

- **D9 — Reset (P4):** **separar P4a + P4b.** A ETL apenas GERA/persiste tokens (idempotente, sem enviar). Disparo = passo P4b separado (CLI dedicada, `--dry-run`/Ethereal, pós-migração estável). TTL do token de migração = **72h**.
- **D10 — Inativos (D8):** **inferir default** `disableBy='legacy-migration'` + `deactivatedAt=updatedAt` para passar no CHECK e migrar todos (marcador de backfill, não dado nocivo). Reconciliação reporta a contagem.
- **D11 — `collaborator_history`:** **fora do MVP.** ETL exporta as 273 linhas para `.jsonl` (cold storage auditável), não migra. `par_collaborator_history` vira ticket futuro.
- **D12 — Quarentena/PII:** **dupla.** Resumo `{ legacy_id, table, reason }` (sem PII) versionável no git; linha completa (com PII) gravada fora do repo (`.gitignore` + retenção) para debug. Padrão DLQ + metadata logging.
- **D13 — Overflow:** `biography longtext→varchar(2000)` e `telephone varchar(255)→varchar(30)` que estouram → **quarentena** (nunca truncar silenciosamente).
- **P3 naming:** permission canônica = **`contract:mass-approve`** (alinha com o domínio, não `approval:*`).

### Cadeia de execução

**Pré-requisitos (entregues, em `dev` via PR #5):**
1. **`PARTNERS-LEGACY-ID-COLUMNS`** (P2) — `legacy_id` + uniqueIndex nas 4 `par_*`. ✅ closed-green.
2. **`CTR-PERMISSION-CATALOG`** (P3) — catálogo `CONTRACT_PERMISSION` em `contracts/public-api`. ✅ closed-green.

**Slices do ETL (branch `feat/partners-etl-bootstrap`, commits locais):**
- pré · **`PARTNERS-DISABLE-REASON-LEGACY-MARKER`** (XS) — `LEGACY_MIGRATION` no enum. ✅ closed-green · `8d46e20`.
- 1 · **`PARTNERS-ETL-CORE`** (M) — quarentena + reconciliação + 4 mappers puros. ✅ closed-green · `7c36509`.
- 2 · **`PARTNERS-ETL-READER`** (M) — decode + MySQL efêmero + reader. ✅ closed-green · `5389615` · integração verificada.
- 3 · **`PARTNERS-ETL-WRITER`** (M) — writer idempotente + orquestrador + `auth.User` + reconciliação. ⬜ **PRÓXIMO**.
- 4 · **`PARTNERS-ETL-RESET-TOKENS`** (P4a, S) — gera token de reset (TTL 72h, sem enviar). ⬜
- 5 · **`PARTNERS-ETL-RESET-DISPATCH`** (P4b, S) — CLI de disparo (`--dry-run`/Ethereal). ⬜

> **Continuação pós-`/clear`:** ler [`HANDOFF.md`](./HANDOFF.md) — API exportada do CORE+READER, spec do WRITER, gotchas e segurança do dump.
