# W0 — Testes RED · BDG-CONSOLIDATED-CSV (#319, US5)

Skill: `tdd-strategist`. Research: Explore sobre `../../ERP-BACKEND/budget-plans` (mecânica em
`001-research/` — resumo abaixo).

## Estado: RED ✅

3 arquivos novos falham por **inexistência da API de produção** (`ERR_MODULE_NOT_FOUND`):
`tests 3 · pass 0 · fail 3`.

| Arquivo de teste | Cobre | Módulo de produção ausente (W1) |
| :-- | :-- | :-- |
| `tests/.../adapters/http/budget-plan-csv.test.ts` | Projeção CSV pura (CA2/CA3): header 20 colunas, `;`, BOM, BRL, valor em JAN + zeros, concat sem total | `adapters/http/budget-plan-csv.ts` |
| `tests/.../application/use-cases/get-consolidated-result.test.ts` | Agregação JSON (CA1): Σ raízes aprovadas, exclusões, filtro programa, vazio coerente | `application/use-cases/get-consolidated-result.ts` |
| `tests/.../application/use-cases/get-plan-export.test.ts` | Loader da seção (CA2/CA3): rótulo+parceiro+árvore+valores; guards not-found/not-approved; consolidated-export | `application/use-cases/get-plan-export.ts` + `get-consolidated-export.ts` |

## Mecânica do legado (paridade — Explore)

- **Seleção consolidado:** `status='APROVADO' AND version=1 AND year=? [AND programId=?]`, `ORDER BY id`.
  `version=1` exclui calibrações/cenários. **Tradução US4:** `parentId IS NULL AND status='APROVADO'`
  (raízes aprovadas) — sem dupla contagem, já que a promoção é semântica-limpa (pai+filho podem ser APROVADO).
- **CSV:** `json2csv`, separador `;`, UTF-8 **com BOM**, header = 20 colunas na ordem
  `plano_orcamentario_id;plano_orcamentario;orcamento_id;orcamento;nome_centro_custo;nome_categoria;nome_sub_categoria;tipo_sub_categoria;JAN..DEZ`.
  Linhas = produto `budgets × subcategorias`; **sem linha de total/subtotal**. Valores BRL (`R$ 1.234,56`, cents/100, pt-BR).
- **"ABC"** = nome da organização (string fixa `"Consolidado ABC"`), **não** curva/classificação ABC.
- **Entrega legado:** fire-and-forget (grava arquivo + e-mail; resposta HTTP vazia) — design legado ruim.

## Decisões de porte (registradas)

1. **Seleção = raízes aprovadas** (`parentId IS NULL AND APROVADO`) — tradução fiel de `version=1 AND APROVADO`.
2. **Layout CSV = 20 colunas do legado** (decisão Gabriel 2026-07-09): valor em **JAN**, `R$ 0,00` em FEV..DEZ,
   pois o core-api não modela mês (`BudgetResult` = 1 valor por orçamento×subcategoria; parcelamento fora de escopo #233).
3. **Entrega CSV = inline na response** (decisão Gabriel: "faça o 01"): `Content-Type: text/csv` +
   `Content-Disposition: attachment`, síncrono. Autocontido, reusa `src/shared/utils/csv.ts`, sem EmailPort/FS/S3.
4. **EOL = `\r\n`** do `csv.ts` canônico (RFC 4180); a amostra byte-a-byte `HANDBOOK-...csv` **não existe** no repo.
5. **JSON `/consolidated-result` = resumo** (`{year, totalCents, plans[]}`) — CA1 pede "agregação em centavos";
   o detalhe (breakdown por centro de custo) vive no CSV. Cost-center breakdown no JSON = follow-up se o front exigir.
6. **`plan-not-approved-for-consolidation`** (FR-005): guard do `/:id/generate-csv` quando o plano não é APROVADO.

## Arquitetura (separação limpa)

Application **carrega dados** (`get-plan-export`/`get-consolidated-export` devolvem `PlanExportSection`
serializável); o **adapter HTTP formata o CSV** (`budget-plan-csv.ts` puro). Application não importa de
`adapters/` (regra da camada) nem produz string PT-BR.

## Próximo (W1)

`ts-domain-modeler` + `drizzle-orm-expert` (novo `planRepo.listApprovedRoots`) + `nodejs-fs-scripter` (CSV via csv.ts) +
`fastify`↔`zod`: implementar os 4 módulos ausentes + `listApprovedRoots` (port/drizzle/in-memory) + 3 rotas até GREEN.
