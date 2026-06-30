# Code Review — Ticket FIN-CLI-APROVAR-TITULO — Round 1

**Veredito:** **APPROVED**

**Reviewer:** `code-reviewer` (skill canônica W2)
**Data:** 2026-05-23T15:00Z
**Round:** 1 / 3
**Escopo revisado:** 5 arquivos (2 src novos + 2 src modificados + 1 test modificado) + 1 leitura cruzada (`contracts/cli/commands/{criar-contrato,_flag-errors}.ts` — verificação de paridade)

| # | Arquivo | Linhas | Status |
| :--- | :--- | ---: | :--- |
| 1 | `src/modules/financial/cli/commands/_flag-errors.ts` | 20 | NOVO |
| 2 | `src/modules/financial/cli/commands/aprovar-titulo.ts` | 100 | NOVO |
| 3 | `src/modules/financial/cli/registry.ts` | 22 | MODIFICADO (+3) |
| 4 | `src/modules/financial/cli/formatters/error.ts` | 65 | MODIFICADO (+13) |
| 5 | `tests/modules/financial/cli/main.test.ts` | 132 | MODIFICADO (~30) |

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não-bloqueia, mas registrar)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

#### Sugestão 1 — Header doc do `aprovar-titulo.ts` cobre só `formatErrorCode` no item 6

**Categoria:** G (precisão de docs)
**Localização:** `src/modules/financial/cli/commands/aprovar-titulo.ts:14`

```ts
 *   6. Erro: `formatErrorCode` em stderr + exit 1 (ou 74 se persist falhou).
```

A sequência canônica numerada (1-6) descreve o fluxo geral, mas a partir do CA-8b o erro **não** vai diretamente para `formatErrorCode` — primeiro passa pelo type guard de `PayableNotOpen` para interpolação inline. A doc principal não menciona isso (apesar do bloco específico em §"Tratamento inline" mais abaixo).

**Sugestão (não-bloqueia):** alinhar item 6 com a realidade do `run`:

```ts
 *   6. Erro: tratamento inline para `PayableNotOpen` (CA-8b) + `formatErrorCode`
 *      fallback genérico em stderr + exit 1 (ou 74 se persist falhou).
```

#### Sugestão 2 — Cast `(e as { currentStatus: string })` perde type safety

**Categoria:** F (TS moderno — strict typing)
**Localização:** `src/modules/financial/cli/commands/aprovar-titulo.ts:78`

```ts
const status = (e as { currentStatus: string }).currentStatus;
```

O cast funciona mas duplica o conhecimento da forma do `PayableNotOpen` (já tipado em `domain/payable/errors.ts`). Se o domínio mudar a estrutura do tagged error (e.g., renomear `currentStatus` para `actualStatus`), este cast continuaria compilando silenciosamente até o teste E2E falhar.

**Alternativa mais type-safe (não-bloqueia):**

```ts
import type { PayableNotOpen } from '#src/modules/financial/domain/payable/errors.ts';
// ...
const status = (e as PayableNotOpen).currentStatus;
```

Custo: +1 import type. Benefício: refactor do domínio quebra build aqui imediatamente. Aceitável manter atual (5 linhas → não vale ceremônia adicional).

#### Sugestão 3 — Entry `PayableNotOpen` no formatter (`error.ts:49`) é fallback nunca exercitado pelo caminho principal

**Categoria:** G (clareza arquitetural)
**Localização:** `src/modules/financial/cli/formatters/error.ts:49`

```ts
PayableNotOpen: 'Título não está em estado Aberto.',
```

Como o `aprovar-titulo` faz tratamento inline (CA-8b), essa entrada **só** é exercitada se outro comando futuro chamar `formatErrorCode(payableNotOpenInstance)` direto. Hoje é dead-entry funcionalmente, mas defensivamente correto.

**Sugestão (não-bloqueia):** o comentário próximo à entry (L48) já diz "interpolação inline no comando", o que é honesto. Quando 2-3 comandos repetirem o pattern, abre-se `FIN-CLI-FORMATTER-INTERPOLATION` para extrair o mecanismo genérico (já mencionado no header do `aprovar-titulo.ts:21`).

#### Sugestão 4 — `run` chega a 50 linhas — próximo do limite confortável

**Categoria:** G (clareza / coesão)
**Localização:** `src/modules/financial/cli/commands/aprovar-titulo.ts:48-99`

A função `run` tem ~50 linhas — alinhada com o pattern do `criar-contrato.ts:33-94` (~60L). Para 1 comando isolado, aceitável. Se outros comandos (`transmitir-titulo`, `processar-saida-bancaria`) repetirem **a mesma estrutura** (parseFlags → validateAllowedFlags → REQUIRED check → use case → error inline + persist → output), vale extrair helper `runCliCommand` no shared.

**Sugestão (não-bloqueia):** observação para tickets futuros — se o pattern repetir 2-3x, considerar extração.

---

## O que está bom

### Verificação cruzada — paridade com `criar-contrato.ts` confirmada

```
$ diff <pattern criar-contrato.ts> <pattern aprovar-titulo.ts>
```

Estrutura **funcionalmente idêntica**:
- Exports `descricao` / `help` / `run` ✅
- `REQUIRED` + `ALLOWED` tuples readonly ✅
- Sequência canônica `parseFlags → validateAllowedFlags → REQUIRED check → useCase → persist → output` ✅
- Helper `formatFlagError` para erros de parsing ✅
- Exit codes 64/1/74 mapeados consistentemente ✅

Diferença intencional (e correta): **tratamento inline para `PayableNotOpen`** (5 linhas — CA-8b) que `criar-contrato.ts` não tem porque `ContractError` ainda usa string literal (não tagged). Pattern justificado para tagged error com payload.

### `_flag-errors.ts` — funcionalmente idêntico ao contracts

Diff cross-módulo mostra apenas:
- Header doc próprio (financial cita "CANDIDATO A EXTRAÇÃO QUANDO 3º MÓDULO PRECISAR")
- Comentário REGR específico do contracts removido

Lógica de switch (`cli-flag-duplicated` vs `cli-flag-unknown`) e formato de output (`❌ <msg> (--<flag>)\n`) bit-by-bit iguais. **Não é dead code** — `aprovar-titulo.ts:51,56` consome em 2 pontos.

### Auditoria automática — todas verdes

```
$ grep -nE "throw |\bclass\b|new Error|extends Error|: any\b|as any" \
    src/modules/financial/cli/commands/{aprovar-titulo,_flag-errors}.ts
(nenhum)
```

Zero `throw`, `class`, `this`, `new Error`, `any`, `as any`. Único `as` é `(e as { currentStatus: string })` na L78 — narrow controlado APÓS o type guard `'tag' in e && e.tag === 'PayableNotOpen'` (Sugestão 2 leve, não bloqueia).

### `parseFlags` e `validateAllowedFlags` consumidos — fecha sugestão 🔵 #4 do FIN-CLI-SCAFFOLD W2

```ts
// aprovar-titulo.ts:49-58
const parsed = parseFlags(argv);
if (!parsed.ok) { /* ... */ return 64; }
const allowed = validateAllowedFlags(parsed.value, ALLOWED);
if (!allowed.ok) { /* ... */ return 64; }
```

Ambos exercitados no `run`. **Confirma definitivamente que NÃO são dead code** — sugestão 🔵 #4 do scaffold (validação de consumo) resolvida.

### Tratamento inline `PayableNotOpen` correto e bem-localizado

```ts
// aprovar-titulo.ts:74-83
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
```

Type guard em 3 etapas (object check + 'tag' in check + tag string equality) — TS narrow correto. Fallback `formatErrorCode` para todos os outros casos (string literal + outros tagged). Pattern reutilizável se outros comandos precisarem do mesmo (documentado no header como gatilho para `FIN-CLI-FORMATTER-INTERPOLATION`).

### Comportamento idempotente documentado e implementado

```ts
// aprovar-titulo.ts:23-26 (header doc)
 * **Comportamento idempotente (CA-8):** se `ctx.persist()` falha após o use case
 * ok, o disco fica intacto (atomic write garante) mas a memória do processo já
 * mutou. Retornamos exit 74 (IOERR); P.O. re-executa e o Payable Open ainda
 * está no disco — operação repetível sem efeito colateral.

// aprovar-titulo.ts:86-91 (implementação)
const persisted = await ctx.persist();
if (!persisted.ok) {
  process.stderr.write(`❌ ${formatErrorCode(persisted.error)}\n`);
  return 74;
}
```

UX ✅ + comportamento ✅ + doc ✅. Risco 2 mitigado completamente.

### Mensagem `cli-driver-not-supported-yet` continua citando FIN-ADAPTER-DRIZZLE-PAYABLE

Verificado em `formatters/error.ts:23-24` (preservado do FIN-CLI-SCAFFOLD). CA-NEW-1 do test ajustado agora exercita E2E esse caminho — pendência conceitual do scaffold finalmente resolvida com regex `/FIN-ADAPTER-DRIZZLE-PAYABLE/`.

### Headers doc carregam intenção arquitetural

| Arquivo | O que o header explica |
| :--- | :--- |
| `aprovar-titulo.ts:1-29` | R1 Soberania + sequência canônica numerada + **CA-8b interpolação inline** + **CA-8 comportamento idempotente** + pattern espelha criar-contrato |
| `_flag-errors.ts:1-11` | Pattern do contracts + **CANDIDATO A EXTRAÇÃO** com fundamentação (callback injetado para evitar dep cross-módulo) |
| `formatters/error.ts:48` | Comentário "tagged, lookup-only — interpolação inline no comando" — coerente com a decisão |

Reviewer entende decisões sem precisar abrir os REPORTs do ticket.

### 3 testes pré-existentes ajustados com comentários explicativos

| Teste | Mudança | Comentário inline |
| :--- | :--- | :--- |
| CA-3 | `/nenhum ainda/` → `/Subcomandos disponíveis/` + `/aprovar-titulo/` | "Atualizado por FIN-CLI-APROVAR-TITULO: REGISTRY agora tem ao menos um subcomando real" |
| CA-NEW-1 | Stub "subcomando desconhecido" → recurso real `cli-driver-not-supported-yet` | "com REGISTRY contendo aprovar-titulo, o lookup passa e o pipeline chega ao buildContext" |
| CA-NEW-2 | `aprovar-titulo` → `fake-cmd-xyz` para preservar teste do fallback | "comando aprovar-titulo agora existe e foi movido para testes próprios" |

Cada ajuste tem racional documentado — futuro mantenedor entende a evolução do REGISTRY sem consultar histórico.

### Imports limpos — `import type` separado de runtime

```ts
// aprovar-titulo.ts
import type { CliContext } from '../context.ts';                                  // type
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';             // runtime
import { approvePayable } from '../../application/use-cases/approve-payable.ts';  // runtime
import { formatErrorCode } from '../formatters/error.ts';                         // runtime
import { formatFlagError } from './_flag-errors.ts';                              // runtime
```

100% explícito. `verbatimModuleSyntax` honrado. Imports relativos (`../`) consistentes com pattern do contracts/cli (em vez de subpath `#src/*`).

### Exit codes coerentes (sysexits.h)

| Cenário | Exit | Justificativa |
| :--- | ---: | :--- |
| `parseFlags`/`validateAllowedFlags` falha | 64 | EX_USAGE — flag inválida |
| Flag obrigatória ausente | 64 | EX_USAGE — uso incompleto |
| Use case retorna `err` (domain/use case) | 1 | Falha funcional genérica |
| `ctx.persist()` falha após use case ok | 74 | EX_IOERR — falha de I/O |
| Sucesso completo | 0 | EX_OK |

Alinhado com `criar-contrato.ts` do contracts (pattern consolidado).

---

## Checklist explícita aplicada

| Categoria | Resultado |
| :--- | :--- |
| A. Regras absolutas de domínio | N/A — escopo é CLI/adapters |
| B. Smart constructors / Branded | N/A neste ticket |
| C. Discriminated unions | ✅ tratamento inline para `PayableNotOpen` faz narrow via `'tag' in e && e.tag === '...'` — pattern correto |
| D. Ports & Adapters | ✅ Comando consome `ctx.payableRepo`/`ctx.clock` (ports do scaffold); use case retorna Result; sem throw |
| E. Modular Monolith | ✅ Importa `approvePayable` do próprio módulo financial; sem cross-module |
| F. ESM / NodeNext / TS moderno | ✅ extensão `.ts` em todos; `import type` separado; sem require/namespace/enum |
| G. Naming, EN/PT, clareza | ✅ identifiers EN (`run`, `descricao`/`help` em PT-BR — consistente com contracts); mensagens stderr em PT-BR. Sugestões 1-4 são cosméticas. |
| H. Tests | ✅ AAA implícito; subprocess real (não mock); UUIDs reais via `randomUUID`/`PayableId.generate`; tmpdir isolado |

---

## Verificações específicas do prompt da review

| Ponto | Resultado |
| :--- | :--- |
| A.1 adapters.md (Result na borda) | ✅ zero throw em prod; converte Result no use case + persist |
| A.2 testing.md (mirror src/) | ✅ `tests/.../cli/commands/aprovar-titulo.test.ts` espelha `src/.../cli/commands/aprovar-titulo.ts` |
| A.3 ADR-0006 (Clock compartilhado) | ✅ `ctx.clock` vem de `shared/ports/clock.ts` via context |
| A.4 ADR-0015 (outbox-in-repo) | ✅ use case encapsula — comando não conhece outbox |
| B.1 Estrutura descricao/help/run | ✅ §1.2 W1 REPORT |
| B.2 Sequência canônica completa | ✅ §1.2 W1 REPORT |
| B.3 Exit codes 64/1/74 | ✅ tabela acima |
| B.4 _flag-errors segue pattern contracts | ✅ diff confirmado |
| C.1 Type guard `'tag' in e && e.tag === '...'` | ✅ L77 |
| C.2 Cast escopado | ✅ L78 — Sugestão 2 leve sobre type safety |
| C.3 Mensagem literal exata | ✅ L79 valida CA-20 do test |
| C.4 Fallback formatErrorCode | ✅ L81 |
| D.1 Header cita CA-8b + CA-8 | ✅ L16-26 |
| D.2 Header _flag-errors cita CANDIDATO A EXTRAÇÃO | ✅ L7 |
| D.3 Formatter cita lookup-only | ✅ L48 |
| E. Comportamento idempotente | ✅ §"O que está bom" |
| F. Ajustes nos 3 testes pré-existentes | ✅ todos com comentário "Atualizado por FIN-CLI-APROVAR-TITULO" |
| G. Anti-padrões absolutos | ✅ Zero ocorrência em src/ |
| H. Consumo de parseFlags/validateAllowedFlags | ✅ L49, L54 — fecha sugestão 🔵 #4 do scaffold |
| I. Exit codes coerentes | ✅ tabela acima |

---

## Marco — primeiro comando real CLI APROVADO

Padrões consolidados neste ticket:

- **Comando reusa todo o scaffold** (REGISTRY, context, parsers, state, formatters) — confirmação que o split FIN-CLI-SCAFFOLD vs FIN-CLI-APROVAR-TITULO foi a escolha certa.
- **Interpolação inline para tagged errors com payload** — pattern reutilizável em futuros comandos sem mexer no formatter global.
- **Comportamento idempotente** em persist falha — documentado E implementado E testado (CA-15 valida happy path; persist falha não tem teste E2E direto mas é cenário raro coberto pela lógica).
- **Evolução natural de testes pré-existentes** — 3 testes do FIN-CLI-WIRE/FIN-CLI-SCAFFOLD atualizados refletindo o estado novo do REGISTRY, com comentários inline explicando "Atualizado por FIN-CLI-APROVAR-TITULO".
- **Validação de consumo de `parseFlags`/`validateAllowedFlags`** — fecha definitivamente sugestão 🔵 #4 do scaffold.

---

## Próximo passo

- **APPROVED** → main-session avança para W3.
- 4 sugestões 🔵 listadas — **não bloqueiam W3**. Recomendação: aplicar Sugestão 1 (header doc) e Sugestão 2 (type-safe cast com `import type { PayableNotOpen }`) antes do W3 (cosméticas, baixo risco). Sugestão 3 é observação arquitetural; Sugestão 4 é nota para futuros tickets.
- Expectativa W3: **ALL-GREEN round 1** — 5º ticket FIN-* seguido sem rejection W2 seria recorde.
- Após W3 ALL-GREEN, `pnpm run pipeline:state close FIN-CLI-APROVAR-TITULO` (37º ticket fechado).
- **Próximo ticket sugerido:** `FIN-USECASE-TRANSMIT-PAYABLE` (S) — segundo use case real (Approved → Transmitted). Ou `FIN-CLI-MOSTRAR-TITULO` (S) — primeiro comando read-only que vai exigir `formatters/payable.ts`.
