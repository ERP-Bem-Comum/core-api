# W3 — Gate final de qualidade (FIN-LISTAGEM-TIMELINE)

**Wave**: W3 · **Disciplina**: `ts-quality-checker` · **Veredito**: 🟢 GREEN · **Data**: 2026-06-16

Gate rodado a partir do worktree `.claude/worktrees/fin-module` (branch `feat/fin-listagem-timeline`), após a W2 round 2 (APPROVED) com os 3 bloqueantes corrigidos.

## Comandos e saída

| Gate | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ sem erros |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ `All matched files use Prettier code style!` |
| Lint | `pnpm run lint` (`eslint .`) | ✅ sem erros |
| Testes (unit + contrato + http) | `pnpm test` | ✅ **2512 tests · 2494 pass · 0 fail · 18 skipped** (skips = integração opt-in) |
| Integração MySQL real | `pnpm run test:integration:financial` | ✅ **12 pass · 0 fail · 0 skipped** |

## Integração financial — prova contra MySQL 8.4 real

`document-repository.drizzle-mysql.test.ts` (consome a contract-suite compartilhada), Docker compose `up --wait` → testes → `down -v` (container e secrets limpos automaticamente):

```
✔ findPaged: filtra por status (Open vs Approved no mesmo fornecedor)
✔ findPaged: pagina (page 2, pageSize 2 de 5) com total filtrado
✔ findPaged: janela de vencimento inclusiva
✔ findPaged: conjunto vazio → total 0, sem erro
✔ findPaged: empate de dueDate → desempate por id ASC (ordenação estável)        ← Fix 2 (W2)
✔ findPaged: Drafts (dueDate NULL) aparecem antes de documentos com dueDate       ← Fix 2 (W2)
✔ FinancialTimelineRepository: save grava a trilha na tx; findByDocument lê; delete cascateia
✔ Optimistic lock: expectedVersion casa → grava; versão stale → document-version-conflict
ℹ tests 12 · pass 12 · fail 0
```

O tie-breaker do Fix 2 (Issue 2 da W2) está provado contra o `ORDER BY` real do MySQL — paginação estável e determinística.

## Conclusão

Todos os gates verdes. Política de regressão zero satisfeita — nenhuma falha não-endereçada. Ticket pronto para fechar.

**Escopo entregue (spec 010 — fatia 2):** listagem real `GET /api/v2/financial/documents` (filtros + paginação estável) · trilha por-campo / Time Travel (`GET /documents/:id/timeline`, mesma tx do agregado) · optimistic lock enforçado (409 `document-version-conflict`) · `version` exposto na resposta · remoção de permissões inertes (RBAC).
