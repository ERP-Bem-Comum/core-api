# W1 — GREEN · FIN-DASHBOARD-RECENT-PAYMENTS (#239)

Disciplinas: `ts-domain-modeler` (read-model) + agentes `drizzle-orm-expert` (schema/store) + `fastify-server-expert` (borda) + `zod-expert` (contrato).

## Camada 0 — enriquecimento do read-model
| Arquivo | Mudança |
| :-- | :-- |
| `domain/payable-view/types.ts` | `PayableView` +`debitAccountRef`/`paidAt`. |
| `domain/document/events.ts` + `document.ts` | `DocumentSaved` carrega `debitAccountRef`. |
| `application/use-cases/apply-payable-event.ts` | projetor grava `debitAccountRef`; `PayableManuallyPaid` → `markPaid` (status='Paid' + `paidAt` YYYY-MM-DD). |
| `application/ports/payable-view-store.ts` | port +`markPaid`, +`listRecentPaid`. |
| `adapters/persistence/repos/payable-view-store.{in-memory,drizzle}.ts` | `markPaid` + `listRecentPaid` (status='Paid' ORDER BY paid_at desc LIMIT n); upsert preserva status+paidAt. |
| `schemas/mysql.ts` + migration `0029` | `fin_payable_view` +`debit_account_ref`/`paid_at` + índice `paid_at` (ALTER ADD nullable = INSTANT). |
| `mappers/payable-view.mapper.ts` | +`debitAccountRef`/`paidAt`. |

## Camada 1 — widget (borda HTTP)
| Arquivo | Mudança |
| :-- | :-- |
| `adapters/http/composition.ts` | wiring `PayableViewStore` (Pools + 2 builders + deps `listRecentPaid` + seam `config.payableViewStore` p/ teste). |
| `adapters/http/schemas.ts` + `dto.ts` | `recentPaymentSchema` (array) + `recentPaymentsToDto`. |
| `adapters/http/plugin.ts` | `GET /financial/dashboard/recent-payments` (`reference:read`; Top-5 pagos). |
| `tests/.../recent-payments.test.ts` + `.../http/recent-payments.http.test.ts` | CA1/CA2 (projetor+store) + CA3 (borda 200/403/vazio). |

## Verificação
CA1/CA2/CA3 GREEN; suíte **3314 pass / 0 fail**. Integração/e2e via CI/VM (Docker gated).
