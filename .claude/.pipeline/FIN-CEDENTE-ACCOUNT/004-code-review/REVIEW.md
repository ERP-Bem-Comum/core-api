# Code Review — FIN-CEDENTE-ACCOUNT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-06-18T12:59Z · **Branch:** `016-fin-remessa-cnab240`

**Escopo revisado (read-only):**

- `src/modules/financial/domain/cedente/{cedente-account-id,types,cedente-account}.ts`
- `src/modules/financial/application/ports/cedente-account-store.ts`
- `src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts`
- `tests/modules/financial/domain/cedente/cedente-account.test.ts`
- `tests/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.test.ts`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma. Sem `throw`/`class`/`this`/`any`; port é `type Readonly<{...}>`; adapter retorna `Result`
(sem `throw`); sem cross-módulo; `tsc` e `lint` já verdes (W1).

### 🟡 Importante (não-bloqueia)

Nenhuma.

### 🔵 Sugestão (estilo / clareza)

1. **`create` valida só não-vazio** em `document` (CNPJ), `agency`, `accountNumber`, `bankCode`. Uma
   validação de **formato de CNPJ** (14 dígitos) e de `bankCode` poderia entrar quando a fatia
   `*-PERSIST` / a remessa (016) precisar — por ora, não-vazio é suficiente para a fundação. `accountDigit`/
   `convenio` aceitam vazio (alguns layouts não têm dígito) — OK.
2. **`nextNsa`** existe como campo, mas a **alocação** (incremento monotônico) é da remessa (016) e não
   deste ticket — correto não implementar aqui.

---

## Verificação por categoria

| Cat | Item | Resultado |
| :-- | :-- | :-- |
| A | sem `throw`/`class`/`any`; `Readonly`/imutável; return types explícitos; guard-clauses puras | ✅ |
| B | `CedenteAccountId` branded + smart constructor (`rehydrate`→`Result`); `create` retorna `Result`; erros string-literal EN | ✅ |
| D | port `type Readonly<{...}>`; adapter in-memory `async`+`Promise.resolve(ok(...))` (espelha `supplier-view-store`); erro `<store>-unavailable` | ✅ |
| E | `domain/cedente` importa só `shared/`; `ports` importa `domain` (próprio módulo); adapter importa `domain`+`ports`; sem cross-módulo | ✅ |
| F | imports `.ts`; `import type`; sem `require`/`enum`/`namespace`; `tsc` verde | ✅ |
| G | identificadores EN; enums EN (C1: `Active`/`Closed`); erros EN kebab-case; factory `createInMemoryX` (padrão da casa) | ✅ |
| H | testes com builders (`validInput`/`buildAccount`), ids reais; asserções de regra (defaults, erros, save/findById/null) | ✅ |

---

## O que está bom

- `close`/`isClosed` entregam o alicerce do guard **FR-015** (conta encerrada) da conciliação.
- Pureza total: guard-clauses + `Result`, sem `throw`/`class`; cópias imutáveis.
- Adapter in-memory fiel ao padrão `supplier-view-store.in-memory.ts` (factory + `async`).
- Fatiamento correto: domínio + port + in-memory **sem DB** — destrava a lógica da 017 sem Docker; o
  schema/migration fica na fatia `*-PERSIST`.

## Próximo passo

**APPROVED (round 1).** Avançar para **W3** (`ts-quality-checker`). 🔵 não-bloqueantes (validação de
formato de CNPJ/`bankCode` quando a remessa/persistência exigir).
