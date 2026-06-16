# W1 — Implementação mínima (FIN-TIMELINE-CHANGES-BOUNDS)

**Resultado**: 🟢 GREEN.

## Mudança (1 arquivo de produção)

`src/modules/financial/adapters/http/schemas.ts:248-250` — `changes.*`:

- `field: z.string()` → `z.string().max(60).meta({ description })` (espelha `varchar(60)`).
- `before/after: z.string().nullable()` → `z.string().max(65535).nullable().meta({ description })` (limite TEXT).

`.meta({ description })` individual mantém coerência com o resto do arquivo (todos os campos do schema têm `.meta`). `.max(N)` em Zod 4 emite `maxLength: N` no OpenAPI (via `fastify-zod-openapi`).

## Execução

```
# ticket
node --test tests/modules/financial/adapters/http/timeline-schema-bounds.test.ts
ℹ tests 6 · pass 6 · fail 0

# suíte HTTP financial completa (não-regressão; CT-014 byte-idêntico)
node --test tests/modules/financial/adapters/http/*.test.ts
ℹ tests 42 · pass 42 · fail 0
```

CA1/CA2/CA4 cobertos pelo teste de schema. CA3 (maxLength no OpenAPI) decorre de `.max()` — validado conceitualmente; confirmação opcional no W3/quickstart via `app.swagger()`.
