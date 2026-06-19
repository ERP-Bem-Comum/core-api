# W1 — Implementação (GREEN) · FIN-RECON-BATCH-SUGGESTIONS (#174)

**Data**: 2026-06-19

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Application | `use-cases/get-statement-suggestions.ts` (novo) | lista as transações do extrato; só `Pending` recebe palpite (conciliada → null); reusa `suggestMatches` por transação e pega a top (já ordenada por score desc) → `{transactionId, topBand, topScore}`. |
| Borda HTTP | `adapters/http/{schemas,dto,plugin,composition}.ts` | `GET /api/v2/financial/bank-statements/:id/suggestions`, perm `reconciliation:read` → `{items:[{transactionId, topBand 'alta'\|'media'\|null, topScore 0..100\|null}]}`. |
| Composição | `composition.ts` | `suggestMatches` extraída para `const suggest` reusado pela rota por-transação (#121) e pelo lote. |

GREEN: use-case 3/3, smoke HTTP 2/2; sem regressão. As N chamadas a `suggestMatches` são server-side (o gargalo do issue eram N round-trips HTTP do front). R1 preservado (nunca concilia — só read).
