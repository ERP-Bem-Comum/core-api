# W2 — Code Review de Segurança · PAR-COLLABORATOR-SELF-REGISTRATION (US5)

**Agente:** web-security-backend (security-backend-expert) · **Outcome:** APPROVED (round 2) · 2 rounds.

## Round 1 — REJECTED (0 Blockers, 2 Majors, 3 Minors)

Auditoria OWASP (Forgot Password + Email Validation cheat sheets) sobre toda a fatia US5.

### Controles corretos reconhecidos (não alterar)
CSPRNG 256 bits (`randomBytes(32)`); hash-only na persistência; **404 uniforme** anti-enumeração (desconhecido==expirado, view e complete); CPF validado **antes** de queimar o token (CA5); anti Host-Header-Injection (`autocadastroBaseUrl` de config); escape HTML do `recipientName`; `markUsed` atômico (`UPDATE ... WHERE used_at IS NULL`); Drizzle parametrizado; `*.token` no redact do Pino (objetos).

### Achados
| ID | Sev | Local | Risco |
|----|-----|-------|-------|
| M1 | Major | `complete-...-via-invite.ts` | TOCTOU: ordem `completeRegistration→save→markUsed` permite double-complete sob concorrência |
| M2 | Major | `plugin.ts` rotas autocadastro | Rotas públicas sem rate-limit dedicado (brute-force token/cpfPrefix, spam de convite) |
| m1 | Minor | `app.ts` logs | Token em `?token=` pode ser logado em `LOG_LEVEL=info` (prod usa `warn` → mitigado) |
| m2 | Minor | `schemas.ts` | `cpfPrefix` sem `max` (input ilimitado) |
| m3 | Minor | `plugin.ts` GET | Rota GET sem `response` schema (campos extras poderiam serializar) |

## Round 2 — Correções aplicadas + APPROVED

| ID | Disposição | Correção |
|----|-----------|----------|
| **M1** | ✅ RESOLVIDO | Reordenado para `completeRegistration (puro) → markUsed (claim atômico) → save`. Claim antes do persist fecha a janela de double-complete; input inválido (CPF/enum) ainda **não** queima o token (validação pura antes); pior caso (save falha pós-claim) é recuperável via reemissão. **Melhora sobre a sugestão original** (que punha markUsed antes do `completeRegistration`, queimando em input inválido). |
| **M2** | ✅ RESOLVIDO | `AUTOCADASTRO_RATE_LIMIT = { max: 10, timeWindow: '1 minute' }` via `config: { rateLimit }` por rota (GET+POST), sobre o `@fastify/rate-limit` global. Limite alinhado ao `sensitiveRateLimit` do auth. |
| **m2** | ✅ RESOLVIDO | `cpfPrefix: z.string().min(1).max(14)`. |
| **m3** | ✅ RESOLVIDO | `autocadastroPreviewSchema` (collaboratorId/name/cpfMasked) + `response: { 200: ... }` na GET — strip implícito do `fastify-zod-openapi`. |
| **m1** | ⏭️ DIFERIDO (issue) | Toca `app.ts` (infra compartilhada, fora do escopo partners) → GitHub Issue (ADR-0040). **Ressalva do auditor a registrar no issue:** o redact atual `*.token` NÃO cobre `req.query.token` — o fix precisa adicionar esse path explícito. Mitigado por `LOG_LEVEL=warn` default. |

**Verificação round-2:** nenhuma regressão/novo risco; respeita ADR-0020 (UPDATE atômico sem UPSERT), ADR-0027 (Zod na borda), ADR-0006 (domínio puro antes da mutação). Gates verdes (typecheck/format/lint/test 2712 pass 0 fail; 6/6 CAs).

## Pendência rastreada
- **Issue m1**: redact de `req.query.token` em `src/shared/http/app.ts` (documentar que `*.token` não cobre o path da query).
