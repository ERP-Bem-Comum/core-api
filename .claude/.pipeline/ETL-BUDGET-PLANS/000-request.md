# ETL-BUDGET-PLANS — escopo (ETL do módulo Orçamento: legado → `bgp_*`)

> Size **L**. Migra o Planejamento Orçamentário do legado (`abc-erp-financeiro-prod`) para o módulo
> `budget-plans`. Molde: `PARTNERS-ETL-*` / `ETL-FINANCIAL-WRITER`. Segue o
> `ETL-LEGACY-DIRECT-CONNECTION` — o ETL lê a `ETL_LEGACY_CONNECTION_STRING`, **nunca** sobe Docker.

## Fonte da verdade deste mapa

Todo número abaixo foi **medido** no dump de produção `Cloud_SQL_Export_2026-04-30`, restaurado no
banco de referência (`compose.etl.yaml`, tmpfs/RAM, user `etl_ro` SELECT-only). Não é estimativa.

| Tabela legada | Linhas |
| :-- | --: |
| `budget_plans` | 5 |
| `budgets` | 5 |
| `budget_results` | **4.679** |
| `cost_centers` | 36 |
| `cost_centers_categories` | 38 |
| `cost_centers_sub_categories` | 390 |
| `programs` | 2 |
| `partner_states` | 1 |
| `partner_municipalities` | 1 |
| `share_budget_plans` | 0 (vazia) |

## Decisões travadas (P.O., 2026-07-17)

1. **Migrar sem a memória de cálculo.** O `budget_results.data` (JSON com os insumos) **não** é
   migrado. Motivo: o core **já não guarda insumos para ninguém** — o contrato de lançamento é
   `{id, budgetId, subcategoryId, month, model, valueInCents}`; o POST calcula e descarta. Uma linha
   migrada fica **idêntica** a uma nativa. A memória segue consultável no dump enquanto o legado
   existir. "O core deveria guardar memória de cálculo?" é pergunta de produto, **fora deste ticket**.
2. **A ferramenta foi replicada** → a regra de cálculo do core reproduz a do legado. Ver §Validação.

## Mapa campo a campo

### 1. `budget_plans` → `bgp_budget_plans`

| Legado | Alvo | Regra |
| :-- | :-- | :-- |
| `id` (int) | `legacy_id` (int) | **coluna a criar** — ver §Migration |
| — | `id` (uuid) | UUID v4 novo |
| `year` | `year` | direto |
| `scenarioName` | `scenarioName` | direto (nullable). Encoding **verificado**: utf8mb4 íntegro (`C3 A1` = "á") |
| `version` (float) | `versionMajor` + `versionMinor` | `1`→(1,0) · `1.1`→(1,1) · `2`→(2,0). **Valores medidos: só 1, 1.1, 2.** Regra: parte inteira → major; 1ª decimal → minor. **Quarentena se >1 casa decimal** (o float não distingue `1.10` de `1.1`) |
| `status` | `status` | direto — enums idênticos (`APROVADO`/`EM_CALIBRACAO`/`RASCUNHO`) |
| `programId` (int) | `programRef` (uuid) | **via sigla** — ver §Dependências |
| `updatedById` (int) | `updatedBy` (uuid) | via `auth.legacy_id`. Só 2 usuários referenciados. Nullable no alvo → miss = `null` (não quarentena) |
| `parentId` (int) | `parentId` (uuid) | resolve na 2ª passada (o pai pode não ter UUID ainda) |
| `totalInCents` | — | **DESCARTADO.** Medido: plano 13 = `2147483647` = **2³¹−1 (INT_MAX)**, valor real 2.578.447.403 → **overflow saturado no legado, dado corrompido**. O alvo não tem a coluna. Decisão do alvo confirmada pelo dado |
| `mpath` | — | **DESCARTADO.** Medido: plano 15 tem `parentId=13` mas `mpath='15.'` (deveria ser `'13.15.'`) → **mpath quebrado no legado**. O alvo usa `parentId`+FK |
| `createdAt`/`updatedAt` | `createdAt`/`updatedAt` | direto |

### 2. `budgets` → `bgp_budgets`

| Legado | Alvo | Regra |
| :-- | :-- | :-- |
| `id` (int) | `legacy_id` | **coluna a criar** |
| `budgetPlanId` | `budgetPlanId` (uuid) | via `legacy_id` do plano |
| `partnerStateId` + `partnerMunicipalityId` | `partnerKind` + `partnerRef` | **município preenchido → `('municipality', <cod IBGE>)`; senão → `('state', <abbreviation>)`.** Não há violação de XOR: o legado grava o estado **sempre** e o município quando é municipal (medido: a linha com ambos é Fortaleza/CE, `m.uf = s.abbreviation`). **Guarda: quarentena se `m.uf ≠ s.abbreviation`** |
| `valueInCents` | — | **DESCARTADO.** O #458 justificou com premissa **falsa** ("o legado nunca a escrevia" — escrevia nas 5). Mas a **conclusão é correta e agora provada**: o total gravado bate **exatamente** com a soma dos `budget_results` (diferença = 0 nas 5 linhas). Derivar não perde nada |

### 3. `cost_centers` → `bgp_cost_centers`

| Legado | Alvo | Regra |
| :-- | :-- | :-- |
| `id` | `legacy_id` | **coluna a criar** |
| `budgetPlanId` | `budgetPlanId` (uuid) | via `legacy_id` |
| `name` | `name` | direto |
| `type` | `direction` | direto — valores idênticos. Medido: `A PAGAR` 28, `A RECEBER` 8 |
| `active` | `active` | direto |

### 4. `cost_centers_categories` → `bgp_categories`

Direto: `id`→`legacy_id`, `costCenterId`→`costCenterId` (via legacy_id), `name`, `active`.

### 5. `cost_centers_sub_categories` → `bgp_subcategories`

| Legado | Alvo | Regra |
| :-- | :-- | :-- |
| `id` | `legacy_id` | **coluna a criar** |
| `costCenterCategoryId` | `categoryId` (uuid) | via `legacy_id` |
| `name` | `name` | direto |
| `releaseType` | `launchType` | direto — enums idênticos. Medido: IPCA 364, DESPESAS_PESSOAIS 23, DESPESAS_LOGISTICAS 3, **CAED 0** |
| `type` (INSTITUCIONAL\|REDE) | — | **DESCARTADO.** Medido: **as 390 são `REDE`** — coluna constante, zero informação. ⚠️ **Premissa registrada:** se aparecer `INSTITUCIONAL`, o alvo não tem onde guardar → **quarentena** em vez de descarte silencioso |
| `active` | `active` | direto |

### 6. `budget_results` → `bgp_budget_results` (o volume: 4.679)

| Legado | Alvo | Regra |
| :-- | :-- | :-- |
| `id` | `legacy_id` | **coluna a criar** |
| `budgetId` | `budgetId` (uuid) | via `legacy_id` |
| `costCenterSubCategoryId` | `subcategoryId` (uuid) | via `legacy_id` |
| `month` | `month` | direto. Medido: 12 meses distintos |
| `valueInCents` | `valueCents` | direto |
| — | `model` | **DERIVADO da `releaseType` da subcategoria** (o legado não tem a coluna). **Provado no dado:** 4367 IPCA (todos com chave `ipca` no `data`, 0 com `salary`/`airfare`), 276 DESPESAS_PESSOAIS (todos com `salaryInCents`), 36 DESPESAS_LOGISTICAS (todos com `airfareInCents`). Soma 4.679, zero contaminação cruzada |
| `costCenterCategoryId` | — | **DESCARTADO** — derivável por `subcategoria → categoria`. Redundante no legado |
| `data` (json) | — | **DESCARTADO** por decisão da P.O. (ver §Decisões) |

## O grão bate 1:1 — e o `CLAUDE.md` está errado sobre isso

O `CLAUDE.md` afirma que o legado *"orça em categoria × mês"* e que a spec 036 *"abandona a paridade
de grão com o legado"*. **Medido:** 4.679 lançamentos = 4.679 distintos por
`(budgetId, costCenterSubCategoryId, month)`. Por categoria×mês seriam **456**. O grão do legado **é
subcategoria × mês — idêntico ao alvo**. A paridade nunca foi quebrada.

→ **A tabela principal migra 1:1.** Corrigir a afirmação no `CLAUDE.md` (fora deste ticket, mas
registrar).

## Migration obrigatória: `legacy_id`

Nenhuma tabela `bgp_*` tem `legacy_id`. `auth`, `partners` e `financial` **todas** têm, com UNIQUE, e
o comentário no schema é explícito: *"Idempotência da ETL: UNIQUE em legacy_id (múltiplos NULL
permitidos no InnoDB)"*.

Sem ele: rodar o ETL 2× **duplica tudo**, e o `alreadyExists` do `reconcile.ts` não tem como
funcionar (o invariante `read = migrated + quarantined + alreadyExists` quebra).

→ `legacy_id INT NULL` + `UNIQUE` nas **6** tabelas. Nullable porque linhas nativas não têm.

## Dependências (ordem de execução)

1. **`auth`** — `updatedById` → `updatedBy`. Já tem ETL e `legacy_id`. Só 2 usuários referenciados.
2. **`programs`** — ⚠️ **`prg_programs` NÃO tem `legacy_id` e o módulo NÃO tem ETL.** O
   `programRef` precisa do UUID. Única ponte: `programs.abbreviation` (UNIQUE no legado) ↔
   `prg_programs.sigla`. Medido: **só 2 programas — `PARC` e `EPV`, com `abbreviation` = `name`**.
   Mapeamento por sigla é viável e conferível na mão. **Quarentena se a sigla não resolver** — nunca
   inventar programa.
3. **`partners`** — `par_states` (PK=UF) e `par_municipalities` (PK=IBGE) usam **chave natural**, e o
   legado tem `abbreviation` e `cod` (IBGE). Casa direto, **sem precisar de `legacy_id`**. Medido: 1
   estado (CE) e 1 município (Fortaleza, IBGE 2304400).

## Validação do cálculo — SONDAGEM EXECUTADA (2026-07-17)

Rodada `.tmp/calc-probe.ts` (descartável): os 4.679 `data` do legado passados pelo `calculate()` do
core (`domain/budget-result/calc-model.ts`), comparados com o `valueInCents` gravado.

| Modelo | Total | Igual | Diverge | Erro |
| :-- | --: | --: | --: | --: |
| IPCA | 4367 | **4367** | 0 | 0 |
| DESPESAS_PESSOAIS | 276 | **276** | 0 | 0 |
| DESPESAS_LOGISTICAS | 36 | **36** | 0 | 0 |

**Para o ETL: sinal verde.** Todo valor migrado é idêntico ao que o core recalcularia com os mesmos
insumos. Zero risco de o número mudar quando alguém encostar num lançamento migrado — que era a razão
de a validação importar aqui. **Sai do caminho crítico deste ticket.**

### ⚠️ Mas isto NÃO resolve a clarification 030 `:37` (folha × qtd)

Medido: **`numberOfFinancialDirectors` = 1 nos 276** casos, e **`numberOfPeople` = 1 nos 36**. Com a
quantidade sempre 1, *"não multiplica"* e *"multiplica por 1"* produzem o mesmo número — a sondagem
**não discrimina** a pergunta. **O dump não pode respondê-la**: produção nunca exerceu o caso.

O que existe hoje é uma decisão **já tomada no código**, documentada em `calc-model.ts:7`:

> "o 'Qtd' da folha, `numberOfFinancialDirectors`, é metadado — não entra no cálculo, logo não faz
> parte deste input" — e declara "Paridade 1:1 com o legado `calc-total-value-result.ts`"

### RESOLVIDO por observação em tela (P.O., 2026-07-17)

A P.O. exibiu a ferramenta com **Qtd = 3**: Salário R$ 500 + Reajuste 3% = R$ 515 total; Provisões
R$ 42,92; **Custo Total = R$ 557,92** — e **não** R$ 1.673,76 (= 3×). Com Qtd ≠ 1, "não multiplica" e
"multiplica por 1" **deixam de ser indistinguíveis**: a tela prova que o Qtd **não entra no cálculo**.

→ A clarification 030 `:37` (folha × qtd) está **RESPONDIDA**: não multiplica. A decisão do
`calc-model.ts` está correta, agora por observação além do fonte. **Não bloqueia mais o W1** de nenhum
ticket de budget-plans.

**Resta só a paridade de FORMULÁRIO** (separado do cálculo): o legado **captura** o campo "Qtd" (é
metadado visível), o core não o aceita na borda. Se a P.O. quiser que a tela nova registre o Qtd como
informação (mesmo sem efeito no valor), é **issue de produto no front** — não afeta o ETL (o `data`
não migra de qualquer forma) nem o cálculo.

## Escopo (in)

1. **Migration** — `legacy_id` + UNIQUE nas 6 tabelas `bgp_*`.
2. **`budget-plans/public-api/etl.ts`** — `buildBudgetPlansEtlPort` (molde: `partners/public-api/etl.ts`).
3. **`scripts/etl/budget-plans/`** — `reader.ts` + `mapper.ts` + `main.ts` (molde: `scripts/etl/financial/`).
4. **Quarentena + reconcile** — reusa `reconcile.ts` e `quarantine/reason.ts`. Invariante por entidade.

## Fora de escopo

- Memória de cálculo (decisão 1) · `share_budget_plans` (0 linhas) · corrigir o `CLAUDE.md` (issue) ·
  ETL de `programs` (usa-se a ponte por sigla) · carga em produção (é operação, não código).

## Critérios de aceite

- **CA1** — `legacy_id` + UNIQUE nas 6 tabelas; rodar o ETL 2× é **idempotente** (2ª rodada =
  `alreadyExists`, zero duplicata).
- **CA2** — `read = migrated + quarantined + alreadyExists` por entidade (`isBalanced`).
- **CA3** — Contagens contra o banco de referência: **5/5/4679/36/38/390**.
- **CA4** — `model` derivado da `releaseType`: 4367 IPCA · 276 PESSOAIS · 36 LOGÍSTICAS.
- **CA5** — Rede: município → `('municipality', IBGE)`; senão → `('state', UF)`. `m.uf ≠ s.abbreviation` → quarentena.
- **CA6** — `version` com >1 casa decimal → quarentena (não arredonda).
- **CA7** — Sigla de programa que não resolve → quarentena (não inventa programa).
- **CA8** — `sub_category_type = 'INSTITUCIONAL'` → quarentena (não descarta em silêncio).
- **CA9** — Nenhum insumo de cálculo no destino (o `data` não migra).
- **CA10** — Soma dos `valueCents` migrados por Rede = `budgets.valueInCents` do legado (prova: diferença 0 medida).

## DoD

Gate W3 verde + ETL rodando contra o banco de referência com os 6 CAs de contagem batendo + quarentena
vazia (ou justificada linha a linha).

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — mapper puro (regras de conversão) + reconcile + idempotência |
| W1 | `drizzle-schema-author` (migration) + `ports-and-adapters` (port) + `nodejs-fs-scripter` (scripts) | migration + port + reader/mapper/main |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração contra o banco de referência |

## Fatiamento sugerido (L → 3 tickets)

1. **`BGP-ETL-LEGACY-ID`** (S) — migration `legacy_id` + UNIQUE nas 6. Isolado, sem lógica.
2. **`BGP-ETL-WRITE-PORT`** (M) — `budget-plans/public-api/etl.ts`.
3. **`BGP-ETL-READER-MAPPER`** (M) — reader + mapper + main + reconcile.
