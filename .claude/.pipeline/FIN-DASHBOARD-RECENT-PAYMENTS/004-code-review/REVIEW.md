# W2 — REVIEW · FIN-DASHBOARD-RECENT-PAYMENTS (#239)

Agentes: **`fastify-server-expert`** (implementou a borda) + **`zod-expert`** (auditoria read-only do contrato). **Veredicto final: APPROVED** (2 Major corrigidos).

## Achados do `zod-expert` + resolução

| # | Sev | Achado | Resolução |
| :-- | :-- | :-- | :-- |
| M1 | Major | `valueCents: z.number().int()` viola a convenção de Money do módulo (serializado como **string de centavos** em toda a API — bigint não é JSON-safe; `paidPayablesToDto` faz `String(v.valueCents)`). Quebra contract-first p/ o front. | **Corrigido** — `valueCents: centsStringSchema`; `recentPaymentsToDto` usa `moneyToCentsString(v.valueCents)`. Teste ajustado (`'77500'`). |
| M2 | Major | `z.uuid()` em `supplierRef`/`debitAccountRef` na **resposta** arrisca **500** na serialização: o read-model NÃO revalida UUID na leitura (`asString` só checa string\|null); drift de payload derruba a rota. Padrão do módulo p/ refs estrangeiras em response = `z.string()`. | **Corrigido** — `supplierRef`/`debitAccountRef` → `z.string().nullable()`. IDs próprios (`payableId`/`documentId`) seguem `z.uuid()`. |
| N1 | Nit | `paidAt: z.iso.date().nullable()` over-permissivo (filtro garante non-null). | **Mantido** — defensável (consistência eventual; `paidAt` é validado em formato na escrita). |
| N2 | Nit | Falta teste de lista vazia (200 → `[]`). | **Corrigido** — caso "primeira renderização" adicionado. |

## Decisões de design (fastify-server-expert)
- Permissão `reference:read` (mesma de categories/cost-centers/programs). Resposta **array direto** (espelha reference reads sem paginação). Seam `config.payableViewStore` p/ teste (espelha `contractorReadPort`).

## Gate
`typecheck` ✓ · `lint` ✓ · `format:check` ✓ · endpoint 3/3 · suíte **3314 pass / 0 fail**.
