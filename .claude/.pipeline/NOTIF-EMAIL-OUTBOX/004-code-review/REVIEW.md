# W2 — Code Review (read-only) · NOTIF-EMAIL-OUTBOX

> Skill: `code-reviewer` · Outcome: **APPROVED** (round 1/3)

## Conformidade verificada

- Domínio/adapters sem `class`/`throw`/`this`; `Result` nas bordas.
- Imports: `import type` + extensão `.ts` + subpath `#src/*` (verbatimModuleSyntax / NodeNext).
- ADR-0006 (cross-módulo só via `public-api/`; ports = `type`).
- ADR-0014 (tabela `notifications_*` isolada por prefixo).
- ADR-0015 (outbox pattern; reuso do worker genérico).
- ADR-0020 (UUID `varchar(36)`; sem JSON nativo → `payload` text JSON-da-app; sem ENUM nativo →
  `status` validado no mapper retornando `Result`; mapper row→domínio com `Result`).
- Migration idempotente (`drizzle-kit generate` subsequente: `No schema changes`).

## Decisão sinalizada — atomicidade do piloto

O enqueue do reset é **best-effort pós-save** (mesma garantia do envio síncrono anterior),
**adicionando** retry assíncrono via worker. Atomicidade total (enqueue na MESMA transação do
reset-token) exigiria unit-of-work, mas token (`auth`) e outbox (`notifications`) vivem em
módulos/pools distintos por ADR-0014 → design maior, **deferido** (já fora de escopo, request §5).

**Veredito:** aceitável para esta fatia. APPROVED.
