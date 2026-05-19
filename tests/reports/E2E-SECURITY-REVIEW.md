# E2E Security & Robustness Review — CLI `contratos-cli`

**Reviewer:** Claude (security-reviewer skill, persona técnica)
**Skill base:** `~/Desktop/Projetos/dev/envolve/acdg/skills_base/security-reviewer/SKILL.md`
**Data:** 2026-05-15
**Versão da skill base:** módulo `modules/` está vazio; persona e workflow derivados do `SKILL.md`. O foco original da skill é OWASP AI Exchange (sistemas com LLM); como este CLI **não usa IA**, o threat model foi mapeado para classes equivalentes do OWASP Top 10 e CWE relevantes para CLIs com persistência local.

**Escopo:**

- Binário: `pnpm cli:contracts` (`src/modules/contracts/cli/main.ts`)
- Drivers: `memory` (default, JSON state) e `sqlite` (better-sqlite3 + drizzle); `mysql` é stub.
- Subcomandos: `criar-contrato`, `listar-contratos`, `mostrar-contrato`, `criar-aditivo`, `anexar-documento`, `homologar-aditivo`.
- **85 casos E2E** executados; runner em `tests/reports/e2e-scratch/run-e2e.sh`, saída integral em `tests/reports/e2e-scratch/output.log`.

**Distribuição de exit codes observada:**

| EXIT | Significado          | Casos |
| ---- | -------------------- | ----- |
| 0    | Sucesso              | 31    |
| 1    | Erro de negócio      | 19    |
| 64   | Uso inválido         | 25    |
| 70   | Erro interno         | 1     |
| 74   | I/O error            | 7     |
| **Total** |                | **83** medidos + 2 sem EXIT impresso (J concorrência) |

---

## Threat model resumido

| Categoria                            | Classe CWE / OWASP                       | Aplicabilidade neste CLI                                                                                                  |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Input não validado na borda          | CWE-20 / OWASP A03:2021 Injection        | argv → flags → use case. Validação ocorre em smart constructors do domínio; OK na maioria; ver Issue #1.                  |
| Untrusted boundary file              | CWE-20 / OWASP A08:2021 SW Integrity     | `loadState` lê JSON externo sem validar schema de domínio. **High.**                                                       |
| Uncaught exceptions / fail-soft      | CWE-755 / OWASP A05:2021 Misconfig       | `throw new Error('unreachable')` no exhaustive default — alcançável via state tampered. **High.**                          |
| Race / TOCTOU em state               | CWE-362 / CWE-367                        | `loadState` + `saveState` síncronos sem lock — concorrência perde dados.                                                  |
| Output sanitization (terminal)       | CWE-150 / OWASP A09:2021 Logging         | Campos texto renderizados verbatim — sequências ANSI injetam controle de terminal.                                        |
| Information disclosure               | CWE-209 / OWASP A04:2021 Insecure Design | Driver SQLite imprime mensagens nativas (better-sqlite3) em stderr antes da tradução.                                     |
| Path traversal                       | CWE-22                                   | `--state` e `--db` aceitam qualquer path. Risco depende do contexto (local user só → baixo).                              |
| SQL injection / Prototype pollution  | CWE-89 / CWE-1321                        | Não exploráveis: drizzle parametriza queries; UUID/format validators bloqueiam; JSON.parse moderno ignora `__proto__`.    |

---

## Issues — por severidade

### 🔴 Crítica

#### Issue #1 — `loadState` carrega entidades sem reconstrução via smart constructor (boundary I/O quebrada)

**Arquivos:**
- `src/modules/contracts/cli/state.ts:39-43` — `isSnapshot` só checa `Array.isArray`
- `src/modules/contracts/cli/state.ts:74-79` — `repo.save(c)` direto, sem revalidar invariantes

**Evidência (caso 76):**
```
ARGV: listar-contratos --state tests/reports/e2e-scratch/state-tamper.json
----------------------------------------------------------
1 contrato(s):
❌ Erro inesperado: Error: unreachable: "PWNED"
EXIT=1
```
O state file foi adulterado com `"status": "PWNED"`. O `loadState` injetou o contrato no repo InMemory **sem reconstruir via smart constructor**; ao formatar com `formatStatus`, o exhaustive switch caiu no `default` e disparou `throw`.

**Impacto:**
- Invariantes do domínio (status ∈ enum, UUID válido, value ≥ 0, datas coerentes) podem ser violados **silenciosamente** durante carga e só explodir em runtime distante (qualquer caller de `formatStatus`, regras de domínio que usem exhaustive switch sobre `status`, etc.).
- Saída parcial (`"1 contrato(s):"`) é impressa **antes** do crash, deixando o consumidor de pipeline com output corrompido e exit `1` ambíguo.
- Crash via `process.exit(1)` no handler de erro em `main.ts:106`, não pelo fluxo `Result<T,E>`. Viola a regra _"Result everywhere — errores são valores, não exceções"_ do `CLAUDE.md` raiz.

**Recomendação:**
1. Em `loadState`, mapear cada `Contract`/`Amendment` carregado por smart constructor (`Contract(rawDto)` retornando `Result<Contract, ContractError>`). Falhar com erro novo `state-entity-invalid` (categoria `StateError`).
2. Validar campos críticos no schema check (`isSnapshot`): pelo menos `status ∈ {'Active','Expired','Terminated'}`, `id` como UUID v4, `originalValue.cents >= 0`.
3. Tratar arquivo state como **untrusted input** equivalente a request body em API — mesma rigidez de validação que `application/use-cases/*` aplicam em entrada de comando.

---

#### Issue #2 — `throw new Error("unreachable: …")` quebra "Zero throw" e é alcançável

**Arquivos (alcançáveis via input malicioso ou bug de evolução):**
- `src/modules/contracts/cli/main.ts:50` — `exitCodeForContextError` default
- `src/modules/contracts/cli/commands/criar-aditivo.ts:64` — `buildCommand` default
- Já documentado pelo Gemini em `tests/reports/REVIEW.md` (Issue 1) para domínio.

**Evidência:** Issue #1 já demonstrou que um throw `unreachable` é alcançado em prática quando o state file é adulterado. O `try { … } finally { ctx.shutdown(); }` no `main.ts:94-98` **não** trata o throw — ele propaga para o handler global `main().then(_, e => process.exit(1))` que printa `❌ Erro inesperado: Error: unreachable: "PWNED"`.

**Impacto:**
- Stack/string interna leaka para stderr (`unreachable: "PWNED"` revela detalhe interno).
- Exit code `1` (genérico) — perde diferenciação semântica (sysexits.h).
- Viola regra absoluta de `CLAUDE.md`.

**Recomendação:** substituir `throw` por retorno do `_exhaustive: never` (o compilador TS já garante exaustividade em build time; não é necessário runtime check). Quando absolutamente preciso, devolver `Result<never, 'state-entity-invalid'>` com código rastreável.

---

### 🟠 Alta

#### Issue #3 — Race condition no `saveState` (perda silenciosa de dados)

**Arquivo:** `src/modules/contracts/cli/state.ts:83-98`

**Evidência (seção J do runner):**
```
###### J. CONCORRENCIA — DOIS PROCESSOS GRAVAM NO MESMO STATE ######
Resultado concorrência: PID1=0 PID2=0
Contratos no state final:
["602/2026"]
```
Dois processos do CLI criando contratos diferentes simultaneamente no mesmo `--state` resultaram em **um único contrato persistido**. Ambos retornaram EXIT=0; nenhum foi avisado da perda.

**Causa:** `loadState` faz read síncrono → modifica repo in-memory → `saveState` faz `writeFileSync` direto. Sem lock, atomic-rename, ou checksum/versão.

**Impacto:**
- Em automação (cron jobs, pipelines paralelos) ou cenário multiusuário, dados são perdidos sem feedback.
- A regra do `CLAUDE.md` raiz "Validate at system boundaries" não é só sobre conteúdo — concorrência em estado externo é boundary igualmente crítica.

**Recomendações (qualquer uma):**
1. `writeFileSync` para `path + ".tmp"` + `renameSync` atômico (POSIX rename é atômico no mesmo FS).
2. Lock via `flock` ou arquivo `.lock` com PID + timeout.
3. Versão no snapshot (`{ schemaVersion, savedAt, ... }`) + optimistic check: relê arquivo antes de gravar, falha com `state-stale-concurrent-write` se mudou.
4. Documentar explicitamente: "driver memory não é seguro para concorrência; use sqlite".

---

#### Issue #4 — ANSI escape / terminal hijacking via campos texto

**Arquivos:**
- `src/modules/contracts/cli/formatters/contract.ts:7-23`
- `src/modules/contracts/cli/formatters/amendment.ts` (renderização similar)

**Evidência (caso 85):**
```
ARGV: criar-contrato --numero 502/2026 --titulo $'a\tb\nc\r\E[31mRED' --objetivo y …
✅ Contrato criado.
Contrato 502/2026
  Título: a	b
c[31mRED
```
A escape `\r\033[31m` foi escrita verbatim para stdout. O `\r` reposiciona o cursor no início da linha — efetivamente sobrescrevendo o output do CLI. Em terminais reais (não no log capturado aqui) renderiza em vermelho. Combinado com `\x1b[2K`, um atacante que controla o `--titulo` pode **apagar e reescrever linhas** da saída — inclusive falsificar mensagens de sucesso/erro de processos subsequentes.

**Impacto:**
- Atacante interno (ou via supply chain do CSV/API de origem dos dados) injeta sequências que mascaram operações em SSH/CI logs.
- Combinado com Issue #1 (state injection), persistido → renderizado em qualquer `listar-contratos` futuro de qualquer usuário.

**Recomendação:**
1. Em renderização, escapar/strip chars de controle (`\x00-\x1f` exceto `\n` opcional, `\x7f`, sequência CSI).
2. Considerar flag `--json` para saída estruturada destinada a pipelines (evita formatadores de string que dependem de sanitização).
3. Validar no smart constructor de `Title`/`Objective` se chars de controle são proibidos — depende da política do produto, mas hoje aceitam-se livremente.

---

### 🟡 Média

#### Issue #5 — Driver SQLite vaza mensagens nativas para stderr antes da tradução

**Evidência (casos 67–68):**
```
ARGV: listar-contratos --driver sqlite --db tests/reports/e2e-scratch/dir-as-state
[sqlite-driver:open] SqliteError: unable to open database file
❌ Não foi possível abrir o arquivo SQLite.
EXIT=74

ARGV: listar-contratos --driver sqlite --db tests/reports/e2e-scratch/db-junk.sqlite
[sqlite-driver:pragma] SqliteError: file is not a database
❌ Falha ao configurar PRAGMAs no SQLite.
EXIT=74
```
Há um `console.error` (ou `process.stderr.write`) em `src/modules/contracts/adapters/persistence/drivers/sqlite-driver.ts` que imprime detalhes da exceção da lib `better-sqlite3` antes de o adapter mapear para `Result<_, SqliteDriverError>`.

**Impacto:**
- Information disclosure: mensagens da lib expõem que o backend é better-sqlite3, ajudam fingerprinting de versão.
- Inconsistente com a regra "_`try/catch` → Result_" — o catch deveria silenciar a mensagem nativa ou loggar só em modo verbose.

**Recomendação:** remover o log direto do driver; manter apenas a tradução pela `formatErrorCode`. Se debug for útil, gatear com env `DEBUG=contracts-cli:*`.

---

#### Issue #6 — Parser exige `<subcomando>` em `argv[0]`; flags globais antes do subcomando viram "subcomando desconhecido"

**Arquivo:** `src/modules/contracts/cli/main.ts:63-74`

**Evidência (caso 23):**
```
ARGV: --driver sqlite listar-contratos
❌ Subcomando desconhecido: --driver
EXIT=64
```

**Impacto:**
- O texto do `--help` diz `contratos-cli <subcomando> [flags] [--driver memory|sqlite|mysql] [...]` — ordem implícita, não explícita. Usuários acostumados a CLIs Unix esperam que `--driver` seja posicionalmente livre. Risco: operador executa **em memory** achando que está em **sqlite** e perde dados quando `--no-state` for o default implícito.
- Sem mitigation de segurança imediato, mas é trap de UX que pode escalar para incidente operacional.

**Recomendação:**
1. Re-arrumar `main.ts` para fazer `parseDriverFlags` em todo `rawArgv` **antes** de extrair o subcomando, ou
2. Atualizar help para grafar `[--driver …] <subcomando> [flags do subcomando]` e rejeitar explicitamente flags globais fora de ordem com mensagem clara.

---

#### Issue #7 — Aditivo de Supressão aceito mesmo excedendo valor vigente do contrato

**Arquivo:** `src/modules/contracts/application/use-cases/create-amendment.ts` (regra de coerência ausente para `Suppression` em status Pendente)

**Evidência (caso 52):**
```
ARGV: criar-aditivo --contrato … --numero AD-SUP --descricao x --tipo Suppression --valor-centavos 999999999999
✅ Aditivo criado em status Pendente.
Aditivo AD-SUP
  Valor de impacto: R$ 9.999.999.999,99
```
Contrato pai vale R$ 105.000 (após Aditivo Addition homologado anterior). Aditivo de Supressão de R$ 9,9 bi é criado normalmente em estado Pendente. A regra `contract-value-would-go-negative` só dispara na homologação.

**Impacto:**
- Defesa em profundidade: validar cedo evita poluir o state/banco com aditivos absurdos que jamais homologarão.
- Carga útil em ataques de DoS de UX (encher listagem com lixo Pendente).

**Recomendação:** no `createAmendment`, ao receber `Suppression`, ler o `currentValue` do contrato e validar `impactValueCents <= currentValue.cents`. Adicionar erro `amendment-suppression-exceeds-current-value`.

---

### 🔵 Baixa / Informativa

#### Issue #8 — `--help` escreve em **stderr**

**Arquivo:** `src/modules/contracts/cli/main.ts:7-25` — `printUsage` usa `process.stderr.write`.

**Impacto:** quando usuário pede `--help` explicitamente, exit é 0 mas saída vai para stderr. Quebra `cli --help | less` em shells que separam stderr. Convenção POSIX/GNU: `--help` solicitado → stdout. `--help` implícito por uso errado → stderr.

**Recomendação:** dual-path — `printUsage(stream)`; stdout quando exit 0, stderr quando exit 64.

---

#### Issue #9 — Flag duplicada silenciosamente sobrescrita

**Arquivo:** `src/modules/contracts/cli/parse-flags.ts:6-26` — `out[name] = value` sobrescreve

**Evidência (caso 79):** `--numero 300/2026 --numero 999/2026` cria com `999/2026`, sem warning.

**Recomendação:** detectar `name in out` e emitir warning (não bloquear). Ataques de scripting/CI podem reinjetar flags duplicadas para alterar transação silenciosamente.

---

#### Issue #10 — Flag desconhecida cai em `rest` silenciosamente

**Arquivo:** `src/modules/contracts/cli/parse-driver-flags.ts:87` — `rest.push(token)` para qualquer `--xyz`.

**Evidência (caso 21):** `listar-contratos --xyz=1` executa sem aviso.

**Impacto:** typo de operador (`--no-stat` em vez de `--no-state`) não detectado → grava em arquivo default. Recomendação: warning ou flag `--strict-flags`.

---

#### Issue #11 — Path traversal aceito em `--state` / `--db`

**Evidência (caso 62):** `--state .../../e2e-scratch/state-traversal.json` aceito.

**Impacto:** baixo no contexto atual (CLI roda com privilégios do usuário; usuário pode escrever onde quiser). **Mas:** se o binário vier a ser invocado de wrapper privilegiado/SaaS, sobe para crítico. Documentar suposição de threat model.

---

## Observações positivas

1. **SQL injection bloqueado por validação de domínio antes da query** — casos 47, 69, 70: payloads como `'; DROP TABLE contracts; --` são rejeitados pelo validator de UUID v4 e pelo formato `XXX/AAAA` **antes** de chegarem ao drizzle. Defesa em profundidade combinada (input validation + ORM parametrizado).
2. **Prototype pollution via JSON.parse não funciona** — caso 78: `{"__proto__": {"polluted": true}}` no state file não polui o protótipo global em Node v24 (JSON.parse moderno trata `__proto__` como chave literal, não setter).
3. **JSON injection no campo `objetivo` é serializada/escapada corretamente** — casos 73–75: payload `{"id":"hijacked"}` no `objetivo` vira string escapada `"{\"id\":\"hijacked\"}"` no state file; round-trip recarrega sem alterar estrutura.
4. **Validação de domínio robusta** — datas inválidas, valor negativo, decimal, `Infinity`/`1e1000`, acima de `MAX_SAFE_INTEGER`, formato sequencial errado, fim antes de início, duplicidade de número sequencial — todos rejeitados com mensagens traduzidas (`formatErrorCode`).
5. **Idempotência negativa correta** — caso 54: tentar homologar aditivo já homologado retorna `amendment-not-pending` (EXIT=1), sem efeito colateral.
6. **SQLite constraint funciona** — caso 65: duplicidade de `sequentialNumber` rejeitada pelo domínio antes do INSERT.
7. **Unicode/emoji renderizam** — caso 84: títulos com `🎉 ção ñ ç π Ω` preservados no round-trip JSON.
8. **`--no-state` é genuinamente efêmero** — caso 61: cria + lista funcionam in-memory sem tocar arquivo.

---

## Recomendações prioritárias (ordem de execução)

1. **[High] Corrigir Issue #1 e #2 juntos:** `loadState` valida via smart constructors; `state.ts` ganha erros `state-entity-invalid`; remover `throw` em todos `_exhaustive: never` (somente compile-time check).
2. **[High] Corrigir Issue #3:** `saveState` faz tmp+rename atômico, no mínimo. Adicionar caso de teste E2E concorrente em `tests/`.
3. **[Med] Corrigir Issue #4:** strip de chars de controle em todos formatters; opcionalmente smart constructor de `Title`/`Objective` rejeita controles.
4. **[Med] Corrigir Issue #5:** remover stderr direto do `sqlite-driver`; manter Result mapping.
5. **[Med] Corrigir Issue #6 e #7:** reordenar parsing de driver flags ou tornar erro explícito; adicionar validação cedo de Supressão.
6. **[Low] Issues #8–#11:** UX e defesa em profundidade — agrupar em ticket único.

---

## Artefatos gerados

| Arquivo                                              | Conteúdo                                         |
| ---------------------------------------------------- | ------------------------------------------------ |
| `tests/reports/e2e-scratch/run-e2e.sh`               | Runner bash com 85 casos E2E parametrizados      |
| `tests/reports/e2e-scratch/output.log`               | Saída integral (stdout+stderr) de todos casos    |
| `tests/reports/e2e-scratch/state-tamper.json`        | Snapshot tampered usado em Issue #1              |
| `tests/reports/e2e-scratch/state-inj.json`           | Round-trip de JSON injection (caso 74–75)        |
| `tests/reports/e2e-scratch/state-cc.json`            | State final pós-concorrência (Issue #3)          |
| `tests/reports/e2e-scratch/db-e2e.sqlite`            | SQLite gerado nos casos 63–70                    |

Para reproduzir:
```bash
bash tests/reports/e2e-scratch/run-e2e.sh > tests/reports/e2e-scratch/output.log 2>&1
```

---

## Veredito

**REJECTED para shipping em ambiente multiusuário/automatizado** — Issues #1, #2 e #3 violam regras absolutas (`CLAUDE.md` raiz: zero `throw`, Result everywhere, validation at boundaries) e produzem perda silenciosa de dados em concorrência.

**Para uso single-user/local interativo:** funcional. Os bloqueios concentram-se em borda I/O (state file untrusted, concorrência) e em saídas para terminal/log (ANSI). O núcleo de domínio + use cases segue robusto e bem testado pelos sad-paths.
