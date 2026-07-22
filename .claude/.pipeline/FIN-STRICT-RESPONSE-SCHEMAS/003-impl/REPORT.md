# W1 — Implementação GREEN · FIN-STRICT-RESPONSE-SCHEMAS (#384)

**Agente:** `fastify-server-expert` (pareado com o REVIEW do `zod-expert`) · **Outcome:** GREEN

## Mudança
**27 `.strict()`** aplicados em `schemas.ts`: os **14 schemas sensíveis** + seus **aninhados** (Zod 4:
`.strict()` é raso → cada nível de objeto/item de array recebe o seu; `.extend()` preserva o modo, então a
base do `cedenteAccount*` cobre o extend). Triviais (catálogos estáticos, `{ok}`, contadores) ficam de fora.

## Evidência
- Teste de contrato: **50/50** (fixtures válidos + campo-extra + aninhados).
- Suíte HTTP do financial: **289/289** — nenhuma resposta legítima quebrou (DTO mappers são explícitos).
- `typecheck` limpo; `format:check` + `lint` verdes.
