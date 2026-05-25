# W3 — Quality Gate (FIN-USECASE-APPROVE-PAYABLE)

> **Wave:** W3 · **Outcome:** ALL-GREEN · **Agent:** `ts-quality-checker`
> **Predecessor:** [`../004-code-review/REVIEW.md`](../004-code-review/REVIEW.md) (W2 APPROVED + 3 sugestões 🔵 — 2 aplicadas, 1 revertida após validação)
> **Data:** 2026-05-23T13:20Z

---

## 1. Comandos executados (4 paralelos)

| # | Comando | Saída | Veredito |
| :--- | :--- | :--- | :--- |
| 1 | `pnpm run typecheck` | `tsc --noEmit` exit 0, zero output | ✅ GREEN |
| 2 | `pnpm run format:check` | `All matched files use Prettier code style!` | ✅ GREEN |
| 3 | `pnpm run lint` | `eslint .` exit 0, zero output | ✅ GREEN |
| 4 | `pnpm test` | 1095 tests / **1079 pass** / 0 fail / 16 skipped | ✅ GREEN |

**Duração total da suite:** 38.4s (`duration_ms 38425.254`).

---

## 2. Métricas de teste — delta vs baseline

| Métrica | Baseline (W3 FIN-PORT-OUTBOX) | W3 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1087 | 1095 | **+8** |
| pass | 1071 | 1079 | **+8** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |
| suites | 349 | 356 | +7 |

**Delta exato batendo com W1.** Zero regressão. Os 8 testes novos cobrem:
- `PayableRepository contract — InMemory > CA-14` (1 teste — outbox propagation via `save(p, [event])`)
- `approvePayable — happy path (CA-19)` (1 teste)
- `approvePayable — outbox propagation (CA-20)` (1 teste)
- `approvePayable — invalid id (CA-21)` (1 teste)
- `approvePayable — not found (CA-22)` (1 teste)
- `approvePayable — invalid userRef (CA-23)` (1 teste)
- `approvePayable — payable não-Open (CA-24)` (1 teste)
- `approvePayable — data anterior a openedAt (CA-25)` (1 teste)

---

## 3. Sugestões W2 aplicadas antes do gate (pattern do projeto)

| # | Sugestão | Status final | Justificativa |
| :--- | :--- | :--- | :--- |
| 1 | `as unknown as string` → `as string` (6 ocorrências em `approve-payable.test.ts`) | ✅ **APLICADO** | Branded types são assignable para string base direto, sem trampolim |
| 2 | Remover `eslint-disable @typescript-eslint/require-await` no test runner | ❌ **REVERTIDO** | Tentei remover → lint quebrou com 2 errors (`Async method 'make'/'teardown' has no 'await' expression`). Disable é NECESSÁRIO em factory wrappers `async () => {...}` mesmo em tests/. Lição registrada corrigida na memória. |
| 3 | Cast `result.error as {...}` → type guard `'tag' in result.error` (CA-24, CA-25) | ✅ **APLICADO** | Type-safe via narrowing; sem cast runtime |

**Aprendizado durante W3:** a lição "regra `require-await` é relaxada em tests/" do FIN-PORT-OUTBOX W3 estava parcialmente errada. A regra **continua ativa em tests/**; `reportUnusedDisableDirectives` só detecta órfão quando o tipo de retorno explícito (`Promise<T>`) já satisfaz a regra. Em factory wrappers `async () => {...}` sem `await`, o disable é genuinamente necessário. Memória corrigida (`project_fin_module_status.md`).

---

## 4. CAs operacionais (000-request §3.6, CA-27..30)

| # | Critério | Comando | Status |
| :--- | :--- | :--- | :--- |
| CA-27 | `pnpm run typecheck` exit 0 | tsc --noEmit | ✅ |
| CA-28 | `pnpm run format:check` exit 0 | prettier --check . | ✅ |
| CA-29 | `pnpm run lint` exit 0 (zero warnings) | eslint . | ✅ |
| CA-30 | `pnpm test` exit 0 sem regressão | node --test | ✅ (delta +8, fail=0) |

**Todos os 30 CAs do ticket validados** (16 em W1, 1 inerente, 7 do test runtime, 3 W3, 3 do refactor já validados em CA-1..8).

---

## 5. Sanidade dos testes específicos do ticket

```
▶ PayableRepository contract — InMemory
  ✔ CA-14: save(p, [event]) propaga evento para o outbox injetado

▶ approvePayable — happy path (CA-19)
  ✔ CA-19: Open → Approved retorna ok com payable.status=Approved e event.type=PayableApproved
▶ approvePayable — outbox propagation (CA-20)
  ✔ CA-20: após approve, outbox.all() tem 1 row de tipo PayableApproved
▶ approvePayable — invalid id (CA-21)
  ✔ CA-21: payableId não-UUID retorna err approve-payable-invalid-id
▶ approvePayable — not found (CA-22)
  ✔ CA-22: payableId válido mas não persistido retorna err approve-payable-not-found e outbox vazio
▶ approvePayable — invalid userRef (CA-23)
  ✔ CA-23: approvedByRaw não-UUID propaga user-ref-invalid
▶ approvePayable — payable não-Open (CA-24)
  ✔ CA-24: payable já Approved propaga PayableNotOpen com currentStatus=Approved
▶ approvePayable — data anterior a openedAt (CA-25)
  ✔ CA-25: clock retorna data anterior ao openedAt → PayableApprovalDateBeforeOpenedAt
```

8/8 GREEN.

---

## 6. Verificações complementares

| Item | Status |
| :--- | :--- |
| `STATE.json` schemaVersion 1 (canônico) | ✅ |
| W2 APPROVED round 1 (zero issues 🔴/🟡) | ✅ |
| 2 sugestões 🔵 aplicadas, 1 revertida com aprendizado registrado | ✅ |
| Zero regressão nos 1071 testes pré-existentes | ✅ |
| Arquivos commitáveis (1 novo src + 2 mods src + 3 mods tests) | ✅ |
| `handbook/`, `.claude/`, ADRs intocados pelo ticket | ✅ |

---

## 7. Conclusão

ALL-GREEN round 1 (com 1 aprendizado durante W3 sobre escopo da regra `require-await`). Ticket pronto para `close`.

**Próximo ticket sugerido:** `FIN-CLI-APROVAR-TITULO` (S) — primeiro comando real em `pnpm run cli:financial`, consumindo `approvePayable` via driver `memory`. Pattern idêntico aos comandos do contracts (`pnpm run cli:contracts -- criar-contrato`).
