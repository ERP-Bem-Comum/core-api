# W2 — Code Review (read-only) · NOTIF-EMAIL-DEPLOY-CONFIG

> Skill: `code-reviewer` · Outcome: **APPROVED** (round 1/3)

- 1 achado de lint (`promise-function-async` no decorator `withSandboxRedirect`) — corrigido ainda em W1.
- Invariantes OK: sem `class`/`throw`/`this` no domínio; `Result` nas bordas; `import type` + `.ts` +
  `#src/*`; switch exaustivo; cross-módulo só via `public-api` (ADR-0006).
- ADR-0010 respeitado — apenas ampliação das envs (provider/remetente/sandbox), sem contradição; sem novo ADR.
- Config inválida → boot falha (throw no adapter, na composition root — não vaza ao domínio).

Veredito: APPROVED.
