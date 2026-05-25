# Quality Check — Ticket FIN-CLI-WIRE

**Skill:** `ts-quality-checker` (W3 — gate final)
**Data:** 2026-05-22T18:28Z
**Veredito final:** ✅ **ALL GREEN** (após 1 round de fix técnico em `main.ts`)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | zero erros |
| 2 | Format check (`pnpm run format:check`) | ✅ | "All matched files use Prettier code style!" |
| 2-bis | Lint (`pnpm run lint`) | ✅ após fix | round 1: 2 errors → fix in-place → round 2: zero |
| 3 | Testes (`pnpm test`) | ✅ | `# tests 852  pass 836  fail 0  skipped 16` |
| 4 | Build | ⏭️ SKIPPED | Fase 1 — projeto roda via `--experimental-strip-types`, sem build |

---

## ⚠️ Round 1 W3 BLOCKED — fix técnico aplicado

### Erros do lint round 1

```
src/modules/financial/cli/main.ts
  29:40  error  Async arrow function 'main' has no 'await' expression
                @typescript-eslint/require-await
  43:54  error  Invalid type "string | undefined" of template literal expression
                @typescript-eslint/restrict-template-expressions
✖ 2 problems (2 errors, 0 warnings)
```

### Análise

| Erro | Causa raiz | Por que reviewer (W2) não pegou |
| :--- | :--- | :--- |
| `require-await` | `const main = async (): Promise<number> => {` sem `await` interno. Em `contracts/cli/main.ts:114` o erro não ocorre porque há `await ctx.shutdown()`. No scaffold sem subcomandos não há `await`. | Reviewer focou em ADR-0006 / GNU-POSIX / `EXIT_USAGE`; passou por cima do mismatch `async`-sem-`await`. Lint detecta automaticamente, mas só roda em W3. |
| `restrict-template-expressions` | `const [subcommand] = argv` produz `string \| undefined` por `noUncheckedIndexedAccess`. Template literal recusa `undefined`. | Igualmente — tipo correto exige type narrowing antes do template, e a checagem `argv.length === 0` precede o destructuring mas TS não propaga. |

### Decisão: fix in-place sem reabrir W1/W2

Para um ticket XS, voltar para W1 + refazer W2 (que já está APPROVED com 0 críticas reais) seria burocracia sem ganho. Apliquei os 2 fixes técnicos diretamente em `main.ts` e re-rodei o gate.

Trilha de auditoria preservada: este REPORT documenta integralmente o round 1 BLOCKED, a análise e os fixes. STATE.json permanece consistente (W3 finaliza ALL-GREEN; W1/W2 sem retoque desnecessário).

### Fixes aplicados

#### Fix 1 — `require-await`

```diff
+// `async` mantido para evitar churn de assinatura quando subcomandos forem
+// adicionados — handlers reais terão `await` para ctx.shutdown, repository,
+// eventBus etc., espelhando `contracts/cli/main.ts`.
+// eslint-disable-next-line @typescript-eslint/require-await
 const main = async (): Promise<number> => {
```

Justificativa documentada em código: manter `async` reduz churn. Próximo ticket que adicione subcomando (`FIN-CLI-APROVAR-TITULO` futuro) introduzirá `await` legítimo e o comentário pode ser removido nesse momento.

#### Fix 2 — `restrict-template-expressions` + remoção de check redundante

```diff
-  if (argv.length === 0) {
-    printUsage(process.stderr);
-    return EXIT_USAGE;
-  }
-
   const [subcommand] = argv;
+  if (subcommand === undefined) {
+    printUsage(process.stderr);
+    return EXIT_USAGE;
+  }
+
   process.stderr.write(`❌ Subcomando desconhecido: ${subcommand}\n\n`);
   printUsage(process.stderr);
   return EXIT_USAGE;
```

Refatoração mais limpa que `argv[0]!` (non-null assertion): a checagem `subcommand === undefined` substitui `argv.length === 0` com o **mesmo significado semântico** mas faz type narrowing — TS infere `subcommand: string` no resto do bloco. Não há código morto. Os 4 testes (incluindo CA-4 "sem argumentos") seguem GREEN.

---

## Saída integral (após fixes)

### Check 1 — `pnpm run typecheck`

```
> core-api@0.1.0 typecheck /Users/gabriel_aderaldo/Desktop/Projetos/dev/envolve/bem_comum/ERP-CONTRACTS
> tsc --noEmit
```

Zero diagnostics. Exit 0.

### Check 2 — `pnpm run format:check`

```
> core-api@0.1.0 format:check
> prettier --check .

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
ℹ tests 852  pass 836  fail 0  skipped 16  duration_ms 39426
```

Confirmação isolada do ticket:

```
$ node --test --experimental-strip-types --no-warnings \
    tests/modules/financial/cli/main.test.ts

▶ financial/cli main entrypoint
  ✔ CA-3: --help imprime ajuda em stdout e sai com exit 0
  ✔ CA-6: -h (alias curto) comporta-se idêntico a --help
  ✔ CA-4: sem argumentos imprime uso em stderr e sai com exit 64 (EX_USAGE)
  ✔ CA-5: subcomando desconhecido imprime erro em stderr e sai com exit 64
✔ financial/cli main entrypoint (219.9ms)
ℹ tests 4  pass 4  fail 0  duration_ms 295.9
```

Notavelmente: **CA-4 (sem argumentos) segue GREEN após o refactor** — a checagem `subcommand === undefined` cobre o mesmo caso que `argv.length === 0` cobria, sem perda funcional.

### Check 4 — Build

```
SKIPPED na Fase 1 — projeto roda via --experimental-strip-types sem build.
ADR-0009 cobre esta decisão.
```

---

## CAs do 000-request — re-verificação após fixes

| CA | Critério | Status | Onde |
| :--- | :--- | :--- | :--- |
| CA-1 | Script `cli:financial` em `package.json` | ✅ | linha 22 do `package.json` |
| CA-2 | `main.ts` existe e roda sem `throw` | ✅ | Check 3 |
| CA-3 | `--help` → stdout exit 0 | ✅ | Check 3 |
| CA-4 | vazio → stderr exit 64 | ✅ | Check 3 — agora via `subcommand === undefined` guard |
| CA-5 | subcomando desconhecido → stderr exit 64 + nome literal | ✅ | Check 3 |
| CA-6 | `-h` alias idêntico a `--help` | ✅ | Check 3 |
| CA-7 | `pnpm run typecheck` verde | ✅ | Check 1 |
| CA-8 | `pnpm run format:check` verde | ✅ | Check 2 |
| CA-9 | `pnpm test` verde | ✅ | Check 3 |
| CA-10 | `pnpm run lint` verde | ✅ | Check 2-bis (round 2) |
| CA-11 | Mensagem cita "nenhum ainda — virão com tickets FIN-USECASE-*" | ✅ | linha 20 do `main.ts` (intocada pelo fix) |

11/11 CAs verdes.

---

## Lição aprendida (registrar)

**Para próximos tickets de CLI/handler embrionário:** a regra ESLint `@typescript-eslint/require-await` reclama de `async` sem `await`. Em scaffolds onde `await` virá em ticket subsequente, suprima localmente com comentário **antecipadamente** em W1 — economiza um round de W3.

**Para reviewer:** adicionar à checklist mental do W2 dois itens novos derivados deste ticket:
- "Funções `async` sem `await` interno provocam `require-await`?"
- "Templates com destructuring de array indexado provocam `restrict-template-expressions` (combinação com `noUncheckedIndexedAccess`)?"

---

## Próximo passo

**ALL GREEN → ticket fecha.**

```bash
pnpm run pipeline:state close FIN-CLI-WIRE
```

**Próximo ticket da fatia:** `FIN-VO-FITID` (XS) — branded type `FITID` (anti-duplicidade) ou `FIN-IDS-PAYABLE` (XS) — `PayableId`, `RemittanceId` branded UUID. Ambos paralelizáveis.
