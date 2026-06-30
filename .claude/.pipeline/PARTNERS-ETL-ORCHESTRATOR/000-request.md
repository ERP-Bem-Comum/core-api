# PARTNERS-ETL-ORCHESTRATOR — Orquestrador do ETL Parceiros (slice 3b-ii)

> **Size:** M · **Branch:** `feat/partners-etl-bootstrap` · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` · **Bootstrap pai:** `.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/` (HANDOFF §10 define o escopo exato).
> **Skills:** `tdd-strategist` (W0), `nodejs-process-runner` + `nodejs-fs-scripter` (W1), `code-reviewer` (W2), `ts-quality-checker` (W3).
> **ADRs:** ADR-0006 (módulo só via public-api), ADR-0020 (sem UPSERT — os ports já resolvem), ADR-0014 (isolamento de prefixo).

## Contexto

Slice 3b-ii do ETL one-shot legado → core-api. Os dois ports de escrita já estão entregues e
closed-green: `buildAuthEtlPort` (`#src/modules/auth/public-api/etl.ts`) e `buildPartnersEtlPort`
(`#src/modules/partners/public-api/etl.ts`). O CORE (mappers/reconcile/quarantine) e o READER
(decode/MySQL efêmero/`readLegacyData`) também já existem em `scripts/etl/`.

Falta **costurar** tudo num orquestrador: ler o legado → mapear → escrever via os ports →
reconciliar, com quarentena dupla (D12), ordem de FK/refs, idempotência e `--dry-run`.

Decisão de design da wave (resolvida em W0): o orquestrador é majoritariamente I/O em 2 DBs
(integração gated), mas a **lógica de costura é pura e testável** com ports fake/in-memory:
ordem de migração, montagem do map `legacyCollaboratorId → CollaboratorId`, agregação de
quarentena (reader.failures + mapper errors + provision errors), reconciliação
`read = migrated + quarantined + alreadyExists`, resolução de `collaboratorRef` (órfão → quarentena),
e o efeito de `--dry-run` (não persiste). O caminho 2-DB fica atrás de `PARTNERS_ETL_INTEGRATION=1`.

## Escopo (`scripts/etl/` + `tests/etl/`)

1. **Orquestrador** `scripts/etl/orchestrate.ts` (lógica pura/injetável) + `scripts/etl/main.ts`
   (entrypoint CLI: parse de flags, wiring real dos ports, `withLegacyMysql`, SIGTERM/cleanup).
   - `orchestrate(deps)` recebe os ports (auth + partners), o `LegacyData` (já lido), os mappers
     e um sink de quarentena — **sem I/O direto**, para ser testável com fakes.
   - Flags: `--dry-run` (não chama `provision`; reconcilia como se nada fosse migrado) e
     `--dump <path>` (caminho do dump; default = o sintético em testes, nunca o de produção).
2. **Ordem (FK/refs):** `suppliers → financiers → collaborators → users`. Ao migrar collaborators,
   montar `Map<number, CollaboratorId>` (legacyCollaboratorId → ref) via `provision` + `findByLegacyId`.
   Para cada user legado: `auth.provisionLegacyUser({ legacyId, email, massApprove })` → `userRef` →
   resolver `collaboratorRef` (lookup no map; `legacyCollaboratorId` null → `collaboratorRef` null;
   presente mas órfão → quarentena, **não** aborta) → `UserProfile.rehydrate({...})` →
   `partners.userProfiles.provision(profile, legacyUserId)`.
3. **Quarentena dupla (D12):** agrega 3 fontes — `reader.failures` (decode) + erros dos mappers
   (`MapperResult` err) + erros de `provision`/auth — em (a) resumo PII-free `{ legacy_id, table, reason }`
   versionável (via `toSummary`) e (b) detalhe completo (com PII) fora do git. O orquestrador chama
   um `QuarantineSink` injetável (em W1: writer `.jsonl`); a **agregação** é pura e testada em W0.
4. **Reconciliação:** `reconcile.ts` (CORE) — `EntityTally` por entidade; invariante
   `read = migrated + quarantined + alreadyExists`. Contabilizar `already-exists` (idempotência),
   `created`, quarentenados. Reportar inativos migrados com `LEGACY_MIGRATION` (D10).
5. **Teste de integração gated** `PARTNERS_ETL_INTEGRATION=1` (espelha `reader.integration.test.ts`,
   skip-guard de daemon: offline → skip, nunca RED): contra o dump SINTÉTICO, 2 DBs (legado efêmero
   :3309 para leitura + core-api efêmero para escrita). Verifica idempotência (2× não duplica) +
   reconciliação balanceada. Script novo `test:integration:etl:orchestrate` (ou estender o existente).
6. **Cleanup/SIGTERM** (CTR-NODE-LAST-RESORT-HANDLERS) no `main.ts`. Lint estrito em `scripts/`.

## Fora de escopo

- Geração/disparo de token de reset (slices 4 e 5 — P4a/P4b).
- `collaborator_history` (D11 — já arquivado em `.jsonl` pelo READER).
- Qualquer alteração em `src/` de produção (os ports já estão entregues). Este slice é só
  `scripts/etl/` + `tests/etl/`.
- Geografia (D7). Borda HTTP. Execução contra o dump de PRODUÇÃO (proibido nesta sessão).

## Critérios de aceite (testáveis)

- [ ] **Ordem** de migração é `suppliers → financiers → collaborators → users` (users por último).
- [ ] Ao migrar collaborators, o map `legacyCollaboratorId → CollaboratorId` é montado e usado para
      resolver `collaboratorRef` de cada user.
- [ ] User com `legacyCollaboratorId = null` → `collaboratorRef = null` (migra normalmente).
- [ ] User com `legacyCollaboratorId` órfão (sem collaborator migrado) → **quarentena**, sem abortar o lote.
- [ ] Idempotência: ports retornando `already-exists` são contabilizados como `alreadyExists` (não `migrated`),
      e o lote não falha.
- [ ] Quarentena agrega as 3 fontes (reader.failures + mapper errors + provision errors); o **resumo**
      gravado é PII-free (`{ legacy_id, table, reason }` via `toSummary`).
- [ ] Reconciliação balanceada por entidade: `read = migrated + quarantined + alreadyExists` (`isBalanced`).
- [ ] `--dry-run` não chama `provision` em nenhum port (verificável via fake que conta chamadas).
- [ ] Inativos migrados são reportados na reconciliação (contagem `LEGACY_MIGRATION`, D10).
- [ ] Teste de integração 2-DB gated por `PARTNERS_ETL_INTEGRATION=1` + skip-guard de daemon
      (offline → skip, nunca RED). Verifica idempotência (2×) contra o dump sintético.
- [ ] W3 verde: `typecheck` + `lint` (estrito em `scripts/`) + `format:check` + `pnpm test`.

## Invariantes (CLAUDE.md + HANDOFF §6)

- ADR-0006: ETL toca auth E partners **só** via `public-api`/ports (`buildAuthEtlPort`,
  `buildPartnersEtlPort`) — nunca repos internos.
- ADR-0020: sem UPSERT (os ports já fazem SELECT-by-legacy_id → INSERT/skip internamente).
- Idioma: código EN; docs/REPORT PT-BR; erros internos EN kebab-case; quarentena reason já é tagged union EN.
- Lint estrito em `scripts/`: `prefer-readonly-parameter-types`, `strict-void-return`,
  `promise-function-async`, child_process com `{ }` + `import type`.
- `combine` exige type args explícitos (`combine<readonly [...], QuarantineReason>([...])`).
- Testes usam o dump SINTÉTICO (`tests/etl/fixtures/legacy-mini.sql`) — JAMAIS o de produção.

## Referências

- `.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/HANDOFF.md` §5, §6, §8, §9, §10.
- `.claude/.pipeline/PARTNERS-ETL-BOOTSTRAP/000-request.md` (decisões D6–D17).
- API consumida: `#src/modules/auth/public-api/etl.ts`, `#src/modules/partners/public-api/etl.ts`.
- CORE/READER já entregues: `scripts/etl/{reconcile,quarantine/reason,mappers/*,legacy/*}.ts`.
- Espelho de integração: `tests/etl/legacy/reader.integration.test.ts`.
