# PARTNERS-MUNICIPALITY-LOOKUP — Catálogo read-only de municípios IBGE

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 1)

## Contexto

Segundo pedaço de geografia (após `PARTNERS-STATE-LOOKUP`). Decisão da banca (2026-06-01): dado de
referência **seed read-only** (D7), e — por serem ~5570 municípios — persistidos como **arquivo de
dados versionado + lookup in-memory** (não tabela MySQL; fecha no gate default sem Docker).

Fonte oficial: API IBGE `localidades/municipios?view=nivelado` (baixada para `.tmp/ibge-municipios.json`,
gitignored). O transform IBGE→`Municipality` ocorre em **build-time** (script gerador); o runtime
carrega o array já normalizado. Substitui o `partner_municipalities` do legado (que tinha CRUD).

## Escopo

1. **VO `IbgeCode`** — `src/modules/partners/domain/geography/municipality.ts`. Branded
   `Brand<string, 'IbgeCode'>`, `parse(raw): Result<IbgeCode, MunicipalityError>` — 7 dígitos.
2. **Tipo `Municipality`** — `Readonly<{ cod: IbgeCode; name: string; uf: StateAbbreviation }>`.
   A `uf` reusa o VO `StateAbbreviation` do ticket anterior (cross-check: toda UF do catálogo é válida).
3. **Catálogo gerado** — `municipalities.data.ts` (gerado de `.tmp/ibge-municipios.json` por
   `scripts/data/generate-municipalities.ts`). Array compacto, marcado como gerado.
4. **Lookup read-only**:
   - `listMunicipalities(): readonly Municipality[]`
   - `findMunicipalityByCod(raw): Result<Municipality, MunicipalityError>`
   - `listMunicipalitiesByUf(rawUf): Result<readonly Municipality[], StateError>`
5. **Scripts de tooling** (commitáveis): `fetch-ibge-municipios.ts` (já criado) e `generate-municipalities.ts`.

## Fora de escopo

- Tabela MySQL / persistência relacional (decisão: in-memory).
- `public-api` / CLI / HTTP — entram com o consumidor (Orçamento).
- Create/update/delete — seed read-only.

## Critérios de aceite

- [ ] `IbgeCode.parse('3550308')` → ok; `parse('123')`/`parse('abc')`/`parse('')` → `err('invalid-ibge-code')`.
- [ ] `listMunicipalities()` retorna o total do IBGE (~5570), imutável (`readonly`).
- [ ] `findMunicipalityByCod('3550308')` → `{ name: 'São Paulo', uf: 'SP' }`.
- [ ] `listMunicipalitiesByUf('SP')` → só municípios de SP; `listMunicipalitiesByUf('XX')` → `err('invalid-state')`.
- [ ] **Integridade**: toda `uf` do catálogo é uma `StateAbbreviation` válida (cross-check com o catálogo de estados).
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`.
- Código EN; nomes de município em PT (dado real); erros kebab EN (`'invalid-ibge-code'`).
- Transform IBGE→domínio é build-time; runtime só carrega + faz lookup (não parseia 2 MB por boot).
