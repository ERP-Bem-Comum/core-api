# W1 (GREEN) — CONTRACTS-HTTP-WRITES-CORE (C2)

> Agente: `fastify-server-expert` (no main thread) · Driver: memory · Outcome: **GREEN** (29/29 writes + 12/12 reads)

## O que foi implementado

### `composition.ts`
- **Seed objeto (D2):** `ContractsCompositionConfig.seed` agora é
  `{ contracts?, amendments?, documents? }` (`ContractsSeed`). Migra o call site do C1.
- **Repos do writer (D5):** `Pools` ganha `contractWriterRepo`, `amendmentRepo`, `documentRepo`.
  - memory: reader = writer = mesmo `InMemoryContractRepository`; `InMemoryAmendmentRepository` +
    `InMemoryDocumentRepository`. Seed aplicado nos repos do writer (`applyMemorySeed`).
  - mysql: `createDrizzleContractRepository` (reader + writer), `createDrizzleAmendmentRepository`,
    `DocumentRepositoryDrizzle(handle.db)` no writer. `seed` → `process.stderr.write` (ignorado).
- **5 use cases de escrita** instanciados com repos do writer + `Clock`. Reads seguem no reader.

### `schemas.ts`
- Bodies: `createContractBodySchema` (discriminado por `mode` Pending|Active),
  `activateContractBodySchema`, `createAmendmentBodySchema` (discriminado por `kind`),
  `homologateBodySchema`. Datas/valor usam `z.string()`/`z.number().int()` soltos — domínio valida (→ 422).
- `amendmentParamSchema` (`id` + `amendmentId` uuid); `amendmentSchema` (resposta E3) + `AmendmentDto`.

### `amendment-dto.ts` (novo)
Mapper `Amendment` → DTO; switch exaustivo por `kind`; `NonZeroMoney` → `impactValueCents`,
`PlainDate`/`Date` → ISO 8601.

### `plugin.ts`
- 4 rotas POST `[requireAuth, authorize('contract:write')]`.
- **Classificador de erro → HTTP** (`writeErrorStatus`): 404 not-found · 409 conflito
  (`CONFLICT_CODES`, inclui a tag `ContractNotActive` e `*-repo-conflict`) · 503 repo-unavailable ·
  **default 422** (invariante semântica — nunca 500 p/ negócio). `sendDomainError` monta o envelope.

### `server.ts`
Sem mudança (o `authorize` já era passado desde o C1).

## Decisões aplicadas (aprovadas 2026-05-28)
- D3 seed test-only p/ os 200 de activate/homologate; mapeamento **409 estado / 422 semântica**;
  `signedAt`/datas validadas pelo domínio (→ 422, não 400).

## Evidência GREEN

```
contracts-writes.routes.test.ts → tests 29 · pass 29 · fail 0
contracts-reads.routes.test.ts  → tests 12 · pass 12 · fail 0  (regressão D2 revertida)
suíte completa → tests 1514 · pass 1498 · fail 0 · skipped 16 (gate integração auth, MYSQL_INTEGRATION=1)
```

Gates antecipados de W3 já verdes: `typecheck` ✓ · `lint` ✓ · `format:check` ✓ · `test` ✓.
