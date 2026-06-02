# HANDOFF — PARTNERS-ETL-BOOTSTRAP (estado em 2026-06-02)

> Documento de continuação para sessão pós-`/clear`. Lê isto + `000-request.md` (decisões
> consolidadas D9–D13 + convergências dos 9 especialistas) antes de retomar. O próximo
> slice é o **WRITER** (slice 3/5) — o mais sensível (escreve no DB do core-api).

---

## 1. Onde estamos

ETL one-shot legado → core-api (módulo `partners`), fatiado em 5 slices. Branch de trabalho:
**`feat/partners-etl-bootstrap`** (commits LOCAIS, não pushados, base `dev`).

| # | Slice / ticket | Status |
| --- | --- | --- |
| pré | `PARTNERS-DISABLE-REASON-LEGACY-MARKER` (XS) | ✅ closed-green · commit `8d46e20` |
| 1 | `PARTNERS-ETL-CORE` (M) | ✅ closed-green · commit `7c36509` |
| 2 | `PARTNERS-ETL-READER` (M) | ✅ closed-green · commit `5389615` · integração verificada com Docker |
| 3a | **`AUTH-ETL-USER-PROVISIONING`** (M) | ✅ **closed-green** (2026-06-02) — auth: `legacy_id` em `auth_user` + port `buildAuthEtlPort` na public-api. W0→W3 verdes; integração 32/32 no home (:3307). NÃO commitado ainda. |
| 3b-i | **`PARTNERS-ETL-WRITE-PORT`** (M) | ✅ **closed-green** (2026-06-02) — `buildPartnersEtlPort` na public-api de partners (4 entidades, idempotente por `legacy_id`). W0→W3 verdes; integração 23/23 no home. commit `e31d93a`. NÃO pushado. |
| 3b-ii | **`PARTNERS-ETL-ORCHESTRATOR`** (M/L) | ⬜ **PRÓXIMO** — writer/orquestrador em `scripts/etl/` (consome auth+partners ports) + quarentena dupla + reconciliação + integração 2-DB (ver §10) |
| 4 | `PARTNERS-ETL-RESET-TOKENS` (P4a, S) | ⬜ |
| 5 | `PARTNERS-ETL-RESET-DISPATCH` (P4b, S) | ⬜ |

Pré-requisitos JÁ entregues e em `dev`: **P2** `legacy_id` nas 4 `par_*` (PR #5), **P3** catálogo
`CONTRACT_PERMISSION` em `contracts/public-api` (PR #5). Suite global: **1900 testes, 0 fail**.

Para retomar: `git checkout feat/partners-etl-bootstrap` (já deve estar nela). Node via nvm
(`export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"` nos comandos Bash não-interativos).

---

## 2. Decisões do dono (canônicas — ver `000-request.md` §Decisões)

- **D9 — Reset (P4):** separar P4a (ETL gera/persiste token, TTL **72h**, NÃO envia) + P4b (CLI de disparo, `--dry-run`/Ethereal).
- **D10 — Inativos:** `active=0` → estado Inactive com `deactivatedAt=updatedAt`; collaborator sem `disableBy` legado → backfill `disableBy='LEGACY_MIGRATION'`.
- **D11 — `collaborator_history`:** fora do MVP; exportado para `.jsonl` cold storage (já feito no READER).
- **D12 — Quarentena:** dupla — resumo `{ legacy_id, table, reason }` (sem PII) versionável; linha completa fora do git.
- **D13 — Overflow:** `biography`>2000 / `telephone`>30 → quarentena (nunca trunca).
- **P3 naming:** permission canônica = **`contract:mass-approve`** (já em `CONTRACT_PERMISSION.massApprove`).
- **Decisão de domínio:** `LEGACY_MIGRATION` adicionado ao enum `DisableReason` (marcador de proveniência, tomada pelo especialista de domínio).

---

## 3. ⚠️ Segurança — dump de PRODUÇÃO (INEGOCIÁVEL)

- Fonte real: `/Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/database/prod_dump/dump_prod_2026.sql` (fora do repo). MySQL 8.4, DB `abc-erp-financeiro-prod`. Volumes: suppliers ~100, financiers **VAZIA**, collaborators ~91, collaborator_history 273, users ~19.
- **Read-only absoluto**; nunca commitar (PII: CPF/CNPJ/email/senha-hash); nunca despejar PII em log/teste.
- **Testes usam dump SINTÉTICO** (`tests/etl/fixtures/legacy-mini.sql`, dados fake) — JAMAIS o de produção.
- Destino final = **PRODUÇÃO do core-api** (o WRITER escreve lá no passo real → exige snapshot + dry-run antes).

---

## 4. O que JÁ existe (API exportada que o WRITER consome)

Árvore `scripts/etl/`:

```
scripts/etl/
├── quarantine/reason.ts     QuarantineReason (tagged union), describeReason, toSummary, QuarantineSummary
├── reconcile.ts             EntityTally, emptyTally, countRead/Migrated/Quarantined/AlreadyExists, isBalanced
├── mappers/
│   ├── shared.ts            MapperResult<A>, MappedEntity<A>, requireField/requireEmail/parseCnpjField/
│   │                        parseCpfField/parseEnumField/parseNullableEnumField/checkOverflow(Nullable)/statusFromActive
│   ├── financier.mapper.ts  mapLegacyFinancierRow(row): MapperResult<Financier>
│   ├── supplier.mapper.ts   mapLegacySupplierRow(row): MapperResult<Supplier>
│   ├── collaborator.mapper.ts mapLegacyCollaboratorRow(row): MapperResult<Collaborator>
│   └── user.mapper.ts       mapLegacyUserRow(row): Result<ValidatedLegacyUser, QuarantineReason[]>
└── legacy/
    ├── rows.ts              LegacyFinancierRow/SupplierRow/CollaboratorRow/UserRow (sem password)
    ├── decode.ts            decodeFinancierRow/SupplierRow/CollaboratorRow/UserRow(raw): DecodeResult<LegacyXRow>
    ├── connect.ts           connectReadonly(): Promise<mysql2 Connection> (etl_ro SELECT-only)
    ├── reader.ts            readLegacyData(): Promise<LegacyData>  (financiers/suppliers/collaborators/users: TableRead<T>{rows,failures})
    ├── restore.ts           withLegacyMysql(dumpPath, fn): Result<T, RestoreError>; composeDown(); READONLY_USER/PW, LEGACY_DB
    └── history-archive.ts   archiveCollaboratorHistory(outPath): Promise<number>
```

Tipos-chave:
- `MapperResult<A> = Result<{ aggregate: A; legacyId: number }, readonly QuarantineReason[]>`
- `ValidatedLegacyUser = { legacyId, legacyCollaboratorId, email, name, cpf: Cpf, telephone, avatarUrl, massApprove }`
- `LegacyData = { financiers, suppliers, collaborators, users: TableRead<LegacyXRow> }`; `TableRead<T> = { rows: T[]; failures: DecodeFailure[] }`; `DecodeFailure = { legacyId: unknown; errors: QuarantineReason[] }`

Fluxo já provado (READER, com Docker): `withLegacyMysql(FIXTURE, async () => readLegacyData())` → restaura efêmero, lê, decodifica, teardown.

---

## 5. O que o WRITER (slice 3) precisa fazer

Escopo proposto (`PARTNERS-ETL-WRITER`, M). Abrir ticket com `pnpm run pipeline:state init PARTNERS-ETL-WRITER --size M`.

1. **Writer idempotente por entidade** (`scripts/etl/writer/`): para cada agregado mapeado, `db.insert(parX).values(...)` via Drizzle, com **SELECT-by-`legacy_id` → INSERT/skip** (ADR-0020 sem UPSERT). Setar `legacyId` na row. Capturar `ER_DUP_ENTRY (1062)` e CHECK-violation `(errno 3819)` → quarentena (não aborta o lote). Reusar os repos/schema de `src/modules/partners/adapters/persistence/` (drizzle-orm-expert deu o padrão: insert direto no schema, construindo via smart constructors do domínio — que os mappers já fazem).
2. **Map `legacyId → UUID`** em memória: ao migrar collaborators, guardar `Map<number, CollaboratorId>`. **Ordem:** suppliers → financiers → collaborators → **users** (users depende de collaborators p/ resolver `collaboratorRef`).
3. **`auth.User` + `UserProfile`** (de `ValidatedLegacyUser`): criar `auth.User` (email, **sem senha** — D6) → obtém `userRef` (UUID); resolver `collaboratorRef` via o map (`legacyCollaboratorId → UUID`, ou null/quarentena se órfão); `UserProfile.rehydrate({ userRef, name, cpf, telephone, avatarUrl, collaboratorRef })` → insert `par_user_profiles` com `legacy_id`. Se `massApprove` → conceder `CONTRACT_PERMISSION.massApprove` ao user (via Role.grant / use case AUTH-USECASE-ASSIGN-ROLE — investigar a maquinaria de auth).
4. **Quarentena dupla (D12)**: writer de quarentena `.jsonl` — resumo `{legacy_id, table, reason}` (versionável) + detalhe completo fora do git (`scripts/etl/quarantine/*.jsonl`, gitignored). Receber os `failures` do reader + os erros dos mappers + erros de insert.
5. **Reconciliação**: usar `reconcile.ts` (tally por entidade); ao fim, relatório `read = migrated + quarantined + alreadyExists`. Reportar quantos inativos receberam `LEGACY_MIGRATION` (D10).
6. **Orquestrador** (`scripts/etl/main.ts` ou `orchestrate.ts`): `withLegacyMysql(dumpPath, async () => { read → map → write → reconcile })`. Flags: `--dry-run` (transação revertida, não escreve), `--dump <path>`. Cleanup/SIGTERM (handlers de último recurso, ver CTR-NODE-LAST-RESORT-HANDLERS).
7. **Teste de integração gated** `PARTNERS_ETL_INTEGRATION=1` + skip-guard de daemon (espelhar `tests/etl/legacy/reader.integration.test.ts`): contra o **dump sintético**, sobe DOIS DBs — o efêmero legado (leitura) E um core-api efêmero (escrita) OU usa o MySQL de dev do core-api. Verificar idempotência (rodar 2× não duplica) + reconciliação. Considerar reusar o padrão `test:integration:partners` (sobe `docker compose up mysql`).

### Pré-requisitos do WRITER a investigar na próxima sessão
- Como criar `auth.User` sem senha (use case `registerUser`? ou inserir direto?). Ver `src/modules/auth/application/use-cases/register-user.ts` + `src/modules/auth/adapters/persistence/`.
- Como conceder permission a um user (Role + assign). Ver `AUTH-USECASE-ASSIGN-ROLE`, `src/modules/auth/domain/authorization/{role,authorize}.ts`.
- Conexão de ESCRITA: o core-api usa Drizzle/mysql2 (driver em `src/modules/partners/adapters/persistence/drivers/`). Para o WRITER, montar a connection de escrita (dev: MySQL local; prod: real, com cuidado).
- ⚠️ Cross-módulo: a ETL escreve em `partners` E `auth` — a criação de `auth.User` deve ir pela `public-api`/use case do auth, não por insert direto no schema do auth (ADR-0006).

---

## 6. Gotchas técnicos (aprendidos nesta sessão — economizam tempo)

- **`combine` exige type args explícitos**: a inferência falha (`Result<never, unknown[]>`) com tupla de `Result` de 2 ramos. Sempre `combine<readonly [T1, T2, ...], QuarantineReason>([...])`. Ver mappers existentes.
- **`#scripts/*`** já está em `package.json#imports` (`"./scripts/*"`); scripts importam domínio via `#src/*`.
- **mapper → rehydrate, não register**: `rehydrate` aceita status Active/Inactive direto (D10); `register` só produz Active. Os mappers parseiam campos → VOs (via `combine`) → `rehydrate`.
- **Enums literais (ADR-0031 §D2)**: valores legados batem 1:1 com as unions do domínio (mesmo os typos `ONGANIZACAO_DE_EVENTOS`/`TRASPORTE`) — `ServiceCategory.parse`/etc. validam direto; só `status` (PRE_CADASTRO→PreRegistration, CADASTRO_COMPLETO→Complete) precisa de mapeamento explícito.
- **Docker integração**: `compose.etl.yaml` sobe MySQL efêmero localhost:3309 (`--mysql-native-password=ON` p/ o `etl_ro` evitar caching_sha2 sem TLS no mysql2). `withLegacyMysql` faz up/restore/grant/teardown. Skip-guard de daemon: offline → skip (nunca RED).
- **Lint estrito em `scripts/`** (não relaxado como `tests/`): `prefer-readonly-parameter-types`, `strict-void-return`, `no-confusing-void-expression`, `promise-function-async`, `no-import-type-side-effects`. child_process: callbacks com chaves `{ }`, `import type`, funções async, stderr via `inherit` (não capturar Buffer typed).
- **Comandos de verificação**: `pnpm run typecheck` · `pnpm run lint` · `pnpm run format:check` · `pnpm test` (integração ETL skipa sem opt-in) · `pnpm run test:integration:etl` (precisa Docker vivo).

---

## 7. Estado do ambiente

- **Docker Desktop ligado** nesta sessão (para a verificação do READER). Pode estar rodando ainda (~2 GB RAM).
- Working tree limpo (tudo commitado). 3 commits ahead de `origin/dev` (não pushados).
- Container efêmero `etl-legacy-mysql` foi removido (teardown). Archive de teste em `scripts/etl/archive/` (gitignored).

---

## 8. Decisões da sessão 2026-06-02 (design do WRITER) — D14–D17 + decomposição

Investigação read-only (4 Explore + `security-backend-expert` + `mysql-database-expert`) consolidou o design do WRITER e expôs trabalho de produção no módulo `auth`. O dono decidiu cada ponto via AskUserQuestion. Prior art citado: Django *unusable password*, Kimball *audit dimension* / Data Vault `record_source`.

- **D14 — Fronteira auth (cross-módulo):** a ETL **não** acessa os repos internos do auth direto. Decisão do dono: **estender a `public-api` do auth** com um port dedicado de provisionamento ETL. (A `public-api/http.ts` atual só expõe plumbing HTTP — não serve.)
- **D15 — Role para `mass-approve`:** **Role compartilhado** `etl:mass-approver` (exatamente **1** permission: `contract:mass-approve`), atribuído só aos users com `massApprove=true`; users sem a flag nascem **sem role** (fail-closed, correto). Idempotente por `auth_role.name` UNIQUE (SELECT-by-name → reuse; capturar `ER_DUP_ENTRY` como already-exists). Recomendação do `security-backend-expert` (least-privilege, revogação atômica, auditabilidade O(1), evita role explosion). Invariante: role com `permissions.length === 1`.
- **D16 — User sem senha:** **hash argon2 REAL de um segredo random descartado** (`PasswordHasher.hash(randomBytes)`, segredo nunca logado/persistido). `authenticateUser` roda o `verify` normal → falha sempre → timing equalizado **naturalmente**, **zero mudança no domínio User / no fluxo de login**. (Alternativa Django `'!'+random` rejeitada: exigiria mexer no caminho crítico de auth.) Login só após reset (P4a, D6).
- **D17 — Proveniência:** `legacy_id INT NULL UNIQUE` em **`auth_user`** (simetria com `par_*`; dá correlação ao ID legado + idempotência + proveniência). **Não** marcar no `password_hash` (veredito formal do mysql-expert: column overloading, quebra auditoria). **Não** auditar via JOIN `auth_user × par_user_profiles` (viola ADR-0014). Adição via `ALGORITHM=INSTANT` + índice `INPLACE/LOCK=NONE`.

### Decomposição do WRITER (isolamento de módulo — anti-padrão #4)

O WRITER original (M) virou trabalho em `auth_*` **e** `par_*`/scripts. Separado em:

- **3a · `AUTH-ETL-USER-PROVISIONING`** (M, módulo `auth`): coluna `auth_user.legacy_id` + migration; port na `public-api` do auth que provisiona user legado — cria `auth.User` com hash argon2 de random + `legacy_id`, **idempotente skip-by-legacy_id** (NUNCA UPDATE — re-run não pode sobrescrever senha já resetada), cria/reusa Role `etl:mass-approver` e o atribui quando `massApprove`. Inclui gate de integração auth (`MYSQL_INTEGRATION=1`, ver [[project-test-integration-auth-gap]] — risco de falso-verde no W3).
- **3b · `PARTNERS-ETL-WRITER`** (M, `partners`/`scripts`): writer de suppliers/financiers/collaborators/user_profiles via repos Drizzle + orquestrador `scripts/etl/` (`--dry-run`, `--dump`) + quarentena dupla (D12) + reconciliação (read = migrated + quarantined + alreadyExists). Consome o port do auth (3a) para os users.

**Ordem:** 3a antes de 3b (3b depende do port). Uma sessão por módulo.

### Achado lateral (registrar/escalar — política de regressão zero)

`src/modules/auth/adapters/persistence/mappers/user.mapper.ts:152` faz `rawHash = userRow.passwordHash ?? ''` → `PasswordHash.fromString('')` retorna `err('password-hash-empty')`. **Bug latente** para users OIDC reais com `password_hash = NULL` no banco (não introduzido pela ETL). Não bloqueia 3a/3b (provisionamos hash não-vazio), mas deve virar ticket próprio no auth.

---

## 9. API do auth para o 3b (entregue por AUTH-ETL-USER-PROVISIONING)

O slice 3b (`PARTNERS-ETL-WRITER`) consome o auth EXCLUSIVAMENTE por:

```ts
import { buildAuthEtlPort } from '#src/modules/auth/public-api/etl.ts';
// tipos tambem exportados de la: ProvisionLegacyUserInput/Output/Error

const portR = await buildAuthEtlPort({ connectionString }); // Result<AuthEtlPort, AuthMysqlDriverError>; aplica migrations
if (!portR.ok) { /* quarentena/abort */ }
const { provisionLegacyUser, close } = portR.value;

// Por usuario legado (apos resolver collaboratorRef etc. no 3b):
const r = await provisionLegacyUser({
  legacyId,                 // number — users.id do legado
  email,                    // Email VO (parsear via #src/modules/auth/domain/identity/email.ts)
  massApprove,              // boolean — flag massApprovalPermission do legado
});
// r: Result<{ userRef: UserId; outcome: 'created' | 'already-exists' }, ProvisionLegacyUserError>
// userRef -> usar como UserProfile.userRef no par_user_profiles (3b).

await close(); // ao fim do lote
```

- **Idempotente:** re-run com mesmo `legacyId` → `already-exists` + mesmo `userRef`, sem sobrescrever (seguro re-rodar a ETL inteira).
- **Ordem no 3b:** suppliers → financiers → collaborators → **users**. Para cada user: `provisionLegacyUser(...)` → pega `userRef` → cria `UserProfile.rehydrate({ userRef, name, cpf, telephone, avatarUrl, collaboratorRef })` → `userProfileRepo.save`. O `collaboratorRef` vem do map `legacyCollaboratorId → CollaboratorId` montado ao migrar collaborators.
- **Senha/reset:** o user nasce sem senha utilizável; o token de reset é o slice 4 (P4a), não o 3b.
- O 3b abre DOIS handles na mesma connection-string: este (auth) + `openPartnersMysql` (par_*). Mesmo DB `core`, prefixos isolados.

---

## 10. API do partners para o 3b-ii (entregue por PARTNERS-ETL-WRITE-PORT)

```ts
import { buildPartnersEtlPort } from '#src/modules/partners/public-api/etl.ts';
// tipos: PartnersEtlPort, LegacyEntityStore, PartnersEtlStoreError, ProvisionOutcome

const portR = await buildPartnersEtlPort({ connectionString }); // Result<PartnersEtlPort, PartnersMysqlDriverError>
if (!portR.ok) { /* abort */ }
const port = portR.value;

// Por entidade (agregado JÁ construído pelos mappers do CORE):
const r = await port.suppliers.provision(supplier, legacyId);   // Result<'created'|'already-exists', E>
// idem: port.financiers / port.collaborators / port.userProfiles
const refR = await port.collaborators.findByLegacyId(legacyId); // Result<CollaboratorId | null, E> — p/ montar o map legacyId→ref
await port.close();
```

- **Idempotente por `legacy_id`:** re-run → `already-exists`, sem sobrescrever.
- O `provision` recebe o **agregado pronto** (os mappers `scripts/etl/mappers/*` do CORE já fazem `rehydrate`).

### Escopo do 3b-ii (`PARTNERS-ETL-ORCHESTRATOR`, scripts/etl/)

1. **Orquestrador** `scripts/etl/main.ts` (ou `orchestrate.ts`): `withLegacyMysql(dump, async () => { read → map → write → reconcile })`. Flags `--dry-run` / `--dump <path>`. Abre `buildAuthEtlPort` + `buildPartnersEtlPort` (connection-string do core-api de destino).
2. **Ordem (FK/refs):** suppliers → financiers → collaborators → **users**. Ao migrar collaborators, montar `Map<legacyCollaboratorId, CollaboratorId>` (via `provision` retorna outcome; usar `findByLegacyId` p/ obter a ref). Para cada user legado: `buildAuthEtlPort.provisionLegacyUser({legacyId, email, massApprove})` → `userRef` → `UserProfile.rehydrate({ userRef, name, cpf, telephone, avatarUrl, collaboratorRef })` → `port.userProfiles.provision(profile, legacyUserId)`.
3. **Quarentena dupla (D12):** resumo `{legacy_id, table, reason}` versionável + detalhe c/ PII fora do git. Recebe `failures` do reader + erros dos mappers + erros de `provision`.
4. **Reconciliação:** usar `reconcile.ts` (CORE). `read = migrated + quarantined + alreadyExists` por entidade. Reportar inativos com `LEGACY_MIGRATION` (D10).
5. **Teste integração gated** (`PARTNERS_ETL_INTEGRATION=1`): DOIS DBs — legado efêmero (leitura, `compose.etl.yaml` :3309) + core-api efêmero (escrita). Verificar idempotência (rodar 2× não duplica) + reconciliação. **Lembrar `MYSQL_PORT=3307`** se 3306 ocupada pelo ambiente `bemcomum-*`.
6. Cleanup/SIGTERM (CTR-NODE-LAST-RESORT-HANDLERS). Lint estrito em `scripts/`.

---

## 11. Auditoria 2026-06-02 (4 especialistas) — bug da integração 2-DB + achados

A 1ª execução da integração 2-DB do 3b-ii pegou um bug. Causa raiz confirmada por auditoria
adversarial (mysql-database-expert + mysql2-driver-expert + drizzle-orm-expert + nodejs-runtime-expert).

### Bug encontrado e corrigido (3b-ii)
- **Sintoma:** teste de idempotência falha (`suppliers.alreadyExists` = 1, esperado 2).
- **Causa raiz:** `tests/etl/fixtures/legacy-mini.sql` tinha 2 suppliers com o MESMO CNPJ
  (`11444777000161`). `par_suppliers` impõe `UNIQUE(cnpj)` (`par_suppliers_cnpj_idx`,
  `schemas/mysql.ts:121`) → o 2º supplier (`Forn Pix`) falha o INSERT com `ER_DUP_ENTRY (1062)`
  e cai em quarentena toda rodada, nunca persistindo. **Defeito de dado na fixture, não bug de código.**
- **Fix:** supplier 2 agora usa CNPJ válido distinto `11222333000181` (DV módulo-11 conferido) +
  comentário documentando o invariante. **Hardening:** teste 1 agora asserta `quarantined === 0`
  por entidade (contrato "fixture 100% migrável" explícito; pega fixture-suja cedo).

### Achado 1 — duplicatas de chave UNIQUE no dump ✅ INVESTIGADO (2026-06-02): RISCO ZERO
O dump legado **não tem** `UNIQUE(cnpj/cpf/email)`. Se houvesse 2+ registros com a mesma chave, a ETL
quarentenaria os duplicados (`integrity-violation`), com a ordem de PK decidindo qual sobrevive.
**Investigado contra o dump de produção real** via `pnpm run etl:check-duplicates`
(`scripts/etl/diagnostics/check-duplicates.ts`, saída agregada PII-free):

| Chave UNIQUE do destino | Volume | Grupos duplicados |
| :--- | ---: | ---: |
| `par_suppliers.cnpj` | 100 | **0** |
| `par_financiers.cnpj` | 0 (vazia) | 0 |
| `par_collaborators.cpf` | 91 | **0** |
| `par_collaborators.email` | 91 | **0** |
| `par_user_profiles.cpf` | 14 | **0** |
| `auth_user.email` | 14 | **0** |

**Resultado: 0/6 chaves com duplicata.** Normalização igual à do destino (só dígitos p/ cnpj/cpf;
lower+trim p/ email). **Nenhuma decisão de negócio pendente** — a migração real não quarentenará
nenhum registro por colisão de chave UNIQUE. Re-rodar o diagnóstico se o dump for atualizado antes
do go-live.

### Achado 2 — BUG DE OBSERVABILIDADE no adapter (ticket follow-up · módulo partners)
Em `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts`:
- `runProvision` só reconhece `ER_DUP_ENTRY` no índice `*_legacy_id_idx` (idempotência). Um 1062
  numa UNIQUE **secundária** (cnpj/cpf/email) cai no catch genérico → `err('partners-etl-store-unavailable')`
  — **erro de DADO mascarado como erro de INFRA**. Na DLQ de produção, o operador investigará
  "banco caiu" quando é CNPJ duplicado no legado.
- `log()` (linha ~37) faz `String(cause)`, que descarta o `.cause` (o `DrizzleQueryError` esconde
  o `code`/`errno`/`sqlMessage` reais do mysql2) — por isso o errno truncou no diagnóstico.
- **Fix proposto (ticket próprio):** variante `'partners-etl-store-integrity-violation'` distinta
  de `-unavailable`; `runProvision` inspeciona o índice violado; `log()` preserva `.cause`. Afeta
  `PartnersEtlStoreError` (port public-api) + testes do `PARTNERS-ETL-WRITE-PORT` (já closed-green).
  **NÃO é regressão do 3b-ii** — é melhoria de qualidade do port; merece W0→W3 dedicado.

### Achado 3 — `role=NULL` em collaborator (2ª iteração; exposto pelo hardening)
O hardening `quarantined === 0` expôs um 2º registro mascarado: collaborator legado id=2 com
`role = NULL` caía em quarentena (`RequiredFieldMissing/role`). Auditado pelos 4 especialistas.
- **Mecânica (consenso 4/4):** `role` é obrigatório de ponta a ponta — domínio
  `CollaboratorCore.role: string` (`types.ts:49`, "OpenAPI required"), schema
  `varchar(255).notNull()` (`mysql.ts:147` + migration `0002_young_cerise.sql:9`), mapper
  `requireRole` (`collaborator.mapper.ts:44-45`). O legado permite `role DEFAULT NULL`. O mapper
  está CORRETO em quarentenar — **não é bug**.
- **Risco de produção: BAIXO.** O `mysql-database-expert` consultou o dump real: **91/91
  colaboradores têm `role` preenchido**. Nenhum NULL. O collaborator role=NULL é exclusivo da
  fixture sintética.
- **Cobertura preservada:** o caso `role=NULL → RequiredFieldMissing` já tem teste unitário
  (`tests/etl/mappers/collaborator.mapper.test.ts:81`), independente da fixture de integração.
- **Fix:** fixture agora dá `role='Auxiliar Operacional'` ao collaborator id=2 (caminho feliz
  100% migrável). O caminho inativo/D10 continua exercido.

### D18 — `role=NULL` na ETL real → quarentena (decisão a confirmar pelo dono)
Recomendação unânime dos 4 especialistas: se aparecer `role=NULL` num colaborador legado na
migração real, **quarentena** (revisão manual), **NÃO backfill** — `role` é cargo de pessoa real,
diferente de `disableBy` (estado de sistema, backfill D10). Mudar o domínio para `role` nullable
foi avaliado e rejeitado (sem necessidade: produção não tem NULL; blast-radius toca a camada de
domínio). Status: **comportamento já implementado (quarentena); decisão pendente de aval formal.**
