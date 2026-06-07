# W2 — Code Review · AUTH-HTTP-PHOTO

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- Rotas isoladas; preHandler `[requireAuth, authorize('user:update')]` + rate-limit de escrita. ✅
- Parser binário no escopo do plugin (não afeta rotas JSON); bodyLimit 6 MiB > limite de negócio (5 MiB)
  → excesso vira 422 (regra), acima de 6 MiB → 413 (proteção). ✅
- **Magic bytes** (defesa em profundidade) contra content-type spoofing; MIME fora da allowlist delegado
  ao use case (422). ✅
- `setProfilePhoto`/`removeProfilePhoto` consumidos sem reinstanciar; resposta 200 = detalhe (shape única). ✅
- Adapter S3 próprio do auth (ADR-0006); fallback in-memory seguro quando `S3_*` ausente. ✅
- Wiring completo (composition/server/6 testes irmãos). ✅

## Observações

- Foto via Bruno + integração MinIO real ficam no T044 (opt-in) — borda já coberta por inject.
- `S3_*` em prod deve apontar para bucket dedicado de fotos (ADR-0019).

Sem issues bloqueantes.
