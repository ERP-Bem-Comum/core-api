# W2 — code review (self, read-only) — FIN-DRAFT-PARTIAL-SCHEMA (#534)

**Veredito: APPROVED.**

- Schema: os 5 campos viram `.optional()`; `superRefine` os reexige **só** quando `asDraft:false`, com
  `path:[field]` — o 400 do fluxo Open é preservado com a mesma granularidade (CA3).
- `createDocumentBodySchema` só é consumido como body schema (plugin.ts:366) — nenhum uso estrutural
  (`.shape/.extend/.partial`), então virar `ZodEffects` (superRefine) não quebra nada. Verificado por grep.
- Handler draft path: os 5 mapeados null-safe; `grossValueCents` condicional evita `Number(undefined)=NaN`.
  `SaveDraftCommand` já declara os 5 `?: T | null` (save-draft.ts:35) — compatível.
- Handler Open path: guard `document-incomplete` estreita os opcionais **sem** non-null assertion —
  idiomático (espelha o guard de `dueDate` pré-existente). Redundante com o superRefine por design (o 400 já
  saiu na validação), mas necessário para o TS narrowar.
- Sem regressão do Open completo (CA4 — suíte existente verde).

Sem Blocker/Major/Minor. 1 round.
