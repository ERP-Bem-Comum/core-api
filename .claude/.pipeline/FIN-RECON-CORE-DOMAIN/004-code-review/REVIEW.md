# Code Review — FIN-RECON-CORE-DOMAIN (#122) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-06-18T12:38Z

**Escopo revisado (read-only):**

- `src/modules/financial/domain/reconciliation/{reconciliation-id,errors,events,types,reconciliation}.ts`
- `src/modules/financial/domain/payable/payable.ts`
- `tests/modules/financial/domain/reconciliation/reconciliation.test.ts`
- `tests/modules/financial/domain/payable/payable-reconcile.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`this`/`any`/`extends Error`; sem PT no código; sem import cross-módulo;
`tsc` e `lint` já verdes (W1). **Sem `.push`/`.sort`/`let` em arrays do domínio** — construção 100%
funcional (`.map`/`.reduce`).

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

1. **`reconciliation.ts` — validação R2** usa `for...of` com early-return. Correto; uma alternativa
   ligeiramente mais funcional seria `input.payables.every((p) => p.status === 'Paid')`. Mantido (claro
   e curto).
2. **Convenção de sinal da `difference`**: hoje `R3 = Σ itens + difference.valueCents === transação`,
   então `Interest`/`Penalty`/`Fee` somam (positivo) e um `Discount` (transação < títulos) exigiria
   `valueCents` **negativo**. As CAs cobrem só `Interest` (positivo). Registrar a convenção de sinal
   (ou um `valueCents` sempre positivo + sinal derivado do `treatment`) quando o **#123** orquestrar o
   lançamento da diferença. Não bloqueia este ticket (domínio).
3. **`immutable` shallow**: o objeto `audit` aninhado não é congelado (padrão da casa — `document.ts`
   também usa `immutable` raso). OK.

---

## Verificação por categoria

| Cat | Item | Resultado |
| :-- | :-- | :-- |
| A | sem `throw`/`class`/`this`/`any`; `Readonly`/`readonly[]`; **sem `.push`** (map/reduce); return types explícitos; `occurredAt` injetado | ✅ |
| B | `ReconciliationId` branded + smart constructor (`rehydrate`→`Result`); `as Brand` só após validação; erros string-literal EN | ✅ |
| C | eventos discriminados por `type` EN-passado (`PayableReconciled`/`ReconciliationUndone`); `deriveType` sem `switch`/`throw` | ✅ |
| E | `reconciliation/` importa só do próprio módulo (`../shared`, `../statement`, `../document`, `../payable`) + `shared/`; sem cross-módulo; refs por **identidade** | ✅ |
| F | imports `.ts`; `import type`; sem `require`/`enum`/`namespace`; `tsc` verde | ✅ |
| G | identificadores EN; enums EN (C1); erros EN kebab-case; nomes específicos | ✅ |
| H | testes com builders (`snap`/`input`/`buildPayable`), ids reais; asserções de regra (type, status, contagem de eventos, erros) | ✅ |

---

## O que está bom

- **Construção funcional** (`.map`/`.reduce`, zero mutação) — mais limpa que o builder imperativo do #118.
- Invariantes bem isoladas: R2 (pré-condição `Paid`), R3 (fechamento 100%), R7 (undo preserva).
- `type` derivado de forma legível (`deriveType` com guard-clauses).
- Eventos por-título (`PayableReconciled`) + um `ReconciliationUndone` — granularidade correta p/ o outbox (#123).
- Transições `payable` puras e mínimas; erros específicos (`title-not-paid`/`title-not-reconciled`).
- Aderência exata ao contrato do W0.

## Próximo passo

**APPROVED (round 1).** Avançar para **W3** (`ts-quality-checker`).

### Addendum — 🔵 tratadas (a pedido do humano, pós-review; não-comportamentais, verde mantido)

- **#1** ✅ R2 refatorada para `input.payables.every((p) => p.status === 'Paid')`.
- **#2** ✅ convenção de sinal da `difference` documentada em `types.ts` (positivo soma; negativo p/
  `Discount`); handoff p/ **#123** mantido (lançamento contábil da diferença).
- **#3** — `immutable` raso mantido (padrão da casa, sem ação).

Re-verificado: 12/12 testes · `typecheck` ✅ · `lint` ✅.
