# W2 — Code Review (FIN-HTTP-ERROR-PUBLIC-CODE)

**Revisor**: agente `security-backend-expert` (active audit, read-only) · **Veredito**: ✅ **APPROVED** · **Round**: 1

## Resultado

| Critério (API8) | Status |
|-----------------|--------|
| Não-vazamento 4xx completo (todo caminho passa por `sendDomainError` → `toPublicCode`/`toPublicMessage`) | PASS |
| 5xx preservado (`internal`) | PASS |
| Cobertura do inventário de slugs | PASS |
| Escopo/ADR-0014 (`shared/http/reply.ts` intocado; DELETE migrado; 204 no sucesso) | PASS |
| Idioma (slug EN no log, message PT-BR ao humano) | PASS |
| Blockers / Majors | 0 / 0 |

## Citação canônica (constituição §IX) — OWASP API8:2023 Security Misconfiguration

> "Error messages that leak internal implementation details (e.g. stack traces, internal error messages) enable attackers to understand the inner workings of the API and find additional attack vectors. [...] Returns detailed error messages that expose internal information (e.g., stack traces, error messages, component names, sensitive data). [...] Ensure error messages are generic, and do not expose internal information."

Complementar — **OWASP ASVS v4.0.3, V7.4.1 (Error Handling)**:

> "Verify that a generic message is shown when an unexpected or security sensitive error occurs, potentially with a unique ID which support personnel can use to investigate."

O envelope mantém `requestId` para rastrear o slug interno via log sem expô-lo — atende exatamente o requisito.

## Minors (3) — todos aplicados

- **F1**: slug morto `cancel-not-allowed` (nunca emitido — `cancel()` retorna só `ok`, use case usa `invalid-state-transition`) → **removido** de `CONFLICT_CODES`/`SLUG_MESSAGES`.
- **F2**: `timeline-repository-failure` caía em 422 (falha de infra) → **movido** para `UNAVAILABLE_CODES` (503/`internal`).
- **F3**: `user-ref-invalid` caía em 422 → **movido** para `BAD_REQUEST_CODES` (400/`bad-request`).

Casos F2/F3 cobertos no teste unit. Suíte do ticket: **34/34 GREEN**. Segue para W3.
