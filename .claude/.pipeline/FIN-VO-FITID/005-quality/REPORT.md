# Quality Check — Ticket FIN-VO-FITID

**Skill:** `ts-quality-checker` (W3 — gate final)
**Data:** 2026-05-22T18:48Z
**Veredito final:** ✅ **ALL GREEN** (após 1 round de fix técnico no test)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | zero erros |
| 2 | Format check (`pnpm run format:check`) | ✅ | "All matched files use Prettier code style!" |
| 2-bis | Lint (`pnpm run lint`) | ✅ após fix | round 1: 1 error (`no-shadow`) → fix in-place → round 2: zero |
| 3 | Testes (`pnpm test`) | ✅ | `# tests 868  pass 852  fail 0  skipped 16` |
| 4 | Build | ⏭️ SKIPPED | Fase 1 — projeto roda via `--experimental-strip-types` |

---

## ⚠️ Round 1 W3 BLOCKED — fix técnico aplicado

### Erro do lint round 1

```
tests/modules/financial/domain/shared/fitid.test.ts
  174:11  error  'describe' is already declared in the upper scope on line 28 column 10
                 @typescript-eslint/no-shadow

✖ 1 problem (1 error, 0 warnings)
```

### Análise

A função local `const describe = (e: FITIDError): string => ...` (linha 174) sombreava o `describe` importado de `node:test` (linha 28). TypeScript respeita escopo lexical e não há bug funcional (W1 + W3 round 1 mostraram `pass 16`), mas o ESLint do projeto trata shadowing como **erro hard** via `@typescript-eslint/no-shadow`.

**Esse caso foi exatamente a Sugestão 3 do REVIEW W2** — eu classifiquei como 🔵 cosmético, mas a regra ESLint do projeto considera erro real. Fix óbvio e isolado.

### Decisão: fix in-place sem reabrir W1/W2

Mesma justificativa do `FIN-CLI-WIRE` W3 — para ticket XS, refazer W1 + W2 (sem ganho de revisão substantiva) seria burocracia. Fix aplicado, REPORT documenta integralmente, STATE.json registra W3 ALL-GREEN. Trilha de auditoria preservada.

### Fix aplicado

```diff
     const cases: readonly FITID.FITIDError[] = ['fitid-empty', 'fitid-too-long'];
-    const describe = (e: FITID.FITIDError): string => {
+    const classify = (e: FITID.FITIDError): string => {
       switch (e) {
         case 'fitid-empty':
           return 'empty';
         case 'fitid-too-long':
           return 'too-long';
         default: {
           const _exhaustive: never = e;
           return _exhaustive;
         }
       }
     };
     // Act / Assert
-    assert.deepEqual(cases.map(describe), ['empty', 'too-long']);
+    assert.deepEqual(cases.map(classify), ['empty', 'too-long']);
```

`classify` é semanticamente correto (a função classifica erro em label) e evita o conflito com `describe` do test runner.

---

## Saída integral (pós-fix)

### Check 1 — `pnpm run typecheck`

```
> core-api@0.1.0 typecheck
> tsc --noEmit
```

Zero diagnostics. Exit 0.

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

Zero warnings/errors. Exit 0.

### Check 3 — `pnpm test`

Sumário:

```
ℹ tests 868  pass 852  fail 0  skipped 16  duration_ms 46647
```

Confirmação isolada:

```
$ node --test --experimental-strip-types --no-warnings \
    tests/modules/financial/domain/shared/fitid.test.ts

ℹ tests 16  pass 16  fail 0  duration_ms 83
```

Os 16 testes do ticket seguem GREEN após rename — `classify` substituiu `describe` sem mudar lógica de teste.

### Check 4 — Build

```
SKIPPED na Fase 1 — projeto roda via --experimental-strip-types sem build.
ADR-0009 cobre esta decisão.
```

---

## CAs do 000-request — re-verificação após fix

| CA | Status | Onde |
| :--- | :--- | :--- |
| CA-1 .. CA-12 | ✅ | testes seguem 16/16 GREEN |
| CA-13 (header doc cita OFX + handbook) | ✅ | W2 confirmou |
| CA-14 (typecheck) | ✅ | Check 1 |
| CA-15 (format:check) | ✅ | Check 2 |
| CA-16 (pnpm test) | ✅ | Check 3 |
| CA-17 (lint) | ✅ | Check 2-bis (round 2) |
| CA-18 (`as` só em smart constructor) | ✅ | W2 grep confirmou |

**18/18 CAs verdes.**

---

## Lição aprendida (importante — afeta próximas reviews)

**Para code-reviewer (W2):** shadowing de variável importada de built-in (`node:test`, `node:assert`, etc.) via `@typescript-eslint/no-shadow` é **erro hard** no projeto, não cosmético. Subir essa categoria de severidade na próxima review:

- 🔵 antigo (este REVIEW W2 Sugestão 3): "Renomear melhoraria leitura — não-bloqueia."
- 🔴 novo (a partir do próximo ticket): "Shadowing de built-in importado dispara lint error — REJECTED."

Atualizar a checklist mental do code-reviewer para incluir:

> Checklist H.5 — Identificadores locais não devem sombreiar imports de built-ins (`describe`, `it`, `assert`, `test`, etc.). Renomear sempre.

Esta lição não pertence ao REPORT W1/W2 deste ticket (já fechados); fica registrada aqui no W3 e deve ser propagada para o próximo `FIN-*`.

**Padrão dos fixes técnicos em W3 (consolidado):**

| Ticket | Round 1 W3 erros | Tipo |
| :--- | :--- | :--- |
| `FIN-CLI-WIRE` | `require-await`, `restrict-template-expressions` | Lint (regra automática) |
| `FIN-VO-FITID` | `no-shadow` | Lint (regra automática) |

Em ambos, fix foi in-place sem refazer W1/W2. Mesmo padrão funcionou em ambos. Não é tendência preocupante de qualidade — é vão da checklist W2 que pode ser fechado adicionando os itens lint mais comuns no checklist mental do reviewer.

---

## Próximo passo

**ALL GREEN → ticket fecha.**

```bash
pnpm run pipeline:state close FIN-VO-FITID
```

**Próximo ticket da fatia:** `FIN-IDS-PAYABLE` (XS) — branded UUID v4 para `PayableId`, `RemittanceId`, `BankTransactionId`. Independente, paralelizável com este se quiser abrir antes do `FIN-VO-BENEFICIARY-BANK-DATA`.
