# W1 — GREEN · FIN-PAYABLE-ACCOUNT-ACTIVE

Disciplina: **`ports-and-adapters`** (use-case + guard) + convenção fastify/zod (borda). Implementação mínima (YAGNI).

## Mudanças

| Arquivo | Mudança |
| :-- | :-- |
| `application/use-cases/list-cedente-accounts-with-balance.ts` | param opcional `{ onlyActive?: boolean }`; quando `true`, `accounts.filter(isActive)` (predicado puro do domínio). Default preserva listagem geral. |
| `application/use-cases/save-document.ts` | guard no bloco `contaDebitoRef`: `if (!isActive(found.value)) return err('cedente-account-closed')`. |
| `application/use-cases/save-document.ts` (`SaveDocumentError`) | + membro `'cedente-account-closed'`. |
| `adapters/http/schemas.ts` | + `cedenteAccountListQuerySchema` (`status?: 'active' \| 'all'`). |
| `adapters/http/plugin.ts` | rota `GET /cedente-accounts` ganha `querystring`; handler passa `onlyActive: req.query.status === 'active'`. |
| `adapters/http/error-mapping.ts` | + mensagem PT de `cedente-account-closed` (status default 422). |

## Decisões

- **Predicado no domínio, filtro no use-case** — `isActive` (domínio) decide; o use-case só aplica conforme a flag. Respeita a regra application ("o `if` de negócio mora no domínio").
- **Backward-compatible** — `onlyActive` ausente = comportamento atual (todas as contas); a view de gestão (CRUD/close) não regride. O seletor do front passa `?status=active`.
- **422 (não 409)** para `cedente-account-closed` — mesma classe de `cedente-account-not-found` (fora dos sets de status → default 422). Coerente com CA6.

## Verificação

- 3 arquivos de teste do ticket: **6/6 GREEN** (CA1–CA6), incluindo os 2 guards de regressão (CA2/CA5).
- `pnpm run typecheck`: **verde** — a extensão da união `SaveDocumentError` não quebrou consumidor algum (sem switch exaustivo sobre o erro).
