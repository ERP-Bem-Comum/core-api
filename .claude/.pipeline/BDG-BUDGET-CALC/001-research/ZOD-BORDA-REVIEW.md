# Revisão zod-expert — schemas de borda dos budget-results (ADR-0027)

Par obrigatório fastify↔zod. Review read-only do `zod-expert` sobre os 4 body schemas + response
em `adapters/http/schemas.ts`. Veredito inicial: CHANGES-REQUESTED (2 Blocker, 2 Major, 3 Minor).

## Aplicado
- **Blocker (overflow):** o comentário afirmava falsamente que os bounds por-campo vedam overflow.
  Pior caso real (logística, 4 fatores) chega a ~1e30 >> MAX_SAFE_INTEGER (9e15). Corrigido: comentário
  honesto; bounds apertados para sanidade de negócio (`MAX_CENTS`=R$100mi, `MAX_COUNT`=1e5, `MAX_PERCENT`=1e3);
  o overflow real é barrado no domínio (`Money.fromCents` → `money-exceeds-safe-integer`), a mapear a **422**
  no plugin. **Decisão:** preterido o `.refine(calculate)` (400-cedo) por risco de `ZodEffects` × `fastify-zod-openapi`
  + YAGNI (domínio já dá 4xx tratado, não 500). Reavaliar ao escrever as rotas com `fastify-server-expert`.
- **Major (ipca negativo):** IPCA tem deflação (histórico IBGE). `ipca` agora usa `ipcaField` (`.min(-100)`),
  não o `percentField` genérico. O domínio barra só se o resultado final < 0.
- **Major (.meta):** adicionadas descrições OpenAPI nos campos de regra não-óbvia — sobretudo logística
  ("passagem NÃO multiplica por diária") e os percentuais da folha.

## Confirmado pelo review (sem ação)
- Paridade de campos 1:1 com `CalcModelInput` (4 modelos); nenhum campo a mais/menos.
- `valueInCents` no response consistente com `budgetDetailItemSchema.valueInCents` (valor unitário, não soma).
- `justification`/chaves extras: já descartadas (z.object default = strip) — agora documentado.

## Minor deixado (sistêmico, não desta fatia)
- `z.uuid()` sem `{ version: 'v4' }` — padrão de todo o arquivo; o domínio (`isUuidV4`) barra no rehydrate.
  Correção sistêmica futura (fora do escopo).
