# FIN-COUNTERPART-UNDO — escopo (US3 · spec 029 · #269)

> Frente 1 do #404. Módulo **`financial`**. Size **M**. 3º e último ticket. **Depende de** US1 + US2.

## Contexto
Desfazer a conciliação de origem (a perna A) precisa **tratar a contrapartida** esperada em B, mantendo a coerência das duas pernas.

## Escopo (in)
- Domínio: `discard` (contrapartida `Pending` → `Discarded`, emite `TransferCounterpartDiscarded`) e reabertura (contrapartida `Matched` → volta a `Pending` quando a perna casada é desfeita).
- Application: integrar no `undo` da conciliação de origem — se a contrapartida está `Pending`, descartar; se `Matched`, reabrir (destrava novo match).

## Fora de escopo
- US1 (create) e US2 (match).

## Critérios de aceite
- **CA1** Desfazer origem com contrapartida `Pending` → contrapartida `Discarded`; nada órfão em B.
- **CA2** Desfazer origem com contrapartida `Matched` → contrapartida volta a `Pending` e o vínculo A↔B é desfeito (a perna B pode ser re-conciliada).
- **CA3** Evento `TransferCounterpartDiscarded` (ou reabertura) publicado no outbox após o save.

## Pipeline
| Wave | Skill | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | domínio discard/reopen + application undo |
| W1 | `ts-domain-modeler` | discard/reopen + integração no undo |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração x99 |

## DoD
Gate W3 verde. Undo trata a contrapartida (descarta/reabre). **Fecha a feature 029 → fecha #269.**
