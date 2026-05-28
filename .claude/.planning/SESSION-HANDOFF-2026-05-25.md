# Session Handoff — Retomada em outra máquina (2026-05-25)

> Documento de contexto para retomar o trabalho do zero em outro PC, lido pelo
> próprio Claude no boot. **Supersedes** `FIN-MODULE-SESSION-CHECKPOINT.md`
> (desatualizado: parou em `FIN-PORT-PAYABLE-REPO`; já avançamos 6 tickets).

---

## 0. TL;DR — ação imediata ao retomar

**Ticket ativo:** `FIN-CLI-MOSTRAR-TITULO` (S) — **W2 APPROVED, falta formalizar W2 + rodar W3.**

O `004-code-review/REVIEW.md` já tem veredito **APPROVED round 1** (zero issue crítica).
STATE.md ainda marca W2 `in-progress` porque o `wave-finish` não rodou. Sequência para fechar:

```bash
# 1. (Opcional mas recomendado) aplicar Issue 🟡 #1 preventivamente:
#    src/modules/financial/cli/formatters/money.ts:27
#    trocar NBSP literal `/ /g` por escape `/ /g` (idêntico runtime, lint-friendly)

# 2. Fechar W2
pnpm run pipeline:state wave-finish FIN-CLI-MOSTRAR-TITULO W2 --outcome APPROVED --report 004-code-review/REVIEW.md

# 3. W3 — gate de qualidade
pnpm run pipeline:state wave-start FIN-CLI-MOSTRAR-TITULO W3 --agent ts-quality-checker
pnpm run typecheck
pnpm run format:check
pnpm run lint
pnpm test          # esperar delta +7 testes (E2E mostrar-titulo), zero regressão

# 4. Escrever .claude/.pipeline/FIN-CLI-MOSTRAR-TITULO/005-quality/REPORT.md

# 5. Fechar
pnpm run pipeline:state wave-finish FIN-CLI-MOSTRAR-TITULO W3 --outcome ALL-GREEN --report 005-quality/REPORT.md
pnpm run pipeline:state close FIN-CLI-MOSTRAR-TITULO
```

---

## 1. O que é este ticket

Comando read-only `mostrar-titulo --payable-id <uuid>` no módulo Financial +
estreia da **suite de formatters** (`payable.ts`, `status.ts`, `money.ts`, `date.ts`).
Espelha `mostrar-contrato` do módulo contracts. Escopo completo em
`.claude/.pipeline/FIN-CLI-MOSTRAR-TITULO/000-request.md` (CA-1 a CA-29).

**Arquivos entregues no W1 (9):**

| Arquivo | Estado |
| :--- | :--- |
| `src/modules/financial/application/use-cases/get-payable.ts` | NOVO (~42L) |
| `src/modules/financial/cli/formatters/{money,date,status,payable}.ts` | NOVOS |
| `src/modules/financial/cli/commands/mostrar-titulo.ts` | NOVO (~65L) |
| `src/modules/financial/cli/formatters/{index,error}.ts` | MODIFICADOS |
| `src/modules/financial/cli/registry.ts` | MODIFICADO (+1 entry) |
| `tests/modules/financial/cli/commands/mostrar-titulo.test.ts` | NOVO (7 E2E) |

---

## 2. Pendências do REVIEW (não bloqueiam W3)

- **Issue 🟡 #1** — `money.ts:27` usa NBSP **literal** na regex em vez de escape `/ /g`.
  Recomendado aplicar antes do W3 (risco zero, alinha com contracts, evita warning de `no-irregular-whitespace`).
- **Sugestão 🔵 1** — header de `payable.ts` deveria avisar que o narrow por `if`s **não é TS-exaustivo**
  (novo status no union NÃO quebra build aqui; só `status.ts` via `Record<Status,string>` força exaustividade).
- **Sugestão 🔵 2** — comentário de `status.ts:8` diz "espelha contracts" mas labels diferem (7 vs 3 status); precisar "pattern estrutural".
- **Sugestão 🔵 3** — `payable.ts:87` mostra "Pago em" também para `Settled` (pode confundir P.O.); decidir em demo real.
- **Sugestão 🔵 4** — cosmética, OK como está.

**Padrão do projeto (validado nos últimos 5 tickets FIN):** o usuário costuma pedir para aplicar
**todas as 🔵 antes** de seguir para W3. Provável que peça o mesmo aqui.

---

## 3. Roadmap FIN (pós este ticket)

```
✅ SCAFFOLD, CLI-WIRE, VO-FITID, IDS-PAYABLE, VO-TAX-ID, VO-BENEFICIARY-BANK-DATA
✅ AGG-PAYABLE-CORE / TRANSMISSION / PAYMENT (7 estados)
✅ PORT-PAYABLE-REPO, PORT-OUTBOX, USECASE-APPROVE-PAYABLE, CLI-APROVAR-TITULO
🟡 CLI-MOSTRAR-TITULO  ← AQUI (W2 done, W3 pendente)

📋 Próximos sugeridos:
  1. FIN-CLI-LISTAR-TITULOS (S) — reusa formatPayable + variante formatPayableSummary (1 linha)
  2. FIN-DOMAIN-ERROR-GROUPING-REFACTOR (XS-S) — union PayableError 30 variants → 3 sub-unions
  3. FIN-ADAPTER-DRIZZLE-PAYABLE (M) — adapter MySQL real
```

**Tech-debt ativa:** `PayableError` com 30 variants (comentário em `domain/payable/errors.ts`).
Refactor para `PayableValidationError` / `PayableInvariantError` / `PayableTransitionError`
**após** o padrão de consumo da Application se firmar.

---

## 4. Estado do git / como retomar no outro PC

- **Branch:** `wip/checkpoint-2026-05-25` (criada de `main`, já no `origin`).
- **Commit base:** `e03a146` — checkpoint big-bang (1056 arquivos, todo o estado WIP).

```bash
git clone git@github.com:ERP-Bem-Comum/core-api.git
cd core-api
git switch wip/checkpoint-2026-05-25
pnpm install                 # corepack + frozen lockfile
pnpm run secrets:setup       # regenera ./secrets/*.txt (NÃO versionados)
```

**NÃO está no git (gitignored — recriar no outro PC):**
`.env`, `secrets/`, `cli-state.json`, `.claude/settings.local.json`,
`handbook/guidelines/` (PDFs Bradesco, local-only, restrição de redistribuição).

---

## 5. Convenções a não esquecer

- **Nunca `npm`** — sempre `pnpm` (ADR-0012; hook bloqueia).
- **Pipeline W0→W3** fail-first; W2 read-only max 3 rounds; W3 = typecheck + format + lint + test verdes.
- **STATE.json é canônico** (`pnpm run pipeline:state ...`); STATE.md é gerado.
- **Idioma:** código EN, docs/CLI-strings/commits PT.
- **Handbook vence** quando código discorda; ADR aceito é imutável.
- **Orquestração:** `contratos-orchestrator` é o ponto de entrada; um agente OU uma skill por turno.
