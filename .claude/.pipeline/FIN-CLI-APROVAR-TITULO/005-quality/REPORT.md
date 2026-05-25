# W3 — Quality Gate (FIN-CLI-APROVAR-TITULO)

> **Wave:** W3 · **Outcome:** ALL-GREEN · **Agent:** `ts-quality-checker`
> **Predecessor:** [`../004-code-review/REVIEW.md`](../004-code-review/REVIEW.md) (W2 APPROVED + 4 sugestões 🔵 — 2 aplicadas, 2 observações arquiteturais sem ação)
> **Data:** 2026-05-23T15:08Z

---

## 1. Comandos executados (4 paralelos)

| # | Comando | Saída | Veredito |
| :--- | :--- | :--- | :--- |
| 1 | `pnpm run typecheck` | `tsc --noEmit` exit 0, zero output | ✅ GREEN |
| 2 | `pnpm run format:check` | `All matched files use Prettier code style!` | ✅ GREEN |
| 3 | `pnpm run lint` | `eslint .` exit 0, zero output (após fix de disable órfão — §3) | ✅ GREEN |
| 4 | `pnpm test` | 1117 tests / **1101 pass** / 0 fail / 16 skipped | ✅ GREEN |

**Duração total da suite:** 38.4s.

---

## 2. Métricas de teste — delta vs baseline

| Métrica | Baseline (W3 FIN-CLI-SCAFFOLD) | W3 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1111 | 1117 | **+6** |
| pass | 1095 | 1101 | **+6** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |
| suites | 361 | 367 | +6 |

**Delta exato batendo com W1.** Zero regressão. Os 6 testes novos:
- `aprovar-titulo — happy path (CA-15)` — Open → Approved + state file atualizado
- `aprovar-titulo — help (CA-16)` — `--help` stdout exit 0
- `aprovar-titulo — flag obrigatória ausente (CA-17)` — exit 64 "Flag obrigatória ausente"
- `aprovar-titulo — invalid id (CA-18)` — exit 1 "ID do título inválido"
- `aprovar-titulo — not found (CA-19)` — exit 1 "Título não encontrado"
- `aprovar-titulo — status != Open com interpolação inline (CA-20)` — exit 1 "(status atual: Approved)"

Os 4 testes pré-existentes do FIN-CLI-WIRE + 3 do FIN-CLI-SCAFFOLD continuam GREEN após ajustes inline (CA-3, CA-NEW-1, CA-NEW-2).

---

## 3. Fix técnico durante W3 — `eslint-disable` órfão

### Diagnóstico

Primeira execução do lint reportou 1 warning:

```
tests/modules/financial/cli/commands/aprovar-titulo.test.ts
  99:3  warning  Unused eslint-disable directive (no problems were reported from
                 '@typescript-eslint/no-floating-promises')
```

### Causa

O `void handle.repo.save(payable, [])` no helper `seedState` já satisfaz `@typescript-eslint/no-floating-promises` — o operador `void` é a forma idiomática de marcar fire-and-forget intencional. O `eslint-disable-next-line` adicionado em W0 era redundante.

### Fix aplicado

Removida a linha de disable + comentário atualizado para explicar que **`void` é o mecanismo correto**:

```diff
 const seedState = (statePath: string, payable: OpenPayable | ApprovedPayable): void => {
-  // eslint-disable-next-line @typescript-eslint/no-floating-promises
   const handle = InMemoryPayableRepository();
-  // Floating promise é seguro aqui porque InMemory é síncrono (Promise é micro-task que
-  // já resolveu no momento do saveState abaixo). Pattern do contracts/cli/state.ts:374-376.
+  // `void` desativa `no-floating-promises`: InMemory é síncrono — a Promise
+  // é micro-task que já resolveu quando saveState lê o store. Pattern do
+  // contracts/cli/state.ts:374-376 (`void contractRepo.repo.save(c, [])`).
   void handle.repo.save(payable, []);
```

Re-rodado lint: **exit 0 sem output**. Suite global: `tests 1117 pass 1101 fail 0 skipped 16` — sem regressão.

---

## 4. CAs operacionais (000-request §3.6, CA-21..24)

| # | Critério | Comando | Status |
| :--- | :--- | :--- | :--- |
| CA-21 | `pnpm run typecheck` exit 0 | tsc --noEmit | ✅ |
| CA-22 | `pnpm run format:check` exit 0 | prettier --check . | ✅ |
| CA-23 | `pnpm run lint` exit 0 (zero warnings) | eslint . (após fix §3) | ✅ |
| CA-24 | `pnpm test` exit 0 sem regressão | node --test | ✅ (delta +6, fail=0) |

**Todos os 25 CAs do ticket validados** (21 em W1, 4 em W3).

---

## 5. Sugestões W2 — status final

| # | Sugestão | Status |
| :--- | :--- | :--- |
| 1 | Header item 6 mencionar tratamento inline | ✅ Aplicado — header agora explicita "tratamento inline para `PayableNotOpen` (CA-8b) + `formatErrorCode` fallback" |
| 2 | Cast type-safe via `import type { PayableNotOpen }` | ✅ Aplicado — import adicionado L34, cast L80 agora `(e as PayableNotOpen)` + comentário "refactor que renomeie `currentStatus` quebra o build aqui imediatamente" |
| 3 | Entry `PayableNotOpen` no formatter é fallback nunca exercitado | ⚪ Observação arquitetural — comentário no formatter L48 já documenta "lookup-only — interpolação inline no comando" |
| 4 | `run` ~50L próximo do limite | ⚪ Observação arquitetural — alinhado com `criar-contrato.ts` (~60L); extração para `runCliCommand` futura se 2-3 comandos repetirem pattern |

---

## 6. Sanidade dos testes específicos do ticket

```
$ node --test --experimental-strip-types --no-warnings \
    'tests/modules/financial/cli/commands/aprovar-titulo.test.ts'
✔ aprovar-titulo — happy path (CA-15)
✔ aprovar-titulo — help (CA-16)
✔ aprovar-titulo — flag obrigatória ausente (CA-17)
✔ aprovar-titulo — invalid id (CA-18)
✔ aprovar-titulo — not found (CA-19)
✔ aprovar-titulo — status != Open com interpolação inline (CA-20)
ℹ tests 6  pass 6  fail 0
```

6/6 GREEN — incluindo CA-20 validando string literal exata `"Título não está em estado Aberto (status atual: Approved)."` confirmando interpolação inline funcional.

---

## 7. Verificações complementares

| Item | Status |
| :--- | :--- |
| `STATE.json` schemaVersion 1 (canônico) | ✅ |
| W2 APPROVED round 1 (zero issues 🔴/🟡) | ✅ |
| 2 sugestões 🔵 aplicadas pré-W3 + 2 documentadas como observações | ✅ |
| 1 fix técnico durante W3 (eslint-disable órfão) — aplicado sem regressão | ✅ |
| Zero regressão nos 1095 testes pré-existentes | ✅ |
| Arquivos commitáveis (2 src novos + 2 src modificados + 1 test modificado + 1 test novo do ticket) | ✅ |
| `handbook/`, `.claude/`, ADRs intocados pelo ticket | ✅ |

---

## 8. Conclusão

ALL-GREEN round 1 (com 1 fix técnico durante W3 — eslint-disable órfão removido após detecção pelo gate). Ticket pronto para `close`.

**Aprendizado durante W3:** o operador `void` no JavaScript desativa `@typescript-eslint/no-floating-promises` por design — adicionar `eslint-disable` adicional é redundante e `reportUnusedDisableDirectives` detecta como órfão. Lição complementa a lição registrada em FIN-PORT-OUTBOX W3 (disable órfão em src/ com tipo de retorno explícito) e FIN-USECASE-APPROVE-PAYABLE W2 (require-await dispara em tests/ — manter disable em factory async sem await).

**Próximo ticket sugerido:** `FIN-USECASE-TRANSMIT-PAYABLE` (S) — segundo use case real (Approved → Transmitted, consome `Payable.transmit`). Ou `FIN-CLI-MOSTRAR-TITULO` (S) — primeiro comando read-only que vai exigir `formatters/payable.ts` enxuto (status localizado, money formatado, datas BR).
