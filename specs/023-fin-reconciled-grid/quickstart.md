# Quickstart — Validar a 023 (CONCILIADO no grid)

## O que muda

`GET /api/v2/financial/documents` passa a **derivar** o `status` do item (Pago + todos os títulos reconciliados → `Reconciled`) e a aceitar `Paid`/`Reconciled` no filtro. Nenhuma escrita em `fin_documents`, nenhuma migration.

## Verificação por testes (W0→W3)

```bash
# Read store (derivação): in-memory + drizzle-mysql (integração)
pnpm test -- --test-name-pattern="document-repository"
pnpm run test:integration   # cobre o drizzle-mysql do read store

# HTTP: conciliar → grid reflete; undo → reverte; filtro Paid/Reconciled
pnpm test -- --test-name-pattern="grid-reconciled"

# Gate W3 completo
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

**Antes do fix (RED)**: documento com todos os títulos reconciliados aparece como `Paid`; `?status=Reconciled` é rejeitado (400) ou não filtra.
**Depois (GREEN)**: aparece como `Reconciled`; filtro `Paid`/`Reconciled` funciona; undo reverte.

## Verificação manual (opcional)

```bash
# conciliar todos os títulos de um documento pago, depois:
curl -sS -H "Authorization: Bearer <jwt>" \
  "http://localhost:3000/api/v2/financial/documents?status=Reconciled" | head
# o documento conciliado aparece; com ?status=Paid ele NÃO aparece (já conciliado)
```

## Critérios de pronto (mapeiam SC)

- [ ] SC-001: documento com todos os títulos reconciliados → `Reconciled` no grid.
- [ ] SC-002: undo reverte para `Paid`.
- [ ] SC-003: filtro por `Paid` e `Reconciled` retorna o conjunto correto.
- [ ] SC-004: conciliação parcial → não aparece como Reconciled.
- [ ] SC-006: cobertura falha se a derivação/filtro regredir.
- [ ] Gate W3 verde.
