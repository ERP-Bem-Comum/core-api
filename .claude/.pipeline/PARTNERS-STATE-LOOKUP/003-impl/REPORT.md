# W1 — GREEN · PARTNERS-STATE-LOOKUP

> Agente: ts-domain-modeler · Resultado: **GREEN** (8/8)

## Arquivo criado

`src/modules/partners/domain/geography/state.ts` — VO `StateAbbreviation` (Padrão D) + tipo
`BrazilianState` + catálogo imutável das 27 UFs + lookup.

## API

- `parse(raw): Result<StateAbbreviation, 'invalid-state'>` — normaliza (trim + maiúsculas), valida
  pertencimento ao conjunto (rejeita `'XX'` mesmo bem-formado).
- `listStates(): readonly BrazilianState[]` — 27 UFs, ordenadas por sigla.
- `findStateByAbbreviation(raw): Result<BrazilianState, 'invalid-state'>`.

## Decisões de design (YAGNI)

- **Catálogo como constante de domínio**, não tabela MySQL — 27 UFs são dado de referência fixo
  (decisão D7: seed read-only). Sem persistência, sem `par_states`/`ref_states` por ora.
- **`Map` de lookup** (`BY_ABBREVIATION`) montado uma vez — O(1) em `parse`/`find`, evita varrer o array.
- **Validação por pertencimento ao conjunto**, não regex `[A-Z]{2}` — o conjunto fechado das 27 UFs
  é a verdade; `'XX'` é sintaticamente válido mas semanticamente inexistente.
- Sem `generate` — UF é selecionada, não gerada.

## Execução

```
ℹ tests 8 · pass 8 · fail 0
```
