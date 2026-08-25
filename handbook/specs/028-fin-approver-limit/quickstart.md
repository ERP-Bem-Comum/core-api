# Quickstart — feature 028 (alçada do aprovador)

Como exercitar a feature ponta a ponta (após implementação dos 3 tickets).

## 1. Definir alçada num papel (auth, US2)

```bash
# Criar/atualizar papel com alçada de R$ 1.000,00 (100000 centavos)
curl -X PATCH /api/v1/roles/<roleId> \
  -H 'Authorization: Bearer <token>' \
  -d '{ "approvalLimitCents": 100000 }'
```

Papel sem `approvalLimitCents` (ou `null`) ⇒ aprovadores desse papel **não aprovam** nenhum valor (FR-008).

## 2. Lançar documento indicando aprovador (financial, US1)

```bash
# Documento de líquido R$ 5.000 (500000) com aprovador de alçada R$ 1.000 → RECUSA
curl -X POST /api/v1/financial/documents \
  -d '{ "...": "...", "approverRef": "<userId>", "grossValueCents": 500000 }'
# → 4xx "Alçada do aprovador insuficiente para o valor do documento."

# Aprovador de alçada R$ 10.000 e mesmo documento → ACEITA
```

## 3. Cascata (financial, US3)

Com aprovadores A (R$ 1.000) e B (R$ 10.000), documento de líquido R$ 5.000 indicado a A:

- Resultado esperado: encaminhado a **B** (menor alçada ≥ líquido).
- Se nenhum aprovador alcança o valor: "Nenhum aprovador com alçada suficiente para o valor."

## Testes (W0 RED primeiro)

```bash
# Domínio (puro) — financial
pnpm test -- --test-name-pattern "approval-policy"   # checkApprover + escalate

# Integração — auth (autoridade efetiva via Drizzle)
pnpm run test:integration:auth

# Integração — financial (use-case create/submit recusando por alçada)
pnpm run test:integration:financial

# Gate W3 (por ticket)
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

## Pontos de verificação (autocontenção — FR-007a)

- [ ] `financial` importa **apenas** `auth/public-api/read.ts` (nunca `auth/domain` ou `auth/application`).
- [ ] Única mudança de schema é `auth_role.approval_limit_cents` (1 coluna). `fin_*` inalterado.
- [ ] Nenhum toque em `mass-approver-role` (#45) nem dependência de spec 005.
- [ ] `ALTER ... ADD COLUMN` validado no MySQL real (8.4 INSTANT, sem hint).
