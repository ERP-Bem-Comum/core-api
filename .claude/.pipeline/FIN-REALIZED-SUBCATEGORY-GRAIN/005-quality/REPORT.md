# FIN-REALIZED-SUBCATEGORY-GRAIN — W3 (QUALITY)

> S5 do épico #502 · `ts-quality-checker` · 2026-07-21.

## Gates (fio principal)
| Gate | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm test` | ✅ **4280 tests · 4261 pass · 0 fail · 19 skipped** |

Baseline S5: 4278/4259. Δ = +2 tests / +2 pass (surface guards). **Regressão zero.**

## ⚠️ Integração NÃO executada — e aqui pesa mais (#500)
Diferente das fatias anteriores, a S5 **não tem caminho memory** — o reader é Drizzle puro. Toda a
prova comportamental (grão desce, regra de inclusão do manual, exclusões, **nota 10 = R$55**) é
integração gated por `MYSQL_INTEGRATION=1`, **não executada** (#500). O RED foi via `typecheck`; o
verde é typecheck + inspeção de query (W1) + auditoria adversarial (W2), **não** execução contra banco.
**A soma da S5 só estará provada quando a #500 fechar.** Registrado, não escondido.

## Ressalvas do W2 (2 Minor, follow-up)
1. Documento sem categoria + manual no mesmo `(plano, subcategoria, mês)` fundem num bucket — **correto**
   (mesmo grão → soma).
2. `fin_manual_entries` **tem** `category_ref` (o comentário do reader dizia que não). O reader a
   **ignora de propósito** e entra com `categoryRef=null`. Sem impacto numérico.

## 🔑 Nota crítica para a S6 (costura + rota)
A linha do título manual sai com **`categoryRef=null` mas `subcategoryRef` preenchido**. A S6 **deve
resolver a categoria (e a trilha centro→categoria) a partir do PLANO** (via `budget-plans/public-api`,
por `subcategoryRef`), **não** do `categoryRef` da linha financeira. Motivo: o plano é o dono da
hierarquia (ADR-0051); a categoria gravada no título poderia estar inconsistente. Vale para o manual
**e** para documento sem categoria. Se a S6 usar `categoryRef` da linha como chave da árvore, o
realizado do manual fica órfão. **Esta é a premissa que não pode ficar implícita.**

## Estado
S5 pronta e verde nos gates. As três fontes do realizado (doc-conciliado, provisionado, título manual)
convergem no grão de subcategoria. Falta a S6 (rota) para o número chegar à tela.
