# W0 — Testes RED (FIN-CLI-APROVAR-TITULO)

> **Wave:** W0 · **Outcome:** RED · **Agent:** `tdd-strategist` (skill)
> **Predecessor:** [`../000-request.md`](../000-request.md) — 25 CAs + decisões §2 + riscos §7 mitigados
> **Artefatos:** 1 arquivo novo

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `tests/modules/financial/cli/commands/aprovar-titulo.test.ts` | 230 | NOVO |

---

## 1. Estratégia de teste

### 1.1. E2E puro via subprocess

Cada `it` chama `runFinancialCli(args)` — spawn de `node --experimental-strip-types src/modules/financial/cli/main.ts ...`. Sem stubs, sem interceptação: o subprocess executa o pipeline completo (`parseDriverFlags → registry → buildContext → cmd.run`). Pattern do `contracts.cli.test.ts` adaptado para o helper `runFinancialCli` (já criado em FIN-CLI-WIRE).

### 1.2. State file tmp isolado por it

CA-15 (happy) e CA-20 (status ≠ Open) precisam de Payable persistido — `seedState(statePath, payable)` cria handle in-memory, salva 1 Payable via `repo.save(payable, [])`, serializa via `saveState`. Cada `it` cria `makeTmpDir()` próprio + `rmSync` no `finally` (zero ordem-dependência).

CA-16 (--help), CA-17/18/19 (validação) usam `--no-state` (modo efêmero) — não precisam seedar.

### 1.3. Fixtures via agregado real

`buildOpenPayable()` chama `Payable.open(...)` real; `buildApprovedPayable()` faz chain `Payable.open(...) → Payable.approve(...)` real. **Não construir objeto Payable literal** (Risco 4 mitigado). Bugs em transições do agregado quebram fixture cedo.

### 1.4. CA-20 valida interpolação inline literal

Regex literal `"Título não está em estado Aberto (status atual: Approved)."` — força W1 a implementar tratamento inline para `PayableNotOpen` no `run` do comando (CA-8b). Se W1 deixar genérico, este teste falha.

---

## 2. Cobertura de CAs

| CA | Cenário | `it` |
| :--- | :--- | :--- |
| CA-15 | Happy path Open → Approved + state atualizado | "Open → Approved + state file atualizado" |
| CA-16 | `--help` → stdout exit 0 com flags obrigatórias | "--help imprime ajuda em stdout exit 0" |
| CA-17 | Sem `--payable-id` → exit 64 stderr "Flag obrigatória ausente" | "sem --payable-id → exit 64 ..." |
| CA-18 | `--payable-id not-a-uuid` → exit 1 stderr "ID do título inválido" | "--payable-id não-UUID → exit 1 ..." |
| CA-19 | UUID válido sem persistência → exit 1 stderr "Título não encontrado" | "--payable-id válido mas não persistido → exit 1 ..." |
| CA-20 | Payable Approved (seed via agregado) → exit 1 stderr "(status atual: Approved)" | "payable Approved → exit 1 com interpolação inline" — **valida CA-8b** |

CAs não cobertos por runtime W0:

| CA | Onde valida |
| :--- | :--- |
| CA-1..14 (comando + registry + formatter + helper) | type-level via `pnpm run typecheck` + review W2 |
| CA-21..24 (typecheck/format/lint/test) | W3 |

---

## 3. Fixtures (inline, ~85 linhas)

- `D(iso)` — `new Date(iso)` helper
- `APPROVER_UUID` — constante (mesmo UUID v4 do `approve-payable.test.ts`)
- `buildBeneficiary()` — `BeneficiaryBankData.fromRaw` com CPF DV-válido `11144477735`
- `buildMoney(cents)` — `Money.fromCents(15050)` default
- `buildOpenPayable()` — `Payable.open` real, openedAt `2026-05-20T00:00:00Z`, dueDate `2026-06-15`
- `buildApprovedPayable()` — chain `Payable.open(...) → Payable.approve(open, approver, '2026-05-25T10:00:00Z')`
- `makeTmpDir()` — `mkdtempSync(join(tmpdir(), 'fin-cli-aprovar-test-'))`
- `seedState(statePath, payable)` — handle InMemory + `repo.save(payable, [])` + `saveState`

---

## 4. Saída RED

### 4.1. TypeScript (`pnpm run typecheck`)

```
$ pnpm run typecheck
(exit 0, zero output)
```

Zero erros TS — todos os tipos importados já existem (helpers do scaffold + agregado Payable + repos/state do financial). O test file é **type-safe contra a API esperada** porque ela depende apenas de tipos já implementados.

### 4.2. Runtime (`pnpm test`)

| Métrica | Baseline (W3 FIN-CLI-SCAFFOLD) | W0 deste ticket | Delta |
| :--- | ---: | ---: | ---: |
| tests | 1111 | 1117 | **+6** |
| pass | 1095 | 1095 | 0 |
| fail | 0 | **6** | **+6** |
| skipped | 16 | 16 | 0 |
| suites | 361 | 367 | +6 |

**6 falhas, todas pelo MESMO motivo:** `aprovar-titulo` não está no REGISTRY (vazio neste momento) — pipeline cai em "Subcomando desconhecido: aprovar-titulo" exit 64.

Cada it falha de forma distinta:
| `it` | Esperado | Recebido (RED) |
| :--- | :--- | :--- |
| CA-15 (happy) | exit 0 stdout "✅ Título aprovado" | exit 64 stderr "Subcomando desconhecido: aprovar-titulo" |
| CA-16 (--help) | exit 0 stdout "Flags obrigatórias" | exit 64 (parser não chega no `--help` do subcomando porque o lookup do REGISTRY falha primeiro) |
| CA-17 (flag ausente) | exit 64 stderr "Flag obrigatória ausente: --payable-id" | exit 64 stderr "Subcomando desconhecido" — regex não casa |
| CA-18 (invalid id) | exit 1 stderr "ID do título inválido" | exit 64 stderr "Subcomando desconhecido" |
| CA-19 (not found) | exit 1 stderr "Título não encontrado" | exit 64 stderr "Subcomando desconhecido" |
| CA-20 (status ≠ Open) | exit 1 stderr "(status atual: Approved)" | exit 64 stderr "Subcomando desconhecido" |

**Zero regressão** nos 1095 testes pré-existentes (matemática: 1095 baseline + 0 new pass = 1095 atual; 0 baseline fails + 6 new fails = 6 atual; tudo bate).

---

## 5. Diagnóstico RED — checklist

| Aspecto | OK? | Nota |
| :--- | :--- | :--- |
| Causa primária por inexistência (não por assert errado nos novos modules) | ✅ | REGISTRY não tem `aprovar-titulo` |
| Type-safe — typecheck passa em RED | ✅ | imports usam módulos que já existem (scaffold + use case + state) |
| Sem novos source files a criar para compilar — só implementar | ✅ | só registry + comando + formatter precisam ser adicionados em W1 |
| Cobertura de happy + 5 unhappy paths | ✅ | 1 happy + 5 unhappy = 6 it's |
| State file tmp isolado | ✅ | mkdtempSync + finally rmSync |
| Sem `class`, `throw` em prod, `as any`, `default: throw` | ✅ | (throws em fixture helpers OK) |
| Imports `#src/*` subpath | ✅ | 100% |
| Reuso de helper `runFinancialCli` (FIN-CLI-WIRE) | ✅ | sem duplicação |
| Fixtures via agregado real (Risco 4 mitigado) | ✅ | `Payable.open` / `Payable.approve` chain |
| CA-20 força interpolação inline literal (Risco 3 mitigado) | ✅ | regex exato |

---

## 6. Lista pronta para W1

Implementer deve criar/modificar **4 arquivos** em `src/modules/financial/cli/`:

### 6.1. `commands/_flag-errors.ts` (NOVO — ~12 linhas)

```ts
// CANDIDATO A EXTRAÇÃO QUANDO 3º MÓDULO PRECISAR — mover para src/shared/cli/_flag-errors.ts.
import type { ParseFlagsError } from '../parse-flags.ts';
import { formatErrorCode } from '../formatters/error.ts';

export const formatFlagError = (error: ParseFlagsError): string => {
  const code = error.kind === 'cli-flag-duplicated' ? 'cli-flag-duplicated' : 'cli-flag-unknown';
  return `❌ ${formatErrorCode(code)} (--${error.flag})\n`;
};
```

### 6.2. `commands/aprovar-titulo.ts` (NOVO — ~90 linhas)

```ts
import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { approvePayable } from '../../application/use-cases/approve-payable.ts';
import { formatErrorCode } from '../formatters/error.ts';
import { formatFlagError } from './_flag-errors.ts';

const REQUIRED = ['payable-id', 'approved-by'] as const;
const ALLOWED = [...REQUIRED, 'help', 'h'] as const;

export const descricao = 'Aprova um Título Financeiro (status Open → Approved).';

export const help = `Uso: aprovar-titulo [flags]

Flags obrigatórias:
  --payable-id <uuid>      ID do Título Financeiro a aprovar
  --approved-by <uuid>     ID do aprovador autorizado (R1 — Soberania da Aprovação)`;

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  const parsed = parseFlags(argv);
  if (!parsed.ok) {
    process.stderr.write(formatFlagError(parsed.error));
    return 64;
  }
  const allowed = validateAllowedFlags(parsed.value, ALLOWED);
  if (!allowed.ok) {
    process.stderr.write(formatFlagError(allowed.error));
    return 64;
  }
  const flags = parsed.value;

  for (const required of REQUIRED) {
    if (flags[required] === undefined || flags[required] === '') {
      process.stderr.write(`❌ Flag obrigatória ausente: --${required}\n\n${help}\n`);
      return 64;
    }
  }

  const useCase = approvePayable({ payableRepo: ctx.payableRepo, clock: ctx.clock });
  const r = await useCase({
    payableId: flags['payable-id'] ?? '',
    approvedByRaw: flags['approved-by'] ?? '',
  });

  if (!r.ok) {
    // CA-8b: interpolação inline para PayableNotOpen (formatter é lookup-only).
    const e = r.error;
    if (typeof e === 'object' && 'tag' in e && e.tag === 'PayableNotOpen') {
      const status = (e as { currentStatus: string }).currentStatus;
      process.stderr.write(`❌ Título não está em estado Aberto (status atual: ${status}).\n`);
    } else {
      process.stderr.write(`❌ ${formatErrorCode(e)}\n`);
    }
    return 1;
  }

  // CA-8: comportamento idempotente — se persist falha, disco intacto, P.O. re-executa.
  const persisted = await ctx.persist();
  if (!persisted.ok) {
    process.stderr.write(`❌ ${formatErrorCode(persisted.error)}\n`);
    return 74; // EX_IOERR
  }

  process.stdout.write('✅ Título aprovado.\n\n');
  process.stdout.write(`  ID:           ${r.value.payable.id}\n`);
  process.stdout.write(`  Status:       ${r.value.payable.status}\n`);
  process.stdout.write(`  Aprovado em:  ${r.value.payable.approvedAt.toISOString()}\n`);
  process.stdout.write(`  Aprovado por: ${r.value.payable.approvedBy}\n`);
  return 0;
};
```

### 6.3. `registry.ts` (MODIFICADO — +1 import +1 entry)

```ts
import type { CliContext } from './context.ts';
import * as aprovarTitulo from './commands/aprovar-titulo.ts';

// ... type SubCommand inalterado

export const REGISTRY: Readonly<Record<string, SubCommand>> = {
  'aprovar-titulo': aprovarTitulo,
};
```

### 6.4. `formatters/error.ts` (MODIFICADO — +6 entradas no dicionário)

Adicionar após as entradas existentes:

```ts
  // ─── Use case errors (FIN-CLI-APROVAR-TITULO) ─────────────────────────────
  'approve-payable-invalid-id': 'ID do título inválido (formato UUID v4 esperado).',
  'approve-payable-not-found': 'Título não encontrado.',
  'user-ref-invalid': 'ID de usuário inválido (formato UUID v4 esperado).',

  // ─── Payable domain errors (tagged) ───────────────────────────────────────
  PayableNotOpen: 'Título não está em estado Aberto.',
  PayableInvalidApprovalDate: 'Data de aprovação inválida.',
  PayableApprovalDateBeforeOpenedAt:
    'Data de aprovação anterior à data de abertura do título.',
```

### 6.5. Métricas esperadas após W1

| Métrica | W0 RED | W1 GREEN esperado |
| :--- | ---: | ---: |
| tests | 1117 | 1117 |
| pass | 1095 | **1101** (+6 dos novos) |
| fail | 6 | **0** |
| skipped | 16 | 16 |

---

## 7. Lições preventivas aplicadas

| Lição | Status |
| :--- | :--- |
| Sem indexed access — `rows[0]` com guard | ✅ |
| Sem shadowing de built-ins | ✅ |
| Imports `#src/*` subpath | ✅ |
| `import type` separado de runtime | ✅ |
| Fixtures via agregado real (não literal) | ✅ |
| `tmpdir()` + `mkdtempSync` + finally rmSync (isolamento entre runs) | ✅ |
| `eslint-disable @typescript-eslint/no-floating-promises` no `seedState` helper — `void handle.repo.save(...)` é seguro porque InMemory resolve sincronamente; pattern do contracts/cli/state.ts:374-376 | ✅ |
| Reuso do helper `runFinancialCli` (FIN-CLI-WIRE) — sem re-spawn manual | ✅ |
| CA-20 valida string literal interpolada (força CA-8b inline) | ✅ |

---

## 8. Pronto para W1

Ordem sugerida para o implementer:

1. **Primeiro** — `commands/_flag-errors.ts` (sem dependências de outros arquivos do ticket; só imports do scaffold).
2. **Depois** — `commands/aprovar-titulo.ts` (depende de `_flag-errors.ts` + scaffold + use case + formatter).
3. **Depois** — `registry.ts` modificado (depende de `aprovar-titulo.ts`).
4. **Por último** — `formatters/error.ts` modificado (6 entradas; pode ser feito em qualquer momento, mas vale fazer ANTES de rodar `pnpm test` para evitar mensagens "Erro desconhecido" nos asserts).
5. Rodar `pnpm test` — esperar `tests 1117 pass 1101 fail 0 skipped 16`.
6. Rodar `pnpm run typecheck` — esperar zero erros.

Envelope **S** — implementação esperada em 1 round. Cuidados:
- **CA-20 é o mais delicado** — o tratamento inline para `PayableNotOpen` precisa estar ANTES da chamada `formatErrorCode(e)` fallback. Regex exato `(status atual: Approved).` exige formato literal.
- **Status do Payable em `result.value.payable.status`** — é `'Approved'` (PascalCase do domínio); stdout mostra direto.
