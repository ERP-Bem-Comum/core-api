# W0 — Testes RED · PAR-COLLABORATOR-HISTORY-EXPORT (US4 da feature 015)

**Agente:** tdd-strategist · **Outcome esperado:** RED

## Decisão de modelagem (consultas: mysql-database-expert + acdg-skills) — **Abordagem A (diff por campo)**, decidida pelo PO.

Audit trail como **log de atualizações** (uma linha por campo alterado), não snapshot.

### Citação canônica (Princípio IX — `acdg/skills_base/shared-references/database/sgbd--ramakrishnan-gehrke.md:15321,4943`)
> "O administrador de banco de dados também é responsável por manter o **rastreamento de auditoria**, que é basicamente **o log de atualizações** com o ID de autorização [...] adicionado a cada entrada do log."
> "[...] podemos criar um registro [...] e inserir esse registro em uma **tabela de histórico**."
> — Ramakrishnan & Gehrke, *Database Management Systems*. (+ Vernon, *Implementing DDD* cap. 8 — Domain Events como origem do histórico.)

## Modelagem `par_collaborator_history` (recomendação do especialista)
`id` varchar(36) PK · `collaborator_id` varchar(36) FK→par_collaborators (ON DELETE RESTRICT) · `event_type` varchar(64) · `field_name` varchar(100, EN) · `field_label` varchar(100, PT desnormalizado) · `value_before`/`value_after` varchar(1000) nullable · `occurred_at` datetime(3) · índice `(collaborator_id, occurred_at)` · UNIQUE `(collaborator_id, occurred_at, field_name)` (idempotência).

## Decisões (PO + defaults documentados)
- **Campos rastreados (item 2):** Nome, E-mail, CPF, **Cargo** (role), Área de Atuação, Início do Contrato, Vínculo + Situação (ativar/desativar) + Motivo. completeRegistration inicial e cadastro **não** geram histórico.
- **changed_by (item 3):** OMITIDO (sem RBAC — ADR-0022).
- **Serialização CSV (item 4):** texto direto; null→vazio; data dd/MM/aaaa; boolean Sim/Não. **A validar com o importador legado** (não bloqueia o CA1).
- **Captura:** consistência forte (mesma transação do save) — intra-módulo, não outbox.
- **Domínio EN-puro:** o diff produz `fieldName` (EN) + valores string; o `field_label` PT é resolvido no adapter (mapa) e gravado desnormalizado.

## Testes RED
| Teste | Falha esperada |
|-------|----------------|
| `tests/.../domain/collaborator/collaborator-history.test.ts` | `diffCollaborator` inexistente |
| `tests/.../adapters/export/collaborator-history-csv.test.ts` | export CSV legado inexistente |
| `tests/.../adapters/http/collaborators-history.routes.test.ts` | rota `export?type=history` + 503 inexistentes |

## CAs (US4)
CA1 (mudança de Cargo gera linha tipo_alteracao=Cargo/antes/depois/data) · CA2 (export?type=history → CSV legado) · CA3 (repo indisponível → 503 `collaborator-repo-unavailable`) · CA4 (cadastro inicial não gera entry).
