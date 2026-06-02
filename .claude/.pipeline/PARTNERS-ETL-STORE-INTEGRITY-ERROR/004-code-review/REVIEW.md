# Code Review — Ticket PARTNERS-ETL-STORE-INTEGRITY-ERROR — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-02
**Escopo revisado:**

- `src/modules/partners/adapters/persistence/repos/partners-etl-store.drizzle.ts` (foco: `describeCause`, `log`, `dupEntryIndexName`, `classifyProvisionError`, `runProvision`)
- `src/modules/partners/application/ports/legacy-entity-store.ts` (union `PartnersEtlStoreError`)
- `src/modules/partners/public-api/etl.ts` (re-export do tipo)
- `src/modules/partners/adapters/persistence/schemas/mysql.ts` (nomes dos índices UNIQUE — confirmação)
- `tests/modules/partners/adapters/persistence/repos/partners-etl-store-classify.test.ts` (11 unit)
- `tests/modules/partners/public-api/partners-etl-store-error-contract.test.ts` (contrato)
- `tests/modules/partners/public-api/partners-etl-store-integrity.integration.test.ts` (gated `MYSQL_INTEGRATION=1`)

**Gate read-only executado:** `pnpm run lint` → zero problemas (verde). `pnpm run typecheck`/`pnpm test` são W3 (não re-rodados aqui), mas o W1 REPORT já os documenta verdes e o lint type-checked confirma ausência de erro de tipo no diff.

---

## Auditoria por eixo (do request da W2)

### Eixo 1 — Correção do classificador ✅

`classifyProvisionError` (`partners-etl-store.drizzle.ts:96-107`) distingue corretamente os 3 casos:

- `indexName === legacyIdIndex` → `'already-exists'` (linha 102) — idempotência.
- `indexName.startsWith('par_') && indexName.endsWith('_idx')` → `'integrity-violation'` (linha 105) — UNIQUE secundária de dado.
- `indexName === null` ou `PRIMARY` (não casa o prefixo/sufixo `par_*_idx`) → `'unavailable'` (linhas 101, 106) — conservador.

**Extração via regex `for key '([^']+)'`** (`dupEntryIndexName:84`): robusta. `[^']+` é não-guloso por delimitação de aspas simples e captura o nome do índice exatamente como o MySQL emite (`Duplicate entry 'X' for key 'NOME'`). O guard `obj['errno'] === 1062` (linha 83) garante que só `ER_DUP_ENTRY` chega ao regex; outros errnos retornam `null` antes.

**`.cause` aninhado** (`dupEntryIndexName:77-78`): trata o `DrizzleQueryError` corretamente — monta `candidates = [cause, cause.cause]` e itera, então reconhece o `1062` tanto no erro direto quanto embrulhado. Confirmado pelos testes `:56`, `:94`.

> Observação fina (não-issue): os nomes de índice no classificador batem 1:1 com o schema (`mysql.ts:60,62,121,123,184,185,187,217,219`). Os 5 índices secundários citados no request (`par_suppliers_cnpj_idx`, `par_financiers_cnpj_idx`, `par_collaborators_cpf_idx`, `par_collaborators_email_idx`, `par_user_profiles_cpf_idx`) existem e casam o predicado `par_*_idx`. Sólido.

### Eixo 2 — Idempotência preservada (CRÍTICO) ✅

O caminho `already-exists` NÃO regrediu:

- `classifyProvisionError` retorna `'already-exists'` **somente** quando o índice é exatamente o `legacyIdIndex` daquela entidade (linha 102), e cada `provision` passa o índice correto (`:168`, `:202`, `:236`, `:270`).
- `runProvision` mapeia `'already-exists'` → `ok('already-exists')` (linha 132), idêntico ao no-op por SELECT FOR UPDATE no corpo da transação (`:176-178`).
- **SELECT-then-INSERT (ADR-0020) intacto:** o corpo de cada `provision` mantém `SELECT ... FOR UPDATE` → `if existing → already-exists` → `INSERT` (`:171-183`). Sem `ON DUPLICATE KEY UPDATE`, sem UPSERT. O `1062` por corrida no `legacy_id_idx` continua absorvido como `already-exists` via classificador.

### Eixo 3 — PII-free no Result (CRÍTICO) ✅

O `Result` que cruza a borda carrega **apenas literais kebab-case fixos**: `runProvision:135` retorna `err('partners-etl-store-integrity-violation')` e `:138` `err('partners-etl-store-unavailable')`. Nenhum caminho injeta `sqlMessage`/valor duplicado no `Result`. `ProvisionErrorClass` (linha 73) é uma string-union literal, jamais o valor.

O valor duplicado (PII) aparece **só** em `log(ctx, cause)` → `process.stderr` (`:68`), efêmero e não versionável, exatamente como o request exige. Fixado pelo teste `:132-141` (`klass.includes(pii) === false`).

### Eixo 4 — `log()` com `.cause` ✅

`log` (`:61-69`) anexa `| cause: ${describeCause(cause.cause)}` quando `cause instanceof Error && cause.cause !== undefined` (`:64-67`), preservando o errno/sqlMessage real do mysql2 embrulhado pelo `DrizzleQueryError`. `describeCause` (`:39-59`) extrai `errno`/`code`/`sqlMessage` com `typeof` guards (`:46-48`) — **não** faz `String(objeto)` direto, então não dispara `no-base-to-string` (lint verde confirma). Fallback `JSON.stringify` para objetos, `String` para primitivos. Sem vazamento de PII além do stderr.

### Eixo 5 — ADR-0006 (contrato aditivo, sem cross-módulo) ✅

- A union `PartnersEtlStoreError` (`legacy-entity-store.ts:12-14`) ganhou o membro **aditivamente** — consumidores existentes que tratam `'partners-etl-store-unavailable'` não quebram. Sem `switch` exaustivo sobre o tipo em `src/` (confirmado no W0 REPORT blast-radius).
- Re-export pela public-api intacto (`public-api/etl.ts:27-31`) — o tipo de erro continua parte do contrato.
- **Sem import cross-módulo:** o store importa só de `partners/*`, `shared/*`, `drizzle-orm`, `node:process`. Nenhum `fin_*`/outro módulo. ADR-0014 OK.

### Eixo 6 — Estilo/lint estrito ✅

- `cause: unknown` + narrowing por guard antes de qualquer acesso (`describeCause:40`, `dupEntryIndexName:80`). Sem `any`.
- Dois `as` (`:41` `cause as unknown as Record<string, unknown>`, `:81` `c as Record<string, unknown>`) — ambos narrowing de `unknown` **após** guard (`instanceof Error`/`typeof object`), padrão aceito para inspeção de erro opaco. Justificados pelo comentário de contexto da função.
- `import type` em imports puramente de tipo (`:16-21`, `:27-30`); extensões `.ts` em todos os relativos. `verbatimModuleSyntax` respeitado.
- **Switch exaustivo** em `runProvision` (`:130-139`) sobre `ProvisionErrorClass`: os 3 casos cobertos; sem `default` (ESLint `switch-exhaustiveness-check` enforça e passou verde) — preferível ao `const _: never` redundante quando a regra de lint já garante exaustividade. Aceito.
- Sem `class`/`throw` cruzando a borda: os 4 `throw` (`:164,198,232,266`) são pré-existentes (não tocados por este ticket), estão dentro de `safe(...)` que os captura no `try/catch` e converte para `Result` (`safe:113-118`) — conforme `.claude/rules/adapters.md`.

### Eixo 7 — Cobertura dos testes ✅

Os 11 unit (`partners-etl-store-classify.test.ts`) cobrem os casos-limite exigidos:

- legacy_id direto → already-exists (`:47`) e aninhado em `.cause` (`:56`);
- UNIQUE secundária cnpj/cpf/email das 4 entidades → integrity-violation (`:67,78,86,94,102`);
- não-1062 (ECONNRESET) → unavailable (`:110`);
- `PRIMARY` → unavailable (`:121`);
- erro opaco (string sem errno) → unavailable (`:127`);
- PII-free explícito (`:132`).

AAA presente (comentários Arrange/Act/Assert nos casos-âncora). Contrato (`error-contract.test.ts`) fixa o membro novo via `satisfies` (canal typecheck). Integração gated `MYSQL_INTEGRATION=1` espelha `partners-etl-port.integration.test.ts`, cobre os 3 cenários end-to-end (cnpj dup, cpf dup, idempotência por legacy_id) e foi adicionada ao script `test:integration:partners` (evita órfão/falso-verde).

---

## O que está bom

- **Separação classificador puro × efeito (log/Result):** `classifyProvisionError` é pura, exportada e 100% testável sem MySQL — exatamente o que torna o "Achado 2" verificável por unit.
- **Conservadorismo correto:** `PRIMARY` e índice não-reconhecível caem em `unavailable`, não em `integrity-violation`. Evita falso-positivo de "dado ruim" para colisões de PK (que indicam bug de geração de id, não dado do legado).
- **PII tratada com disciplina:** valor duplicado isolado no stderr; reason cross-borda é literal fixo. Bem fixado por teste.
- **Diff aditivo e mínimo (YAGNI):** union ganhou 1 membro; lógica do catch extraída sem alterar o caminho feliz nem a idempotência.

---

## Issues encontradas

Nenhuma issue 🔴 crítica, 🟡 importante ou 🔵 sugestão bloqueante. (Os `throw`/`as` discutidos acima são pré-existentes, justificados e fora do escopo do diff.)

---

## Próximo passo

- **APPROVED.** Pipeline pode avançar para **W3 (QUALITY)** — `pnpm run typecheck && pnpm run format:check && pnpm test && pnpm run lint` — após checkpoint humano.
- Pendência funcional (não bloqueia W2/W3 unit): **CA6** exige prova com Docker ON via `pnpm run test:integration:partners` (`MYSQL_INTEGRATION=1`), conforme W1 REPORT §Pendente. Recomenda-se rodar antes de fechar o ticket, dado o histórico de gate de integração que skipa silencioso (lição `project-test-integration-auth-gap`).
