# PARTNERS-GEO-READ-DEGRADE — escopo (fix de fragilidade da leitura de geografia)

> Size **S**. Uma linha órfã (`uf`/`ibge_code` fora do catálogo estático IBGE) em `par_states`/
> `par_municipalities` faz `listStates`/`listMunicipalities` **abortarem a lista inteira** com
> `err('partner-geography-read-unavailable')`. Isso propaga 503 até `GET /budget-plans/options`,
> zerando `redes` → os dropdowns de Estado/Município do modal "Adicionar Orçamento" vêm **vazios**.
> Fix: **degradar por linha**, não abortar a lista.

## Problema (diagnóstico)
Arquivo: `src/modules/partners/adapters/persistence/repos/geography-read.drizzle.ts`.
- `stateToView`/`municipalityToView` retornam `err('partner-geography-read-unavailable')` para linha órfã.
- O loop faz `if (!mapped.ok) return mapped` → **uma** órfã derruba **toda** a lista.
- Cadeia: geography-read → `partner-geography-read-unavailable` → `PartnerNetworkFromPartners.listNetworkPartners`
  → `partner-network-unavailable` → `get-budget-plan-options` → HTTP 503 → front `/budget-plans/options`
  → `redes` vazio → ambos os dropdowns vazios.

O comentário do arquivo (linhas 6-8) documenta o abort como intencional ("infra corrompida"), mas a régua
do produto é **paridade com o legado**: o legado fazia `SELECT *` puro (sem hidratação de catálogo) e
exibia a **sigla** — logo, estado cadastrado sempre aparece.

## Escopo (in)
1. **Degradar por linha** em `geography-read.drizzle.ts`:
   - **Estado órfão** → fallback: `name = uf` (a sigla; paridade com o legado). Loga, **não** aborta.
   - **Município órfão** → não há `name` para exibir (`par_municipalities` não guarda nome — só
     `ibge_code`/`uf`). Loga e **omite** a linha (`continue`). Não aborta.
   - **Erro de infra (503)** → **só** no `catch` da query real (`partner-geography-read-unavailable`).
2. **Tornar o mapeamento testável sem banco**: extrair mappers puros (`mapStateRows`/`mapMunicipalityRows`
   + unitários por linha) e exportá-los. O store passa a chamá-los dentro do `try/catch`.

## Fora de escopo
- Front (web-app): surfar "não foi possível carregar os estados" em vez de dropdown vazio — follow-up opcional.
- Reintroduzir coluna `name` em `par_municipalities` — não é necessário para o fix (parity: legado exibia nome
  do próprio row, mas a v2 hidrata do catálogo; município órfão é edge de drift de catálogo).

## Critérios de aceite
- **CA1** `mapStateRows([válido, órfão])` retorna **ambos**: o válido com nome do catálogo, o órfão com
  `name = uf` (fallback de sigla). A lista **não** é abortada.
- **CA2** `mapMunicipalityRows([válido, órfão])` retorna **só o válido**; o órfão é omitido (logado). Lista
  **não** abortada.
- **CA3** Todos válidos → todos aparecem com nome do catálogo (sem regressão do caminho feliz).
- **CA4** (infra) `listStates`/`listMunicipalities` só retornam `err('partner-geography-read-unavailable')`
  quando a **query real** falha (caminho `catch`), nunca por linha inconsistente.
- **CA5** Regressão zero: `pnpm test` puro verde.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — mappers puros: órfã não derruba a lista (CA1/CA2/CA3) |
| W1 | (main) | degradar por linha + extrair mappers puros |
| W2 | (self) | audit read-only — `err` de infra só no catch |
| W3 | `ts-quality-checker` | gate (typecheck + lint + format + test) |
