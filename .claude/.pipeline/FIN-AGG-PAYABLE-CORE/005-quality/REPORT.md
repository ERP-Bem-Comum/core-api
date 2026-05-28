# Quality Check — Ticket FIN-AGG-PAYABLE-CORE

**Skill:** `ts-quality-checker` (W3 — gate final)
**Data:** 2026-05-23T08:52Z
**Veredito final:** ✅ **ALL GREEN round 1** — sem fixes técnicos

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | zero erros |
| 2 | Format check (`pnpm run format:check`) | ✅ | "All matched files use Prettier code style!" |
| 2-bis | Lint (`pnpm run lint`) | ✅ | zero warnings/errors |
| 3 | Testes (`pnpm test`) | ✅ | `# tests 1000  pass 984  fail 0  skipped 16` |
| 4 | Build | ⏭️ SKIPPED | Fase 1 |

---

## 🎯 Marco redondo — suite cruzou 1000 testes

Primeiro ticket M (não-XS) do módulo Financial. Passou em round 1 W3 mesmo com:
- 5 arquivos de produção (~370 linhas)
- Aplicação voluntária das 3 sugestões 🔵 W2 antes do gate (split de erro malformação vs timing, citação do R1 handbook, 2 testes adicionais de event shape)

| Ticket | Size | W3 round 1 |
| :--- | :---: | :--- |
| FIN-MODULE-SCAFFOLD | XS | ✅ |
| FIN-CLI-WIRE | XS | ⚠️ BLOCKED |
| FIN-VO-FITID | XS | ⚠️ BLOCKED |
| FIN-IDS-PAYABLE | XS | ✅ |
| FIN-VO-TAX-ID | S | ⚠️ BLOCKED |
| FIN-VO-BENEFICIARY-BANK-DATA | S | ✅ |
| **FIN-AGG-PAYABLE-CORE** | **M** | ✅ |

**Tendência:** os últimos 2 tickets seguidos passaram em round 1 W3. As 5 lições registradas (sem indexed access, sem shadowing, sem async-sem-await, sem template `T|undefined`, `as <Brand>` único) agora fazem parte do reflex de design.

---

## Saída integral

### Check 1 — `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit
```

Zero erros. Tipos refinados resolvem, discriminated unions exhaustivas, casts localizados aceitos.

### Check 2 — `pnpm run format:check`

```
Checking formatting...
All matched files use Prettier code style!
```

### Check 2-bis — `pnpm run lint`

```
> core-api@0.1.0 lint
> eslint .
```

Zero warnings/errors.

### Check 3 — `pnpm test`

```
ℹ tests 1000  pass 984  fail 0  skipped 16  duration_ms 44266
```

| Métrica | W3 do FIN-VO-BENEFICIARY-BANK-DATA | W3 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 962 | 1000 | **+38** |
| pass | 946 | 984 | **+38** |
| fail | 0 | 0 | 0 |
| skipped | 16 | 16 | 0 |

Delta exato: 38 testes do ticket (35 originais + 3 das sugestões aplicadas voluntariamente).

### Check 4 — Build

```
SKIPPED na Fase 1.
```

---

## CAs do 000-request (versão final após sugestões W2)

| CA | Status | Onde |
| :--- | :--- | :--- |
| CA-1 .. CA-22 | ✅ | W1 + W2 confirmaram |
| CA-23 (typecheck) | ✅ | Check 1 |
| CA-24 (format:check) | ✅ | Check 2 |
| CA-25 (pnpm test) | ✅ | Check 3 |
| CA-26 (lint) | ✅ | Check 2-bis |
| CA-27 (header doc cita handbook) | ✅ | + R1 agora em errors.ts (Sug 1) |
| CA-28 (`as` só em smart constructor) | ✅ | grep confirma |
| CA-29 (`occurredAt` injetado) | ✅ | events.test.ts agora explícito (Sug 3) |

**29/29 CAs verdes.**

---

## Resumo das mudanças entre W1 e W3

| Mudança | Origem | Linhas afetadas |
| :--- | :--- | --- |
| Header doc `errors.ts` cita R1 | Sug 1 | +7 linhas |
| Split `PayableInvalidApprovalDate` (malformação) ↔ `PayableApprovalDateBeforeOpenedAt` (timing) | Sug 2 | errors.ts: +9 / payable.ts: 4→6 linhas em approve / errors.test.ts: 1→2 constructor tests + 6→7 cases / payable.test.ts: 2 testes ajustados |
| 2 testes adicionais em `events.test.ts` (shape de payload) | Sug 3 | +35 linhas no test |

**Suite delta:** 35 → 38 testes (+3 net no ticket — 2 do events.test.ts + 1 do novo constructor em errors.test.ts; payable.test.ts não ganhou nem perdeu testes, apenas mudou a tag esperada).

---

## Lição registrada

**Padrão "split de erro malformação vs invariante temporal"** aplicado neste ticket é válido para qualquer outro agregado com datas:

- `PayableInvalidApprovalDate` (sem payload) — `isValidDate` falhou.
- `PayableApprovalDateBeforeOpenedAt(opened, attempted)` — data válida mas violou ordem temporal.

Tickets subsequentes do agregado (`FIN-AGG-PAYABLE-TRANSMISSION` etc.) podem adotar o mesmo split para `transmittedAt < approvedAt`, `paidAt < transmittedAt`, etc.

---

## Próximo passo

**ALL GREEN → ticket fecha.**

```bash
pnpm run pipeline:state close FIN-AGG-PAYABLE-CORE
```

**Marco — fatia 2 do módulo Financial iniciada:**

| Ticket | Status |
| :--- | :--- |
| Esqueleto + CLI + VOs/IDs | ✅ 6 tickets fechados |
| **FIN-AGG-PAYABLE-CORE** (este) | **✅ primeiro agregado** |
| FIN-AGG-PAYABLE-TRANSMISSION | próximo (M) |
| FIN-AGG-PAYABLE-PAYMENT | depois (M) |
| FIN-PORT-PAYABLE-REPO | depois (S) |
| FIN-USECASE-APPROVE-PAYABLE | depois (S) — primeiro use case |
| FIN-CLI-APROVAR-TITULO | depois (S) — primeiro comando real |

**Próximo ticket sugerido:** `FIN-AGG-PAYABLE-TRANSMISSION` (M) — estados `Transmitted` / `Rejected` / `Overdue` + transições `transmit()` / `registerRejection()` / `markOverdue()` / `resetToApproved()`. Expande a union `Payable` com 3 novos variants — TS forçará atualização de switches exhaustivos em consumers (boa propriedade de design já validada).
