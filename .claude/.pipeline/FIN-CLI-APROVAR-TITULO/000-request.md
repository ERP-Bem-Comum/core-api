# FIN-CLI-APROVAR-TITULO — Primeiro comando real da CLI do módulo Financial

> **Size:** S · **Tipo:** Subcomando CLI consumindo use case real
> **Sucessor de:** [`FIN-CLI-SCAFFOLD`](../FIN-CLI-SCAFFOLD/) (entregou pipeline completo + REGISTRY tipado vazio + parseFlags/validateAllowedFlags)
> **Bloqueia:** demos da P.O. para validar fluxo Open → Approved offline
> **Referência canônica:** [`src/modules/contracts/cli/commands/criar-contrato.ts`](../../../src/modules/contracts/cli/commands/criar-contrato.ts) — pattern de comando consumindo use case real.

---

## 1. Motivação

O scaffold da CLI financial está pronto (`FIN-CLI-SCAFFOLD` entregue 2026-05-23T14:26Z) com REGISTRY tipado mas vazio. Os exports `parseFlags` + `validateAllowedFlags` foram **registrados na memória persistente para validação de consumo neste ticket** — se este ticket não os consumir, ambos viram dead code candidate.

Este ticket entrega o **primeiro comando real** da CLI: `aprovar-titulo`. Consome o use case `approvePayable` (FIN-USECASE-APPROVE-PAYABLE) via `ctx.payableRepo` + `ctx.clock`, permitindo à P.O. validar offline o fluxo Open → Approved.

---

## 2. Decisões arquiteturais

### 2.1. Pattern espelha `criar-contrato.ts`

Comando exporta 3 itens (`descricao`, `help`, `run`) consumidos pelo REGISTRY via `import * as`. `run` recebe `(ctx, argv)` e retorna `Promise<number>` (exit code).

Sequência canônica:
1. `parseFlags(argv)` → traduz `--payable-id` / `--approved-by` para `ParsedFlags`
2. `validateAllowedFlags(parsed, ALLOWED)` → rejeita typos (`--no-stat` etc.)
3. Verifica REQUIRED flags (`payable-id`, `approved-by`)
4. Instancia `approvePayable({ payableRepo: ctx.payableRepo, clock: ctx.clock })`
5. Chama `useCase({ payableId, approvedByRaw })`
6. Sucesso: `ctx.persist()` + stdout `✅ Título aprovado.` + formatter
7. Erro: `formatErrorCode(r.error)` em stderr + exit 1

### 2.2. Sem `payable-id` rehydratado no comando — use case faz

O use case `approvePayable` aceita string crua no command (`payableId: string`, `approvedByRaw: string`) e faz o `rehydrate` internamente. O comando da CLI **NÃO** revalida — apenas passa as strings. Pattern consistente com `criar-contrato` (que passa strings cruas para o use case).

### 2.3. Formatter mínimo neste ticket

Como o output sucesso é simples (1 linha "✅ Título aprovado: <id>"), **não criamos `formatters/payable.ts`** ainda. Quando comandos mais ricos entrarem (`mostrar-titulo`, `listar-titulos`), aí sim. YAGNI.

Output esperado em sucesso:
```
✅ Título aprovado.

  ID:           <uuid>
  Status:       Approved
  Aprovado em:  2026-05-25T10:00:00.000Z
  Aprovado por: <uuid>
```

### 2.4. Erros de domínio (tagged Payable*) — dicionário + interpolação inline para PayableNotOpen

`formatErrorCode` do scaffold ainda **não conhece** os erros tagged do `PayableError` (e.g., `PayableNotOpen`, `PayableApprovalDateBeforeOpenedAt`). Quando o use case retornar esses, o formatter cai no fallback "Erro desconhecido (código interno: PayableNotOpen)".

**Este ticket adiciona 6 entradas** ao dicionário (`PayableNotOpen`, `PayableInvalidApprovalDate`, `PayableApprovalDateBeforeOpenedAt`, `approve-payable-invalid-id`, `approve-payable-not-found`, `user-ref-invalid`).

**Decisão de interpolação para `PayableNotOpen`:** o tagged error carrega `currentStatus` no payload (e.g., `{ tag: 'PayableNotOpen', currentStatus: 'Approved' }`). O dicionário só faz lookup — não interpola payload. Para o comando `aprovar-titulo`, **implementar tratamento inline no `run`** (5 linhas) que checa `tag === 'PayableNotOpen'` e formata `"(status atual: ${currentStatus})"` antes de cair no `formatErrorCode` genérico. Não introduz mecanismo de interpolação no formatter (overengineering — ticket futuro `FIN-CLI-FORMATTER-INTERPOLATION` se padrão se repetir).

### 2.5. Validação de consumo de `parseFlags`/`validateAllowedFlags`

Este ticket consome **ambos** os helpers do `parse-flags.ts`. Confirma que NÃO são dead code, fechando a sugestão 🔵 #4 do FIN-CLI-SCAFFOLD W2.

---

## 3. Critérios de Aceitação (CAs)

### 3.1. Comando (`commands/aprovar-titulo.ts`)

- **CA-1:** Arquivo exporta `descricao: string`, `help: string`, `run: (ctx, argv) => Promise<number>`.
- **CA-2:** `descricao` cita "Aprova um Título Financeiro (status Open → Approved)".
- **CA-3:** `help` lista 2 flags obrigatórias: `--payable-id <uuid>` e `--approved-by <uuid>`.
- **CA-4:** REQUIRED = `['payable-id', 'approved-by']`; ALLOWED = `[...REQUIRED, 'help', 'h']`.
- **CA-5:** Flag obrigatória ausente → stderr `❌ Flag obrigatória ausente: --<flag>` + help + exit 64.
- **CA-6:** `parseFlags` ou `validateAllowedFlags` falha → stderr via `formatFlagError` + exit 64.
- **CA-7:** Use case retorna ok → `ctx.persist()`, stdout `✅ Título aprovado.` + bloco com ID/status/aprovador, exit 0.
- **CA-8:** Use case retorna err → stderr `❌ <mensagem PT-BR>` + exit 1 (ou 74 se for state error de `persist`). **Comportamento idempotente** quando persist falha: Payable em memória já está Approved mas disco intacto (atomic write garante); P.O. pode re-executar e tudo funciona.
- **CA-8b:** Tratamento inline para `PayableNotOpen`: stderr formata `"❌ Título não está em estado Aberto (status atual: ${currentStatus})."` antes de cair no formatter genérico (decisão §2.4).
- **CA-9:** `_flag-errors.ts` reusado do scaffold OU criado análogo se não existir, com comentário `// CANDIDATO A EXTRAÇÃO QUANDO 3º MÓDULO PRECISAR` apontando para `shared/cli/` futuro.

### 3.2. Registry (`registry.ts`)

- **CA-10:** REGISTRY aponta `'aprovar-titulo'` para o module export do comando.
- **CA-11:** `--help` global lista `aprovar-titulo` com a descrição correta.

### 3.3. Formatters (`formatters/error.ts`)

- **CA-12:** Dicionário PT-BR ganha entradas para:
  - `PayableNotOpen` — "Título não está em estado Aberto." (mensagem genérica; interpolação dinâmica de `currentStatus` fica inline no comando — CA-8b)
  - `PayableInvalidApprovalDate` — "Data de aprovação inválida."
  - `PayableApprovalDateBeforeOpenedAt` — "Data de aprovação anterior à data de abertura do título."
  - `approve-payable-invalid-id` — "ID do título inválido (formato UUID v4 esperado)."
  - `approve-payable-not-found` — "Título não encontrado."
  - `user-ref-invalid` — "ID de usuário inválido (formato UUID v4 esperado)."
- **CA-13:** Formatter mantém pattern "lookup-only" (sem interpolação) — decisão arquitetural §2.4. Tratamento inline para `PayableNotOpen` no comando cobre o caso `currentStatus` (CA-8b).

### 3.4. Helper de teste (opcional)

- **CA-14:** Se um helper `_flag-errors.ts` existir no scaffold com `formatFlagError(ParseFlagsError): string`, reusar. Se NÃO existir, **criar** seguindo o pattern do contracts (`src/modules/contracts/cli/commands/_flag-errors.ts`).

### 3.5. Testes E2E (`tests/modules/financial/cli/commands/aprovar-titulo.test.ts`)

- **CA-15:** Teste happy path: seed payable Open via state file, executa `aprovar-titulo --state <tmp> --payable-id <uuid> --approved-by <uuid>` → exit 0, stdout "✅ Título aprovado", state file atualizado com status `Approved`.
- **CA-16:** Teste `--help` → exit 0, stdout contém `Flags obrigatórias`.
- **CA-17:** Teste flag obrigatória ausente (`--payable-id` faltando) → exit 64, stderr `Flag obrigatória ausente: --payable-id`.
- **CA-18:** Teste `--payable-id invalido foo` → exit 1, stderr "ID do título inválido".
- **CA-19:** Teste `--payable-id <uuid-orfao> --approved-by <uuid>` (UUID válido mas não persistido) → exit 1, stderr "Título não encontrado".
- **CA-20:** Teste sobre payable já Approved (seed via `Payable.open(...) → Payable.approve(...)` agregado real, depois `saveState(path, handle)`) → exit 1, stderr cita literalmente **"Título não está em estado Aberto (status atual: Approved)."** (valida interpolação inline do CA-8b — não construir objeto Payable literal).

### 3.6. Quality Gate (W3)

- **CA-21:** `pnpm run typecheck` exit 0.
- **CA-22:** `pnpm run format:check` exit 0.
- **CA-23:** `pnpm run lint` exit 0 (zero warnings).
- **CA-24:** `pnpm test` exit 0, baseline +N testes novos (esperado **+6 a +8**), zero regressão.

---

## 4. Estrutura de arquivos esperada

```
src/modules/financial/cli/
├── commands/                              ← NOVO diretório
│   ├── aprovar-titulo.ts                  ← NOVO (~90L)
│   └── _flag-errors.ts                    ← NOVO se não existir (~12L; reusa pattern do contracts)
├── registry.ts                            ← MODIFICADO (+1 import, +1 entry no REGISTRY)
└── formatters/error.ts                    ← MODIFICADO (+6 entradas no dicionário)

tests/modules/financial/cli/
└── commands/                              ← NOVO
    └── aprovar-titulo.test.ts             ← NOVO (~180L, 6 it's E2E via runFinancialCli + state file tmp)
```

**Total estimado:** ~270L src + ~180L tests = ~450L. Envelope **S**.

---

## 5. Fora do escopo (próximos tickets)

| Item | Ticket sugerido |
| :--- | :--- |
| `formatters/payable.ts` (output rico para mostrar/listar) | Junto com `FIN-CLI-MOSTRAR-TITULO` ou `FIN-CLI-LISTAR-TITULOS` |
| Comando `transmitir-titulo` (Approved → Transmitted) | `FIN-CLI-TRANSMITIR-TITULO` |
| Comando `processar-saida-bancaria` (Transmitted → PaidBank) | `FIN-CLI-PROCESSAR-SAIDA-BANCARIA` |
| Interpolação dinâmica de `{currentStatus}` no formatter | `FIN-CLI-FORMATTER-INTERPOLATION` (se W2 reclamar) |

---

## 6. Regras invariantes aplicáveis

- `.claude/rules/adapters.md` — CLI converte Result na borda; sem throw vazado.
- `.claude/rules/testing.md` — `tests/` espelha `src/`; E2E via subprocess.
- ADR-0006 — usa kernel compartilhado (Clock via shared/ports).
- ADR-0015 — eventos via outbox-in-repo (use case `approvePayable` já faz isso).

---

## 7. Riscos / pontos de atenção (para W2) — REVISADOS COM MITIGAÇÕES

### Risco 1 — `_flag-errors.ts` extrair vs criar local

**Análise:** `_flag-errors.ts` do contracts importa `'../formatters/error.ts'` (dicionário com erros Contract/Amendment). Extrair para `shared/cli/` exigiria também extrair o dicionário OU injetar `formatErrorCode` como callback — ambos aumentam ceremônia desproporcional para 10 linhas duplicadas.

**Mitigação:** criar local + comentário `// CANDIDATO A EXTRAÇÃO QUANDO 3º MÓDULO PRECISAR` (CA-9). YAGNI estrito.

### Risco 2 — `ctx.persist()` falha pós-use-case

**Análise:** se use case GREEN, `repo.save` GREEN (memória), `outbox.append` GREEN (memória), depois `ctx.persist()` (disco) falha:
- Em memória: Payable já Approved + evento no outbox.
- Disco: arquivo intacto (atomic write `tmp + rename` garante).
- Processo retorna exit 74 → `try/finally` chama `ctx.shutdown()` → lock liberado → memória RIP.
- P.O. re-executa: vê Payable ainda Open no disco, tenta de novo. **Idempotente.**

**Mitigação:** documentar comportamento idempotente no header do comando (CA-8). Sem mudança de design.

### Risco 3 — Interpolação `{currentStatus}` (resolvido)

**Análise:** tagged error tem `{ tag: 'PayableNotOpen', currentStatus: 'Approved' }`. Formatter atual só faz lookup. Para CA-20 funcionar com "status atual: Approved" no stderr, precisamos interpolar.

**Mitigação:** tratamento inline no `run` do comando (CA-8b — 5 linhas), antes de cair no `formatErrorCode` genérico. Formatter permanece "lookup-only" (sem interpolação global). Se outros comandos precisarem do mesmo pattern, abre-se `FIN-CLI-FORMATTER-INTERPOLATION`.

### Risco 4 — Seed de payable Approved no test (CA-20)

**Análise:** usar `Payable.open(...) → Payable.approve(...)` agregado real, depois `saveState(path, handle)`. Mesmo pattern dos tests de `state.test.ts` (FIN-CLI-SCAFFOLD) e `approve-payable.test.ts` (FIN-USECASE-APPROVE-PAYABLE).

**Mitigação:** CA-20 atualizado explicitamente — não construir objeto literal.

### Risco 5 — `approvePayable` retorna union mista (string literal + tagged)

**Análise:** formatter já trata ambos via `isTagged` (`formatters/error.ts:46-47`). Ok.

### Risco 6 — Test E2E precisa serializar Payable Open para state file

**Análise:** round-trip já validado em FIN-CLI-SCAFFOLD W3 (CA-14 da suite + state.test.ts CA-13). Apenas reusar pattern.
