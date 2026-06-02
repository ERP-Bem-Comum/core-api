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
| P1 | `PARTNERS-USER-PROFILE-PERSISTENCE` — tabela `par_user_profiles` + repo Drizzle | ⛔ pendente (follow-up) |
| P2 | Coluna `legacy_id` (correlação) nas tabelas `par_*` migráveis + migration | ⛔ pendente (nova migration) |
| P3 | Permission `'approval:mass-approve'` no RBAC do auth (migração do `massApprovalPermission`) | ⛔ pendente (ticket auth) |
| P4 | Fluxo de reset de senha na criação de user (token/EmailPort) — D6 | ⚠️ parcial (auth tem reset-token; falta wiring ETL) |
| P5 | Fonte de dados do legado definida (dump SQL / acesso DB / CSV) | ⛔ a definir com o dono |

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
- One-shot idempotente; logs de quarentena versionáveis para auditoria.
