# W2 — REVIEW · FIN-RECON-PERIOD-REOPEN (#203) — Round 1

**Skill:** code-reviewer (read-only) · **Veredito: APPROVED**

## Checklist
- [x] **Domínio puro** (`period.ts`): sem `throw`/`class`/`this`/`any`/`interface`; `reopenPeriod` retorna `Result`; estado por cópia imutável (`{ ...current, status:'Open', closedAt:null, closedBy:null }`); evento `Readonly`. `PeriodError` é string-literal union.
- [x] **Guard correto**: `current.status !== 'Closed'` → `err('period-not-closed')` antes de qualquer transição (clareza > no-op silencioso, conforme decisão do request).
- [x] **Application sequência canônica** (`reopen-reconciliation-period.ts`): validar (rehydrate id) → fetch (findById) → not-found → domínio (reopenPeriod) → persist (periodStore.reopen). Sem regra de negócio na application; sem import de `adapters/`.
- [x] **Erro do use case** `reconciliation-period-not-found` mapeado a 404 (já em NOT_FOUND_CODES); `reconciliation-period-id-invalid` (rehydrate) → 400 (já em BAD_REQUEST); `period-not-closed` → 409 (CONFLICT, espelha `period-closed`).
- [x] **Ports são `type`** com funções `Readonly`; `reopen` espelha `close` (assinatura, events opcionais).
- [x] **Adapters convertem na borda**: drizzle `try/catch → Result`; outbox na MESMA tx (ADR-0015); UPDATE zera colunas (sem migration). In-memory espelha atomicidade (append-then-set).
- [x] **Isolamento de módulo**: nenhum import de contracts/partners/auth/programs no domínio/use case.
- [x] **ESM/`import type`/`.ts`**: lint type-checked passou nos 10 arquivos tocados (exit 0).
- [x] **Borda HTTP**: rota espelha `close` (preHandler `reconciliation:close`, `req.userId → reopenedBy`); response schema `status: literal('Open')`.

## Issues
Nenhuma (round 1).

## Observação (não-bloqueante)
- Evento `ReconciliationPeriodReopened` carrega `reopenedBy` (desvio aprovado em W1: honra auditoria-via-evento sem migration; evita param não-usado). Consistente com a ausência de coluna nova.

## Próximo passo
W3 QUALITY: typecheck + format:check + lint + test (todos verdes).
