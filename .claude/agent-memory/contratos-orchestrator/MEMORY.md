# Memory Index

## Projeto

- [Outbox Worker ticket #5 completed](project_outbox_worker_completed.md) — CTR-OUTBOX-WORKER CLOSED 2026-05-21; lição: markProcessedSync vs markProcessed (sync/async split)
- [partners memory: reader e writer são stores separados](project_partners_inmemory_reader_writer_split.md) — no driver `memory`, POST não aparece no GET detail/list

## Heurísticas de revisão

Herdadas do `w2-reviewer`, agente aposentado junto com o pipeline W0→W3. As heurísticas
sobreviveram ao processo que as gerou — quem roteia para a skill `code-reviewer` é quem precisa
saber COMO se revisa neste repositório.

- [Comentário que argumenta contra o próprio risco](review-heuristic-comment-that-argues-away-hazard.md) — onde o diff nomeia um perigo e o descarta, construir input adversarial; contador de reincidência não é prior
- [Provar regressão replicando HEAD no scratchpad](review-method-replicate-head-logic-in-scratch.md) — comparar as duas versões sem tocar o working tree; mecânica de node/fnm e ruído dos `.local.test.ts`
- [Regex alargada: variar o texto VIZINHO](review-method-vary-neighbor-text-in-regex-widening.md) — os 2 mecanismos de divergência e o critério de PARADA (lote de vizinhos plausíveis)

## Guardas contra falso positivo

- [taxId do reader fiscal: o que já é errado em HEAD](falsos-positivos-native-pdf-taxid-preexistente.md) — 3 saídas silenciosamente erradas que não são do diff; verificar antes de reportar
