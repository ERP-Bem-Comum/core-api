# W0 — Testes RED · FIN-STRICT-RESPONSE-SCHEMAS (#384)

**Skill:** `tdd-strategist` (via `fastify-server-expert`) · **Outcome:** RED

## Arquivo
`tests/modules/financial/adapters/http/strict-response-schemas.test.ts` — **50 casos**. Padrão do repo
(`safeParse` direto sobre o schema exportado, sem subir Fastify — modelo `timeline-schema-bounds.test.ts`).

Por schema sensível: (a) fixture **válido** → `success === true` (regressão — resposta legítima não quebra);
(b) fixture + **campo extra** → `success === false` (o `.strict()`); (c) **aninhados** → campo extra no
nível interno (`payeeBank.bankAccount`, item de array) rejeitado.

## Evidência RED
Sem `.strict()`, o `strip` default do Zod **descarta** o campo extra → `success === true` → os casos
"extra → `!success`" **falham**. Só passam após o `.strict()` de cada nível.
