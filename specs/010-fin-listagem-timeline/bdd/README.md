# BDD — Financeiro Fatia 2 (010): Listagem + Trilha por-campo

Cenários Gherkin (PT-BR, `# language: pt`) derivados de `spec.md` (US1/US2 + edge cases), `domain.md` e `metrics.md`.
**Não são testes `.ts`** — viram `it()` no W0 (Fase 7). Skill: `tdd-strategist`. Numeração CT escopada à feature 010.

> Kent Beck: testes primeiro descrevem o comportamento desejado antes da implementação (TDD) — ver
> `acdg/skills_base/shared-references/tdd/tdd--kent-beck.md` (fallback local; MCP off).

## Arquivos

| Feature                       | CTs         | Cobre                                                                                                                             |
| ----------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `listagem-documentos.feature` | CT-001..008 | US1 — filtros (status/fornecedor/janela), paginação, vazio, janela invertida, ref inválida, 403                                   |
| `trilha-por-campo.feature`    | CT-009..017 | US2 — registro automático (criação/ajuste/aprovação/undo), atomicidade (mesma tx), cronologia, 404, 403, boundary no cancelamento |
| `optimistic-lock.feature`     | CT-018..021 | FR-009 — conflito de versão (409) em ajuste/aprovação/undo; aprovação concorrente dupla                                           |

## Mapa CT → requisito

| CT          | US/FR/SC                  | Tipo de teste no W0                                       |
| ----------- | ------------------------- | --------------------------------------------------------- |
| CT-001..004 | US1 / FR-001..003         | borda (`fastify.inject`) + integração (filtros/paginação) |
| CT-005..007 | edge cases / FR-002       | borda (vazio, janela invertida, 400)                      |
| CT-008      | FR-008 / NFR-005          | borda (autorização 403)                                   |
| CT-009..012 | US2 / FR-005,006          | application + integração (registro na mesma tx)           |
| CT-013      | NFR-001 / SC-004          | integração (rollback — sem órfã)                          |
| CT-014      | US2 / FR-007              | borda (cronologia + changes)                              |
| CT-015,016  | FR-007,008                | borda (404, 403)                                          |
| CT-017      | SC-006                    | integração (cascade no hard delete)                       |
| CT-018..021 | FR-009 / MF-007 / NFR-004 | integração concorrente + borda (409)                      |

## Permissões inertes (sem `.feature`)

A remoção de `payable:read`/`payable:undo-approval` (FR-010 / ADR-0004) é verificada por **teste do catálogo RBAC do
auth** (não cenário de borda) — entra no W0 como teste de unidade do `permission-catalog`.
