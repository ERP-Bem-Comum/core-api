# Épico guarda-chuva — Taxonomia planejável unificada (Plano → Subcategoria em todo título)

> **Decisão da P.O. (Alessandra, 2026-07-21):** a taxonomia do Plano Orçamentário (Programa → Plano →
> Centro de Custo → Categoria → **Subcategoria**) é **única** e vale, coerente, em **todo ponto que
> classifica dinheiro**. Todo título — lançado ou manual — carrega a classificação completa até a
> subcategoria; o contrato pré-preenche o documento; a conciliação **reflete** o título; e o **catálogo
> é sempre o plano** (owner: budget-plans, ADR-0051; lido via public-api, ADR-0006).
>
> Sem ADR novo — tudo dentro do ADR-0051. Este documento estrutura as fatias; cada uma é 1 módulo.

## Princípio (a espinha, confirmado pela P.O.)

1. **A classificação mora no TÍTULO.** Existem **dois lugares onde um título nasce**, e ambos precisam
   da taxonomia completa: (a) **Lançar documento**; (b) **Título manual na conciliação**.
2. **A conciliação não classifica** — ela reflete o título (sugerido pelo motor de palpite, ou o manual).
3. **O contrato pré-preenche o documento** (herança editável, quando o fornecedor tem contrato).
4. **O plano é o catálogo** — as opções de Centro/Categoria/Subcategoria vêm da árvore do plano, iguais
   em toda tela. Já exposto por `budget-plans/public-api` (HTTP para os dropdowns; `read.ts` para leitura).

## Estado medido (o que falta, por ponto — verificado 2026-07-21)

| Ponto | Módulo | Tem hoje | Falta |
| :-- | :-- | :-- | :-- |
| Lançar documento | financial | programa, plano, centro, categoria (refs) | **subcategory_ref** |
| Título manual (conciliação) | financial | centro, categoria, programa (refs) | **budget_plan_ref** + **subcategory_ref** |
| Contrato | contracts | plano, programa (refs); centro/categoria **texto livre** | centro/categoria → **refs** + **subcategoria** (= #343) |
| Conciliação | financial | — (reflete o título) | nada próprio (só exibição) |
| Relatório REP-5 | reports | agrupa por categoria | agrupar por **subcategoria** + a rota (fatia 3, pausada) |
| Guarda de exclusão | budget-plans | inexistente | barrar exclusão de nó referenciado |

## Fatias (tickets) — 1 módulo cada

### S1 · `FIN-DOC-SUBCATEGORY-STAMP` (financial) — o carimbo do documento
**= o antigo #502 (documento).** VO `SubcategoryRef` (`financial/domain/shared/`); coluna
`subcategory_ref` em `fin_documents` + `fin_payable_view`; persistir em `save-document`/`save-draft`;
campo opcional aditivo no create HTTP. **Garante `budget_plan_ref`** (hoje aceito mas 0/91 gravados).
Migration aditiva INSTANT. **Destrava:** grão fino do documento para o relatório.

### S2 · `FIN-MANUAL-ENTRY-TAXONOMY` (financial) — o título manual coerente
Reusa o VO de S1. Adiciona `budgetPlanRef` + `subcategoryRef` ao `record-manual-entry` (hoje carrega
só centro/categoria/programa — **nem o plano** grava). Sem isso, título manual entra torto no relatório.
**Depende de S1** (VO + coluna).

### S3 · `CTR-SUBCATEGORY-REFS` (contracts) — **= #343 (já aberta)**
Ativar subcategoria no contrato; **migrar centro/categoria de texto livre → refs do plano**. Migration
+ curadoria dos contratos existentes (texto → ref; assistida, não automática — não há de onde inferir,
como nos 91 documentos). Habilita a herança contrato→documento por ref, não por texto. **Paralela a S1.**

### S4 · `BGP-STRUCTURE-DELETE-GUARD` (budget-plans) — integridade na origem
Barrar exclusão de subcategoria/categoria/centro quando houver vínculo. **Por nível:** subcategoria →
`bgp_budget_results` (local) + documentos (`financial/public-api`); plano → + contratos
(`contracts/public-api`, por `budget_plan_id`). **Depende de S1** (para a checagem no financial existir).
Escopo próprio — protege contrato e dado orçado, não só o relatório.

### S5 · `FIN-REALIZED-SUBCATEGORY-GRAIN` (financial) — leitura no grão folha
`realized-provisioned-projection.ts` passa a agrupar por `subcategoryRef` (hoje categoria). Pequeno.
**Depende de S1 + S2** (o dado precisa existir).

### S6 · `REPORTS-REALIZED-ENDPOINT` (reports) — a rota — **já existe, W0 pronto, PAUSADA**
Retoma do W0 já escrito. Costura + rota `GET /reports/realized` no grão folha. **Depende de S5.**
Fecha o **REP-5 (#416)** e, pela mesma leitura, alimenta a **#446 (REP-3)**.

## Dependências e ordem sugerida

```
S1 (doc) ──┬─→ S2 (manual, reusa VO) ──┐
           ├─→ S4 (guarda, precisa da checagem no financial)
           └───────────────────────────┴─→ S5 (leitura grão folha) ─→ S6 (rota REP-5)
S3 (contrato / #343) ── paralela, habilita herança por ref
```

**Caminho crítico até o relatório popular** (o que o cliente vê): **S1 → S5 → S6**. S2 (manual), S3
(contrato) e S4 (guarda) enriquecem e corrigem, mas não travam o relatório de mostrar dado dos
documentos novos.

## Issues relacionadas (reuso, sem duplicar)

- **#502** — vira o guarda-chuva desta estrutura (documento = S1). Renomear/reescopar.
- **#343** — subcategoria em Contratos = **S3** (já aberta).
- **#416** (REP-5) e **#446** (REP-3) — consumidores, destravados por S6/S5.
- **#404** — guarda-chuva de entrega (Plano 100% + popular relatórios).
- **#500** — runner de integração destrói o dev; afeta o W3 de todas as fatias (integração não-executada
  até fechar, ou janela para o ritual manual).

## Fora de escopo (registrado)

- Reclassificar os 91 documentos legados (decisão nº 4: ficam de fora; regra nova só para novos).
- Contas a Receber como módulo separado — **não é necessário** (P.O.): o recebimento é a entrada real
  registrada na transação de extrato + previsão, classificada como o pagamento. A taxonomia é
  **agnóstica de direção**.
