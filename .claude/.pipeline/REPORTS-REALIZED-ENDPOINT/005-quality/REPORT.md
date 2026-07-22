# REPORTS-REALIZED-ENDPOINT — W3 (QUALITY)

> S6 (fatia final) do épico #502 · `ts-quality-checker` · 2026-07-22.

## Gates (fio principal)
| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4308 tests · 4289 pass · 0 fail · 19 skipped** |

Baseline S6: 4295/4264/12. Δ: 12 fails → 0; +25 pass. **Regressão zero.**

## O que ESTÁ provado em execução (diferente da S5)
A costura `stitchRealizedReport` é **teste puro** — a montagem da árvore roda no `pnpm test`:
14/14 verdes, incluindo a inversão (folha com número), CA6 (categoria do plano, sem nó fantasma),
a âncora da nota 10 (**R$5.500** na folha), as somas conservando nos 4 níveis, e o CA7b.

## Integração NÃO executada (#500)
Gated: a rota-contra-DB e a **Frente A (OR do filtro de Rede)** exigem MySQL — não executadas.
A prova end-to-end contra o dado do `ETL-BUDGET-PLANS` (5 planos / 390 subcategorias) fica para a #500.

## Ressalvas do W2
- **Minor 1:** `year`/`month` sem faixa nos schemas (robustez) — não corrigido.
- **Minor 2:** divergência doc-request × impl na fronteira do ACL (a impl é a correta).
- **🚩 Observação de risco → issue #508:** sob filtro de Rede, o **realizado não é recortado** (só o
  previsto) — comparação desalinhada NAQUELE modo. Sem filtro de Rede o relatório está correto.
  É decisão da P.O. (validar com dado real / eventual S7); nenhum CA da S6 exige o recorte. **Não é
  regressão da S6.**

## Estado — o épico do relatório está COMPLETO em código
S1 (documento) + S2 (título manual) + S5 (leitura por subcategoria) + S6 (costura + rota) fecham o
Realizado × Planejado. Falta: a prova de integração (#500), e as paralelas S3 (contrato/#343) + S4 (guarda).
