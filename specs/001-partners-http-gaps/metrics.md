# Métricas & NFRs: Gaps de borda HTTP do módulo `partners`

**Feature**: `specs/001-partners-http-gaps/` · **Consultores**: `/acdg-skills:software-architect` + `/acdg-skills:requirements-engineer`

> Fase 4 da pipeline `core-api-sdd` (máximo rigor). NFRs ancorados com **citação canônica** via
> `skills_citar` — princípio IX. Toda métrica é mensurável. Diferente da Fase 1 padrão, aqui a **borda HTTP
> está ativa** (ADR-0025/0033), logo as métricas medem na **rota** (não só na CLI).

## Métricas funcionais

> "O sistema faz a coisa certa" — verificáveis por teste/BDD.

| ID     | Métrica                                                           | Alvo                                                                       | Como medir                                           |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| MF-001 | Import parcial: linhas válidas entram, inválidas viram `failed`   | 100% — nenhuma válida perdida por causa de inválida                        | teste do use-case + teste da rota (`fastify.inject`) |
| MF-002 | Toggle territorial idempotente                                    | marcar já-ativa = no-op; desmarcar já-inativa = no-op (sem erro/duplicata) | teste de repo (in-memory + drizzle)                  |
| MF-003 | Soft-delete coerente                                              | `active=false ⟺ deactivated_at preenchido` (CHECK)                         | teste de integração (constraint MySQL)               |
| MF-004 | Catálogo retorna as 39 categorias canônicas (com typos legados)   | exatamente 39, literais                                                    | teste da rota + snapshot do conjunto                 |
| MF-005 | Export respeita filtros                                           | CSV contém só os fornecedores que casam `search/active/categories[]`       | teste da rota                                        |
| MF-006 | Contrato HTTP casa com o BFF (`008-partners/contracts/README.md`) | input/output 1:1                                                           | teste de contrato (schema Zod ↔ server fn)           |

## Métricas não-funcionais (NFRs)

> "O sistema faz certo" — performance, segurança, auditoria, manutenibilidade.

| ID      | Categoria        | Alvo mensurável                                                           | Como medir                            |
| ------- | ---------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| NFR-001 | Segurança (RBAC) | 100% das rotas novas rejeitam 401 (sem sessão) e 403 (sem permissão)      | teste de rota negativo                |
| NFR-002 | Observabilidade  | toda resposta de erro carrega `requestId` (correlation id) no envelope    | teste de rota + inspeção de log       |
| NFR-003 | Segurança (CSV)  | export/import passam pelo escape anti-CSV-injection do util compartilhado | teste do util (`shared/utils/csv.ts`) |
| NFR-004 | Isolamento       | tabelas `par_*`; nenhuma FK/JOIN cross-BC (ADR-0014)                      | review de schema + lint de boundaries |
| NFR-005 | Manutenibilidade | parsing/serialização CSV num único lugar (sem duplicar escape)            | review (ADR-0002)                     |

**Citação que sustenta os NFRs** (observabilidade — correlation id atravessando chamadas, base do `requestId`
no envelope de erro):

> Correlating log lines
> With a large number of services interacting to provide any given end-user capability, a single initiating call can end up generating multiple downstream service calls... when the button is clicked in the UI, it hits the Gateway that sits on the perimeter of our system. This in turn passes the call on to the Streaming microservice. This microservice communicates with Payment... and sends an email to the customer using our Email microservice confirming they are now subscribed.
> — *(Linha 5100, p. 394, Sam Newman, *Building Microservices*)*

O `requestId` (correlation id) no envelope `{ error: { code, message, requestId } }` é exatamente o
mecanismo que Newman descreve para correlacionar a chamada do BFF com o log do core-api — NFR-002 verifica
que toda rota nova o propaga (padrão já existente em `supplier-plugin.ts` via `currentCorrelationId()`).

## Métricas de performance

| ID     | Indicador                                                           | Baseline   | Alvo    | Orçamento |
| ------ | ------------------------------------------------------------------- | ---------- | ------- | --------- |
| MP-001 | latência p95 `GET /suppliers/service-categories` (conjunto fechado) | N/A (novo) | < 50ms  | 100ms     |
| MP-002 | latência p95 `GET /partner-states` (≤27 linhas)                     | N/A        | < 100ms | 200ms     |
| MP-003 | import de ≤50 linhas (relatório completo)                           | N/A        | < 2s    | 3s        |
| MP-004 | export de fornecedores (volume de teste)                            | N/A        | < 1s    | 2s        |

## Critérios de sucesso (mensuráveis, tech-agnostic)

- **SC-001**: 100% dos 5 gaps do `api-readiness-report` têm endpoint (ou decisão formal — FR-006).
- **SC-002**: o front troca mock→real sem alterar `client/ui` nem `*.view-model.ts` (contrato 1:1 — MF-006).
- **SC-003**: import de teste retorna relatório correto de válidas/inválidas em < 2s (MP-003).
- **SC-004**: toda rota nova rejeita 401/403 com `requestId` no envelope (NFR-001 + NFR-002).

## Observabilidade

- Erros de borda logados server-side com `requestId` (correlation id já existente — `currentCorrelationId()`).
- Import: logar `{ importedCount, failedCount, isPartialImport }` por requisição (sem dados pessoais no log).
- Toggle territorial: logar transição (`uf`/`ibgeCode` + active anterior→novo) para auditoria do soft-delete.
- Contadores opcionais por rota (futuro; alinhar com OpenTelemetry se/quando adotado no core-api).
