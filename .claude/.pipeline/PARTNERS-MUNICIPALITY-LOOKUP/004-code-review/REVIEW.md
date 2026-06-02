# W2 — REVIEW · PARTNERS-MUNICIPALITY-LOOKUP

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| Idioma (código EN, nome município PT, erro kebab) | ✅ | `'invalid-ibge-code'` |
| `import type` / inline `type` | ✅ | `import type { Brand }`, `import type { StateAbbreviation, StateError }` |
| `.ts` + `#src/*` + relativo intra-módulo | ✅ | `./state.ts`, `./municipalities.data.ts` |
| Padrão D, sem `generate` | ✅ | parse/list/find/listByUf |
| Domínio puro | ✅ | sem IO em runtime; dados estáticos |
| `Result<T,E>` | ✅ | inclui propagação do `StateError` em `listMunicipalitiesByUf` |
| Imutabilidade | ✅ | `MUNICIPALITIES_LIST` readonly; `Map` read-only |
| YAGNI | ✅ | só lookup; sem persistência/public-api |
| Reuso cross-ticket | ✅ | `uf` é `StateAbbreviation`; valida via `State.parse` |

## Análise pontual

- **Transform build-time** (`generate-municipalities.ts`) separado do runtime — o boot não parseia 2 MB; carrega o array gerado e monta `Map` uma vez.
- **`municipalities.data.ts` gerado e marcado** ("não editar à mão" + comando de regeneração) — rastreável à fonte IBGE. Normalizado com `pnpm exec prettier`.
- **Integridade**: o teste cross-check prova que as 5571 entradas referenciam só UFs válidas e cobrem as 27 — o catálogo de municípios e o de estados estão consistentes.
- **`listMunicipalitiesByUf`** propaga `StateError` quando a UF é inexistente (não retorna lista vazia silenciosa) — distinção correta entre "UF inválida" e "UF sem municípios".
- **`findMunicipalityByCod`** usa o código cru no `Map` (não exige `parse` antes) — `get` em chave inexistente → `err`. Simples e O(1).

## Issues

Nenhuma. A fonte bruta (`.tmp/ibge-municipios.json`) é gitignored; os scripts de tooling e o data file gerado são commitáveis. Liberado para W3.
