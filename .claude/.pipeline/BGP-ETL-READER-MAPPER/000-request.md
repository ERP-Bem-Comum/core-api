# BGP-ETL-READER-MAPPER — escopo (fatia 3/3 do ETL-BUDGET-PLANS)

> Size **M**. Lê o legado, traduz campo a campo e grava pelo port da fatia 2. É onde mora a
> complexidade real. Molde: `scripts/etl/financial/` (reader + mapper + main).
>
> **O mapa completo campo a campo, com os números medidos, está em
> [`ETL-BUDGET-PLANS/000-request.md`](../ETL-BUDGET-PLANS/000-request.md)** — este ticket executa
> aquele mapa; não o repete.

## Depende de

**`BGP-ETL-LEGACY-ID`** (1/3) e **`BGP-ETL-WRITE-PORT`** (2/3).

## Escopo (in)

`scripts/etl/budget-plans/`:

- **`reader.ts`** — lê o legado pela `ETL_LEGACY_CONNECTION_STRING` (**nunca** sobe Docker —
  `ETL-LEGACY-DIRECT-CONNECTION`). Ausência da env → erro explícito, não default de lab.
- **`mapper.ts`** — funções **puras** (é aqui que o W0 morde). Aplica as regras do mapa.
- **`main.ts`** — wiring: reader → mapper → port → `reconcile` + quarentena (`.tmp/`, gitignored).

## As regras que o mapper implementa (resumo — detalhe no mapa)

| Regra | Decisão |
| :-- | :-- |
| `model` do lançamento | **derivado** da `releaseType` da subcategoria (o legado não tem a coluna). Provado no dado: 4367 IPCA / 276 PESSOAIS / 36 LOGÍSTICAS, zero contaminação |
| Rede (`partnerKind`/`partnerRef`) | município preenchido → `('municipality', IBGE)`; senão → `('state', UF)`. **Quarentena se `m.uf ≠ s.abbreviation`** |
| `version` float → major/minor | `1`→(1,0) · `1.1`→(1,1) · `2`→(2,0). **Quarentena se >1 casa decimal** |
| `programId` → `programRef` | via **sigla** (`abbreviation` ↔ `sigla`). **Quarentena se não resolver — nunca inventar programa** |
| `updatedById` → `updatedBy` | via `auth.legacy_id`. Nullable no alvo → miss = `null` |
| `data` (json) | **não migra** (decisão da P.O.) |
| `totalInCents` / `mpath` / `costCenterCategoryId` / `valueInCents` do budget / `sub_category_type` | **não migram** — justificativa medida no mapa |
| `sub_category_type = 'INSTITUCIONAL'` | **quarentena** (o alvo não tem onde guardar; hoje as 390 são `REDE`) |

## Fora de escopo

- Carga em produção (é operação, não código).
- Validação do cálculo core vs legado → **ticket próprio** (ver `ETL-BUDGET-PLANS` §Validação).

## Critérios de aceite

- **CA1** — Contra o banco de referência, as contagens batem: **5** planos · **5** budgets · **4679**
  lançamentos · **36** cost centers · **38** categorias · **390** subcategorias.
- **CA2** — `read = migrated + quarantined + alreadyExists` por entidade (`isBalanced`).
- **CA3** — Rodar 2× é idempotente: 2ª rodada = tudo `alreadyExists`, zero duplicata.
- **CA4** — `model` derivado: 4367 IPCA · 276 PESSOAIS · 36 LOGÍSTICAS.
- **CA5** — Soma dos `valueCents` por Rede = `budgets.valueInCents` do legado (**diferença 0** — medida).
- **CA6** — Cada regra de quarentena (uf divergente, versão com 2 decimais, sigla órfã,
  `INSTITUCIONAL`) tem teste próprio e **não descarta em silêncio**.
- **CA7** — Nenhum insumo de cálculo no destino (o `data` não atravessa).
- **CA8** — Sem `ETL_LEGACY_CONNECTION_STRING` → erro explícito (kebab EN), não default.

## DoD

Gate W3 verde + ETL rodando ponta a ponta contra o banco de referência com CA1–CA5 batendo +
quarentena vazia ou justificada linha a linha.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — mapper puro: cada regra + cada quarentena |
| W1 | `nodejs-fs-scripter` (par `mysql2-driver-expert` no reader) | reader + mapper + main |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + ponta a ponta contra a referência |
