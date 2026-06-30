# Code Review — Ticket FIN-CLI-WIRE — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-22T18:25Z
**Round:** 1 / 3
**Escopo revisado:**

- `src/modules/financial/cli/main.ts` (53 linhas, criado em W1)
- `package.json` (1 linha adicionada — script `cli:financial`)
- `tests/cli/helpers/run-financial-cli.ts` (39 linhas, criado em W0)
- `tests/modules/financial/cli/main.test.ts` (65 linhas, criado em W0)
- `.claude/.pipeline/FIN-CLI-WIRE/000-request.md` (escopo + CAs)
- `.claude/.pipeline/FIN-CLI-WIRE/003-impl/REPORT.md` (W1)

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — `tests/cli/helpers/run-financial-cli.ts` vs `tests/cli/helpers/run-cli.ts`

**Categoria:** D (Adapters & CLI — DRY)
**Observação:** O helper é cópia de `run-cli.ts` (estrutura idêntica, exceto `CLI_ENTRY` e nome do tipo `FinancialCliResult`). Dívida técnica reconhecida explicitamente no REPORT W0 §1: "Quando houver 3+ módulos com CLI, abrir ticket transversal `CTR-CLI-HELPER-GENERALIZE` para deduplicar".

**Não bloqueia** porque:
- A generalização agora forçaria mudanças em 23 tickets do `contracts` já closed-green (escopo creep).
- 39 linhas de cópia tem custo de manutenção menor que o risco de regressão.
- A dívida está rastreada — não some no esquecimento.

#### Sugestão 2 — `tests/modules/financial/cli/main.test.ts:17-19`

**Categoria:** H (tests — clareza histórica)
**Observação:** JSDoc menciona "Estado esperado em W0: RED — arquivo ... não existe". Mesma observação do `FIN-MODULE-SCAFFOLD` (Sugestão 1 daquele REVIEW). Padrão consistente com os 23 tickets fechados; não exige correção neste round.

#### Sugestão 3 — `src/modules/financial/cli/main.ts:30`

**Categoria:** F (TS moderno — preferência menor)
**Observação:** `process.argv.slice(2)` retorna `string[]` (mutável). Se quiser endurecer, `const argv: readonly string[] = process.argv.slice(2)` ou `Object.freeze(process.argv.slice(2))`. Como `argv` só é lido (`includes`, `length`, destructuring), e `noUncheckedIndexedAccess` está ativo (`subcommand: string | undefined`), não há risco prático. Padrão idêntico ao `contracts/cli/main.ts:73`.

**Não bloqueia** — preferência estilística menor.

---

## O que está bom

### `src/modules/financial/cli/main.ts`

- ✅ **Convenção GNU/POSIX integralmente respeitada**: `--help` → stdout exit 0 (suporta `cli --help | less`), uso inválido → stderr exit 64. Fixada no scaffold antes do primeiro comando real.
- ✅ **`EXIT_USAGE = 64` como constante nomeada** (linha 27) com comentário citando `sysexits.h`. Sem números mágicos.
- ✅ **Comentário ESLint local justificativo** (linhas 12-16) para `prefer-readonly-parameter-types`, com 4 linhas de prosa explicando o motivo. Espelha exatamente o padrão de `contracts/cli/main.ts:7-10`.
- ✅ **`useUnknownInCatchVariables` honrado**: `e: unknown` (linha 52) + `String(e)` no formatador. Sem `any` implícito.
- ✅ **Return types explícitos** em ambas funções: `printUsage(...): void`, `main(): Promise<number>`.
- ✅ **Padrão `main().then(code, e)` no bottom** em vez de top-level `await` — consistência com 23 tickets de contracts, mesmo comportamento.
- ✅ **Header doc** referencia `contracts/cli/main.ts` como pattern source — preserva rastreabilidade.
- ✅ **Mensagem placeholder cita literalmente** "nenhum ainda — virão com tickets FIN-USECASE-*" (linha 20), atendendo CA-11.
- ✅ **Símbolo `❌`** consistente com `contracts/cli/main.ts:104,109`.

### `package.json`

- ✅ **Posicionamento correto** — `cli:financial` logo após `cli:contracts`, mantendo agrupamento semântico do bloco `cli:*`. `jq` confirma estrutura JSON válida.
- ✅ **Comando idêntico ao padrão** — apenas troca `contracts` → `financial` no path do main.ts. Mesmas flags Node (`--experimental-strip-types --no-warnings`).
- ✅ Sem impacto em outros scripts (typecheck/test/lint/format/db:generate/secrets:setup intactos).

### `tests/cli/helpers/run-financial-cli.ts`

- ✅ **`Readonly<{...}>` no tipo de retorno** (`FinancialCliResult`).
- ✅ **`readonly args: readonly string[]`** no parâmetro de `runFinancialCli`.
- ✅ **`spawnSync` síncrono** — consistente com `run-cli.ts` (Decisão D1: "sem promise hell").
- ✅ **Spawn direto do `node`** (Decisão D4 do helper original) em vez de `pnpm run` — evita ~500ms de overhead e prefixo da task runner.
- ✅ **Timeout 5_000ms** — explícito, evita testes pendurados infinitamente.
- ✅ **Comentário no topo cita o helper análogo** (`run-cli.ts`) e justifica decisões.

### `tests/modules/financial/cli/main.test.ts`

- ✅ **JSDoc lista as 4 CAs cobertas** + nota explícita sobre CA-1/CA-2 (cobertas indiretamente via ENOENT).
- ✅ **AAA implícito mas claro**: Arrange (`runFinancialCli([...])`), Act (destructuring), Assert (`assert.equal`/`match`/`ok`).
- ✅ **Asserções específicas**: exit code exato (não "> 0"), regex em stdout/stderr, conteúdo literal ("Subcomando desconhecido: foo").
- ✅ **Mensagens de assertion úteis** — `'exit code esperado 0, recebido ${exitCode}. stderr=${stderr}'` ajuda debug futuro.
- ✅ **Sem mocks, sem fakes mágicos** — subprocess real (boundary do sistema testada como boundary).
- ✅ **Sem fake-IDs** (N/A para este ticket).

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | N/A — `cli/` não é domain |
| B. Smart constructors / Branded | N/A — nenhum VO |
| C. Discriminated unions | N/A — nenhum union |
| D. Ports & Adapters / CLI | ✅ `cli/` é camada permitida para infra real (`.claude/rules/adapters.md`); padrão `contracts/cli/main.ts` espelhado fielmente |
| E. Modular Monolith | ✅ `main.ts` não importa de outros módulos; helper de teste segue convenção de `tests/cli/helpers/` (mesmo lugar do helper de contracts) |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` no único import relativo (linha 25 do test); `node:test`, `node:assert`, `node:child_process`, `node:url`, `node:path` (prefixo `node:` correto); sem `require`/`namespace`/`enum`; return types explícitos |
| G. Naming, PT/EN, clareza | ✅ identifiers EN (`printUsage`, `EXIT_USAGE`, `main`, `argv`, `subcommand`, `runFinancialCli`, `FinancialCliResult`); mensagens PT-BR com acentuação completa; `EXIT_USAGE` em EN é correto (sigla técnica) |
| H. Tests | ✅ AAA, subprocess real, asserções específicas, sem matchers vagos |

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para **W3** (`ts-quality-checker`: `pnpm run typecheck` + `format:check` + `pnpm test` + `pnpm run lint`).
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-CLI-WIRE` fecha o ticket.
- **Próximo ticket da fatia:** `FIN-VO-FITID` (XS) — branded type `FITID` com anti-duplicidade ou `FIN-IDS-PAYABLE` (XS) — IDs branded UUID v4 para `PayableId`, `RemittanceId`. Ordem indiferente; ambos não dependem entre si.
