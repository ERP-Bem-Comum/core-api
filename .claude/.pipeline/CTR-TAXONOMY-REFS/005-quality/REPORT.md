# CTR-TAXONOMY-REFS — W3 (QUALITY)

> S3 do épico #502 (= #343) · `ts-quality-checker` · 2026-07-22.

## Gates (fio principal)
| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4328 tests · 4309 pass · 0 fail · 19 skipped** |

Baseline S3: 4308/4289. Δ: +20 tests / +20 pass / 0 fail. **Regressão zero.**

## Integração NÃO executada (#500)
O bloco `contract-taxonomy-refs.drizzle-mysql.test.ts` (roundtrip real das 3 colunas) é gated — não
executado. O bloco estrutural (`getTableColumns`) roda e passa (CA1 no nível do schema). A prova de
persistência contra banco fica para a #500 (com o Gabriel).

## Estado
S3 pronta e verde. O contrato agora carrega Centro/Categoria/Subcategoria como refs do plano (string
simples, opaco), espelhando o documento (S1) — habilita a herança contrato→documento por ref. Contratos
antigos mantêm o texto livre (histórico fora, como os 91 docs). Migration 0017 aditiva + COLLATE.

## Épico #502 — quase completo
S1 (documento) + S2 (título manual) + S5 (leitura) + S6 (rota) + **S3 (contrato)** fechadas. Falta só a
**S4** (guarda de exclusão, budget-plans) e a prova de integração (#500).
