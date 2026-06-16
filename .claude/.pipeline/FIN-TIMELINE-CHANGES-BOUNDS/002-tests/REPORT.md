# W0 — Testes RED (FIN-TIMELINE-CHANGES-BOUNDS)

**Agente/disciplina**: tdd-strategist · **Resultado**: 🔴 RED confirmado.

## Arquivo

`tests/modules/financial/adapters/http/timeline-schema-bounds.test.ts` — meta-teste de schema (`safeParse` de entry completa via `timelineEntrySchema`, sem subir servidor). Abordagem robusta: exercita o comportamento real do schema (o `serializerCompiler` faz `safeParse` na serialização), não navega internals frágeis do Zod 4.

## Execução

```
node --experimental-strip-types --test tests/modules/financial/adapters/http/timeline-schema-bounds.test.ts
ℹ tests 6
ℹ pass 3
ℹ fail 3
```

## Mapa de casos

| Caso | Hoje | Por quê |
|------|:----:|---------|
| entrada válida (sanity) | ✅ pass | guard — não deve quebrar |
| field 60 chars aceito | ✅ pass | guard CA4 — não rejeita válido |
| **field 61 chars rejeitado** | 🔴 fail | sem `.max(60)` → passa indevidamente |
| before 65535 chars aceito | ✅ pass | guard CA4 |
| **before 65536 chars rejeitado** | 🔴 fail | sem `.max(65535)` |
| **after 65536 chars rejeitado** | 🔴 fail | sem `.max(65535)` |

Os 3 RED falham por inexistência da regra (`.max`) — fail-first correto. Viram GREEN com a edição de `schemas.ts:248-250` no W1.
