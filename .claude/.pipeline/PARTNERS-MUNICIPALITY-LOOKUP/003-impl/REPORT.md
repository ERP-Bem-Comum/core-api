# W1 — GREEN · PARTNERS-MUNICIPALITY-LOOKUP

> Agente: ts-domain-modeler · Resultado: **GREEN** (8/8)

## Arquivos

| Arquivo | Tipo |
| :--- | :--- |
| `scripts/data/fetch-ibge-municipios.ts` | tooling — baixa o JSON IBGE para `.tmp/` (rede; rodado pelo dev) |
| `scripts/data/generate-municipalities.ts` | tooling — transforma `.tmp/ibge-municipios.json` → `municipalities.data.ts` (build-time) |
| `src/modules/partners/domain/geography/municipalities.data.ts` | **gerado** — 5571 tuplas `[cod, name, uf]`, ordenadas por código |
| `src/modules/partners/domain/geography/municipality.ts` | VO `IbgeCode` + tipo `Municipality` + lookup |

## API

- `parse(raw): Result<IbgeCode, 'invalid-ibge-code'>` — 7 dígitos.
- `listMunicipalities(): readonly Municipality[]` — 5571.
- `findMunicipalityByCod(raw): Result<Municipality, 'invalid-ibge-code'>` — O(1) via `Map`.
- `listMunicipalitiesByUf(rawUf): Result<readonly Municipality[], StateError>` — valida a UF via `State.parse` (reusa o ticket anterior).

## Decisões de design

- **Transform em build-time**: o runtime carrega o array normalizado (`MUNICIPALITIES`) e monta a lista/`Map` uma vez; não parseia 2 MB de JSON IBGE por boot.
- **`uf` é `StateAbbreviation`**: reuso do VO do `PARTNERS-STATE-LOOKUP` — o cross-check de integridade prova que as 27 UFs do catálogo são todas válidas.
- **Data file como tupla compacta** `[cod, name, uf]` em vez de objetos — menor footprint para 5571 linhas; normalização para objeto `Municipality` no runtime.
- **In-memory** (decisão da banca) — sem tabela MySQL, fecha no gate default sem Docker.

## Execução

```
ℹ tests 8 · pass 8 · fail 0
```

Inclui o teste de INTEGRIDADE (toda UF do catálogo válida + exatamente 27 UFs).

## Nota

`municipalities.data.ts` foi escrito por script (não passou pelo hook `prettier-write`); normalizado com `prettier --write` antes do gate W3.
