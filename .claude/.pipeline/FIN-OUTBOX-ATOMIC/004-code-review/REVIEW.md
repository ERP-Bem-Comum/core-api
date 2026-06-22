# Code Review — Ticket FIN-OUTBOX-ATOMIC (#127) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-22T21:30Z
**Commit revisado:** `3ff421c6` (45 arquivos · +1080 / −212)
**Escopo revisado (read-only):**

- Ports: `application/ports/{reconciliation-repository,bank-statement-repository,reconciliation-period-store}.ts`
- Adapters Drizzle: `repos/{reconciliation-repository,bank-statement-repository,reconciliation-period-store}.drizzle.ts`
- Adapters in-memory: `repos/{reconciliation-repository,bank-statement-repository,reconciliation-period-store}.in-memory.ts`
- Use-cases: `save-draft`, `save-document`, `submit-draft`, `approve-document`, `undo-approval`,
  `adjust-document`, `cancel-document`, `confirm-reconciliation`, `record-manual-entry`,
  `undo-reconciliation`, `import-bank-statement`, `close-reconciliation-period`
- Composition: `adapters/http/composition.ts`
- Helper: `repos/fin-outbox-helpers.ts` (call sites)
- Runner: `scripts/ci/test-integration.ts`
- 5 testes novos de atomicidade + ripple dos testes existentes

---

## Conformidade com a fonte de verdade

**ADR-0015 (MySQL Outbox Pattern) — `handbook/architecture/adr/0015-mysql-outbox-pattern.md:48-51`** define
o fluxo:

```
2. INICIAR TRANSAÇÃO
3.   Escrever mudança de domínio
4.   INSERT INTO outbox (...)
5. COMMITAR TRANSAÇÃO   <- evento existe SE E SOMENTE SE estado persistido
```

A implementação realiza exatamente isso: `appendFinOutboxInTx(tx, events ?? [])` é o **último passo dentro
da `db.transaction`** de cada repo (save/delete/confirm/confirmManualEntry/undo/close). A regra de
`.claude/rules/application.md` ("eventos só após o save ter sucesso") é satisfeita em forma **mais forte** —
o evento é persistido atomicamente com o estado; a entrega (passo 7, worker) segue fora de escopo (não-objetivo
do #127). Resolve o achado do `composition.ts:340` (`createInMemoryOutbox()` no driver mysql): a composição
não tem mais outbox — varredura confirma zero `FinancialOutbox`/`outbox.append` em use-cases.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, registrar)

Nenhuma.

### 🔵 Sugestão / nota (não-bloqueia)

#### Nota 1 — `repos/reconciliation-repository.in-memory.ts` — ordenação do rollback no fake

`confirm` ordena: guard de título `Paid` (read-only) → `appendOrFail(events)` → `flipTransaction` (mutação).
Se o `append` tiver sucesso mas o `flipTransaction` falhar (transação não-`Pending`), os eventos já foram
"publicados" no outbox default (descartável) sem mutação de estado — uma fidelidade ligeiramente menor que a
`db.transaction` do Drizzle (onde o `throw` posterior reverteria o INSERT do outbox também). **Não é defeito:**
(a) o use-case já valida `transaction.reconciliationStatus === 'Pending'` antes de chamar o repo, então o
`flipTransaction` só falha em corrida que o fake não precisa modelar; (b) o outbox default é descartável e não
observável; (c) a garantia real (rollback all-or-nothing) é provada no adapter Drizzle/Docker
(`reconciliation-outbox-atomic.drizzle-mysql.test.ts` CA3). Mantido como está — consistente com o fake de
documento (Fatia A). Registrado apenas para rastreabilidade.

#### Nota 2 — `repos/reconciliation-period-store.drizzle.ts` — `close` passou a abrir `db.transaction`

Antes era `db.insert` único; agora `db.transaction(insert período + appendFinOutboxInTx)`. Correto e necessário
para atomicidade. A violação de `UNIQUE (debit_account_ref, period_start, period_end)` no re-close continua
caindo no `catch → err` (provado por `reconciliation-period.drizzle-mysql.test.ts` CA7, verde). Sem regressão.

---

## Checklist (resultado)

| Cat. | Item | Resultado |
| :-- | :-- | :-- |
| A | zero `throw`/`class`/`this`/`any`/`extends Error`/`let` reatribuído no diff src | ✅ (sweep vazio) |
| A | eventos com `occurredAt` injetado (não `new Date()` no domínio) | ✅ (eventos vêm do domínio; helper adapter usa `now` só p/ DocumentEvent sem occurredAt) |
| C | discriminadores EN; `events` tipados por union de domínio (`ReconciliationEvent`, `BankStatementEvent`, `ReconciliationPeriodClosed`) | ✅ |
| D | ports `type Readonly<{...}>`; `events?` trailing opcional (back-compat) | ✅ |
| D | use-cases factory `(deps) => (input) => Promise<Result>`; sequência validar→fetch→domain→persist(+evento atômico) | ✅ |
| D | adapters convertem `throw`→`Result` na borda (try/catch → slug) | ✅ |
| D | evento persistido na MESMA tx do estado (ADR-0015) | ✅ |
| E | sem import cross-módulo indevido; eventos via `fin_outbox` | ✅ |
| F | imports com `.ts`; `import type` em tipos; sem require/enum/namespace | ✅ (sweep vazio; lint verde) |
| G | identificadores EN; comentários PT; erros kebab-case EN | ✅ |
| H | testes com fakes injetáveis (outbox que falha), UUID válidos (`generate()`), AAA, asserções de regra (COUNT==baseline) | ✅ |

---

## O que está bom

- **Cobertura simétrica dos 4 agregados** (Document/Reconciliation/Statement/ReconciliationPeriod) com o
  mesmo padrão — port `events?` trailing, Drizzle `appendFinOutboxInTx` na tx, in-memory com paridade de
  rollback. Reduz carga cognitiva e risco de divergência.
- **Eliminação total do dual-write**: `createInMemoryOutbox()` removido da composição (não só "desligado").
  Varredura prova que o port `FinancialOutbox` só sobrevive como default dos repos in-memory.
- **Prova de atomicidade real**: testes Drizzle/MySQL injetam evento malformado (`event_type=''` → CHECK
  `fin_outbox_event_type_nonempty_chk`) para forçar rollback e asseguram `COUNT == baseline` — CA3 fiel.
  In-memory dá o feedback rápido (no-Docker); Drizzle dá a garantia.
- **Back-compat preservada**: `events?` opcional/trailing manteve seeds de teste (`repo.save(agg, [])`,
  `confirm(recon, txId)`) compilando sem mudança — ripple cirúrgico.
- **Zero regressão**: `pnpm test` 3127/0; `test:integration:financial` 50/50 (Docker).

---

## Próximo passo

- **APPROVED** → avançar para W3 (gate de qualidade). Os comandos do W3
  (`typecheck` + `format:check` + `lint` + `test` + `test:integration:financial`) já foram executados verdes
  na W1; W3 reexecuta como gate formal.
