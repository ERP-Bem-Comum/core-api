# FIN-COUNTERPART-MATCH — escopo (US2 · spec 029 · #269)

> Frente 1 do #404. Módulo **`financial`**. Size **M**. 2º ticket. **Depende de** `FIN-COUNTERPART-CREATE` (agregado + contrapartida criada).

## Contexto
Ao importar o extrato da conta de destino B, o motor de sugestão passa a casar **transação real × contrapartida esperada** (reusando `match-score`). Confirmar **consome** a contrapartida (dedup — sem duplicar transação) e **vincula** as duas pernas A↔B.

## Escopo (in)
- Domínio: `match` no agregado (exige `Pending`; grava `matchedTransactionRef`; emite `TransferCounterpartMatched`).
- Application: `suggest-matches` estende p/ sugerir transação×contrapartida (valor exato + janela ~5d; empate → mais antiga não consumida); `confirm` consome a contrapartida + cria o vínculo A↔B.

## Fora de escopo
- US1 (create) e US3 (undo).

## Critérios de aceite
- **CA1** Com contrapartida `Pending` em B, importar extrato com crédito real → sugestão `kind=counterpart`.
- **CA2** Confirmar → duas pernas conciliadas e vinculadas, **0 duplicata**, contrapartida `Matched`.
- **CA3** `match` num agregado não-`Pending` → erro `counterpart-not-pending`.
- **CA4** Empate de sugestão → escolhe a contrapartida mais antiga ainda não consumida.

## Pipeline
| Wave | Skill | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | T018 domínio `match` + T019 suggest + T020 confirm |
| W1 | `ts-domain-modeler` + `fastify-server-expert`↔`zod-expert` | `match` + suggest/confirm + borda |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração x99 |

## DoD
Gate W3 verde. Sugestão + confirmação com dedup e vínculo A↔B. Não fecha #269 (é US2/3).
