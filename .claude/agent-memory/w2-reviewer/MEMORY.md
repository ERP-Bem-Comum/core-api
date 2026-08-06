# Memória — w2-reviewer (core-api)

## Heurísticas de revisão

- [Comentário que argumenta contra o próprio risco](review-heuristic-comment-that-argues-away-hazard.md) — onde o diff nomeia um perigo e o descarta, construir input adversarial; contador de reincidência não é prior (ciclo 3: o achado foi corrigido).
- [Provar regressão replicando HEAD no scratchpad](review-method-replicate-head-logic-in-scratch.md) — comparar as duas versões sem tocar o working tree; mecânica de node/fnm e ruído dos `.local.test.ts`.
- [Regex alargada: variar o texto VIZINHO](review-method-vary-neighbor-text-in-regex-widening.md) — mais os 2 mecanismos de divergência e o critério de PARADA (lote de vizinhos plausíveis).

## Guardas contra falso positivo

- [taxId do reader fiscal: o que já é errado em HEAD](falsos-positivos-native-pdf-taxid-preexistente.md) — 3 saídas silenciosamente erradas que não são do diff; verificar antes de reportar.
