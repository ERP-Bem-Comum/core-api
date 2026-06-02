# PARTNERS-STATE-LOOKUP — Catálogo read-only de Unidades Federativas (UF)

> **Size:** S · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 1)

## Contexto

Decisão da banca (2026-06-01) sobre a questão aberta **D7**: geografias (`partner_states`,
`partner_municipalities`) são **dado de referência seed estático read-only** — não CRUD gerenciado.
As 27 UFs do Brasil são fixas (oficiais IBGE); não há create/update/delete. Isso resolve também
**D9** (sem hard/soft delete — não há delete). Substitui o `partner_states` do legado (que tinha
`POST`/`DELETE`) por um catálogo imutável.

Este é o primeiro pedaço de domínio do módulo `partners`. O consumidor real é o futuro BC de
Orçamento (`budgets.partnerStateId`); por ora entregamos o catálogo + lookup.

## Escopo

1. **VO `StateAbbreviation`** — `src/modules/partners/domain/geography/state.ts`. Branded
   `Brand<string, 'StateAbbreviation'>`, smart constructor `parse(raw): Result<StateAbbreviation, StateError>`
   que normaliza para 2 letras maiúsculas e valida **pertencimento ao conjunto das 27 UFs** (não
   basta `[A-Z]{2}`: `'XX'` é rejeitado).
2. **Tipo `BrazilianState`** — `Readonly<{ abbreviation: StateAbbreviation; name: string }>`.
3. **Catálogo imutável das 27 UFs** + lookup read-only:
   - `listStates(): readonly BrazilianState[]` (27 entradas, ordenadas por sigla).
   - `findStateByAbbreviation(raw: string): Result<BrazilianState, StateError>`.

## Fora de escopo

- `partner_municipalities` (ticket próprio — 5570 municípios, provavelmente tabela).
- Persistência MySQL / tabela `par_states` ou `ref_states` — catálogo de 27 UFs vive como
  constante de domínio (YAGNI; não precisa de tabela). Revisitar se virar gerenciado.
- Exposição via `public-api` / CLI / HTTP — entra quando houver consumidor (Orçamento).
- Create/update/delete — não existem (seed read-only).

## Critérios de aceite

- [ ] `StateAbbreviation.parse('SP')` → ok; `parse('sp')` normaliza para `'SP'`; `parse(' sp ')` idem.
- [ ] `parse('XX')` → `err('invalid-state')` (sigla bem-formada mas inexistente).
- [ ] `parse('S')`, `parse('SAO')`, `parse('')` → `err('invalid-state')`.
- [ ] `listStates()` retorna exatamente 27 UFs, ordenadas por sigla, imutável (`readonly`).
- [ ] `findStateByAbbreviation('SP')` → ok com `name === 'São Paulo'`; `'XX'` → `err`.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`.
- Idioma: código EN; nomes de UF em PT (dado real); erro kebab EN (`'invalid-state'`).
- Domínio puro (Padrão D, module-as-namespace); sem framework, sem IO.
- Catálogo é dado de referência **estável**, não dado de aplicação mutável — constante no domínio é aceitável.
