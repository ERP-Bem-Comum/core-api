# W2 — Code Review (audit read-only) · FIN-STRICT-RESPONSE-SCHEMAS (#384)

**Agente:** `zod-expert` · **Rounds:** 2 · **Veredito final:** **APPROVED**

## Round 1 — CHANGES-REQUESTED (reverificado empiricamente, não só o diff)
Confirmado: 27 `.strict()` cobrem 13 dos 14 sensíveis + aninhados; **nenhum trivial tocado** (16 schemas
triviais checados um a um); suíte HTTP **289/289** (prova empírica que nenhuma resposta real quebrou — se
um handler emitisse campo extra, o `serializerCompiler` teria dado `FST_ERR_RESPONSE_SERIALIZATION`);
fixtures fiéis aos shapes reais; casos aninhados exercitam o nível interno certo.
- **Major:** `timelineEntrySchema.changes[]` (item `{field,before,after}`) ficou **sem** `.strict()` — o
  `target` recebeu, o `changes[]` não. Campo extra descartado (strip) em vez de rejeitado. Lacuna de escopo
  (item #13 previa 2 níveis). Baixo risco (não regressão), fix mecânico.
- **Minor (informativo, não bloqueia):** `accountStatementResponseSchema.counters` sem `.strict()` —
  razoável (só contadores inteiros agregados, sem PII/money/identificador).

## Round 2 — APPROVED
- **Major corrigido:** `.strict()` no item de `changes[]` (28º `.strict()`) + caso de teste "campo extra em
  `changes[0]` rejeitado". Teste de contrato: **51/51**.
- **Minor (counters):** mantido sem `.strict()` por curadoria (recomendação do próprio revisor).
- Gate: `typecheck` + `format:check` + `lint` limpos; suíte HTTP do financial **289/289**.
