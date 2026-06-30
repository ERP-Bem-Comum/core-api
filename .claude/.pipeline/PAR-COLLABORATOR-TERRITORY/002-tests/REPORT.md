# W0 — Testes RED · PAR-COLLABORATOR-TERRITORY (US3 da feature 015)

**Agente:** tdd-strategist · **Outcome esperado:** RED

## Escopo
`territory { uf, municipality }` (nullable) no Colaborador. UF validada contra o catálogo `domain/geography/state.ts` (27 UFs). `municipality` texto livre. Aceito no create, devolvido no detalhe, preservado em deactivate.

## Citação canônica (Princípio IX — `acdg/skills_base/shared-references/ddd/ddd--evans-livro-azul.md:1141,1144`)

> "VALUE OBJECTS can even reference ENTITIES. For example, if I ask an online map service for a scenic driving route from San Francisco to Los Angeles, it might derive a Route object linking L.A. and San Francisco via the Pacific Coast Highway. That Route object would be a VALUE, even though the three objects it references (two cities and a highway) are all ENTITIES.
> [...] When you care only about the attributes of an element of the model, classify it as a VALUE OBJECT. [...] Treat the VALUE OBJECT as immutable."
> — Evans, *Domain-Driven Design* (livro azul), §Value Objects.

**Aplicação:** `Territory` é um VO imutável que **referencia** o catálogo geográfico (UF) — a UF só é válida se pertencer ao conjunto IBGE (`State.parse`); município é texto livre.

## Testes RED
| Teste | Falha esperada |
|-------|----------------|
| `tests/modules/partners/domain/collaborator/territory.test.ts` | VO `territory.ts` inexistente |
| `tests/modules/partners/adapters/http/collaborators-territory.routes.test.ts` | borda não aceita/retorna `territory`; deactivate não preserva |

## CAs (US3)
CA1 (POST com territory → 201 + detalhe retorna) · CA2 (POST sem → 201, territory null) · CA3 (uf inválida → 422 `territory-uf-invalid`) · CA4 (território preservado em deactivate).
