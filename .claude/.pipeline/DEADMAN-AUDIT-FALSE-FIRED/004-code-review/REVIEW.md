# Code Review — DEADMAN-AUDIT-FALSE-FIRED — Round 1

**Veredito:** **REJECTED**

**Reviewer:** `code-reviewer` (read-only)
**Data:** 2026-07-28T12:50Z
**Escopo revisado:**

- `scripts/ci/deadman-audit.ts` (novo)
- `tests/scripts/deadman-audit.test.ts` (novo)
- `.github/workflows/deadman-audit.yml` (`:52-114` reescrito)
- Cruzado contra: `handbook/infrastructure/07-deadman-switch-data-contracts.md` §3, `handbook/architecture/adr/0042-deadman-switch-redundant.md`, `tools/deadman-emitter/ping.go`, `.github/workflows/deadman-ingest.yml`

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

#### Issue 1 — `.github/workflows/deadman-audit.yml:102-106` · campo `last_seen` sumiu do `audit.jsonl`

**Categoria:** contrato de dados documentado (handbook — nível 2 da hierarquia, vence código)

O contrato normativo em `handbook/infrastructure/07-deadman-switch-data-contracts.md:75` declara:

> \| `last_seen` \| string \| `max(ts)` entre `status.jsonl` (S3) e `history.jsonl` (repo) para o `emitter` \|

E o exemplo canônico (`:68`):

```jsonc
{"v":1,"run_at":"…","emitter":"sweeper-vps-qa","last_seen":"2026-06-16T04:05:00.000Z","age_h":20.0,"status":"alive","merged":1,"threshold_days":3}
```

O `jq` do W1 grava **sem** `last_seen`:

```
{v:2, run_at:$run, emitter:$em, status:$st, age_h:$age, threshold_days:$th, merged:$m}
```

**Por que importa (não é purismo):** `age_h` sozinho é relativo ao `run_at` — sem `last_seen` não dá para reconstruir *quando* foi o último sinal olhando uma linha do log, que é exatamente o uso forense do `audit.jsonl`. E some justo no registro `bootstrap`, onde o diagnóstico ("nunca sinalizou") é o dado mais importante.

**Causa-raiz:** o defeito nasce no `EmitterVerdict` — ele não carrega `lastSeen`, então o YAML não tem de onde tirar. O fix é no tipo, não no `jq`.

**Fix sugerido:** acrescentar `readonly lastSeen: string | null` ao `EmitterVerdict` (`null` em bootstrap, espelhando `ageHours`), propagá-lo em `auditEmitters`, e voltar a gravá-lo no `jq`. Precisa de teste novo no W0 — hoje nenhum `it()` cobre `lastSeen`.

---

#### Issue 2 — `scripts/ci/deadman-audit.ts:20` · `status` diverge do enum documentado

**Categoria:** contrato de dados documentado

`07-deadman-switch-data-contracts.md:77` declara:

> \| `status` \| enum \| `"alive"` \| `"DEAD"` \|

A implementação usa `type AuditStatus = 'alive' | 'dead' | 'bootstrap'`. **Duas divergências:**

1. **`dead` minúsculo vs `DEAD`.** Divergência gratuita — nenhum ganho, e quebra qualquer consumidor que compare com o valor documentado. Os registros `v:1` já gravados no `deadman/audit.jsonl` usam `"DEAD"`; o arquivo passa a misturar os dois grafismos para o mesmo conceito.
2. **`bootstrap` não existe no contrato.** É a essência deste ticket e **deve** existir — mas um valor de enum novo num contrato documentado exige **atualizar o contrato**, não introduzi-lo silenciosamente.

**Fix sugerido:** escolher um dos dois caminhos e ser explícito:

- **(a)** manter `'alive' | 'dead' | 'bootstrap'` no código **e atualizar** `07-deadman-switch-data-contracts.md` §3 — tabela de campos, exemplos, e nota de que `v:2` grafa em minúsculas e admite `bootstrap`; ou
- **(b)** emitir `"DEAD"` no JSONL preservando `'dead'` no tipo interno (mapeamento na borda), e ainda assim documentar `bootstrap`.

Em qualquer caso o handbook **tem** de ser tocado no mesmo ticket — é o §3 que descreve o arquivo que este ticket reescreve. O `000-request.md` não previu isso; é escopo legítimo, não scope-creep.

---

### 🟡 Importante (não bloqueia, registrar)

#### Issue 3 — `.github/workflows/deadman-audit.yml:89-98` · falha no alerta derruba o keep-alive

Remover o `|| true` do `gh issue create` está **certo** (ADR-0011, e é CA do ticket). Mas com `set -euo pipefail`, uma falha do `gh` (rate limit, outage, permissão) mata o step **antes** de `git add`/`commit`/`push` (`:112-114`) — e o commit de auditoria é o **keep-alive** contra a suspensão de 60 dias (`07-deadman-switch-data-contracts.md:82-84`).

Ironia do modo de falha: uma falha ao *alertar* que o emissor morreu enfraquece o mecanismo que mantém o próprio auditor vivo.

**Impacto real: baixo** — perde-se uma execução, a próxima tenta de novo (o dedup não registra, porque a gravação vem depois do alerta — ordem correta). Suspensão exigiria 60 dias seguidos falhando. Por isso 🟡, não 🔴.

**Fix sugerido:** coletar as falhas de alerta numa flag dentro do loop, sempre executar audit + commit + push, e `exit 1` **no fim** do step. Falha visível **e** keep-alive preservado — sem reintroduzir `|| true`.

#### Issue 4 — `.github/workflows/deadman-audit.yml:113` · `git commit` aborta se não houver emissor

Se `emitters.json` tiver `emitters: []`, o `while` não itera, nada é appendado, e `git commit` sai diferente de zero (*nothing to commit*) → `set -e` mata o step. Hoje há 1 emissor, então é latente.

Colide com `07-deadman-switch-data-contracts.md:82`: *"**Toda execução do Auditor escreve uma linha** (mesmo `alive`, mesmo sem ping novo) e **commita**"*.

**Fix sugerido:** `git diff --staged --quiet || git commit …`, ou `--allow-empty` no commit de keep-alive.

---

### 🔵 Sugestão

#### Issue 5 — `tests/scripts/deadman-audit.test.ts` · entrypoint CLI sem cobertura

Os 14 `it()` cobrem só as funções puras. O bloco `:160-186` do script (parsing de `argv`, `readOrEmpty`, montagem do JSON) — que é **o que o workflow executa** — não tem teste. Foi validado à mão no W1, o que não sobrevive a um refactor.

Barato de fechar: um `it()` com `execFileSync` sobre o script apontando para fixtures temporários, no molde de `tests/scripts/test-integration-auth-script.test.ts`.

#### Issue 6 — `tests/scripts/deadman-audit.test.ts:196` · asserção de workflow é frágil

`!/^\s*status=DEAD\s*(#.*)?$/m` casa a forma exata de hoje. `status="DEAD"`, `status=DEAD;` ou `STATUS=DEAD` passariam. Aceitável para asserção de estrutura sobre texto (mesmo grau de `semgrep-workflow.test.ts`), mas vale um comentário registrando o limite, para não dar falsa sensação de proteção.

#### Issue 7 — `scripts/ci/deadman-audit.ts:82` · precisão de `age_h`

`Math.floor` produz inteiro; o contrato (`:76`) diz `number` e exemplifica com decimal (`20.0`, `92.0`). Inteiro satisfaz o tipo, mas descarta até 59 min perto do limiar. Como o threshold é em dias, não muda decisão — só registrar a escolha.

---

## O que está bom

- **A régua do CA1 é ancorada, não inventada.** O `bootstrap` deriva literalmente do ADR-0042 (`:37` — *"se `now − last_seen > limite`"*): sem `last_seen` a condição é indefinida. O comentário do topo do script cita a fonte, então quem ler daqui a um ano entende **por que** não é morte.
- **`ageHours: null` em vez de `0` é a decisão certa,** e o teste a trava explicitamente (*"jamais `0`"*). Qualquer número ali reabriria a porta para um título "há 0h".
- **O `emitter` real corrige uma violação de contrato pré-existente.** O exemplo canônico (`:68`) sempre previu `"sweeper-vps-qa"`; o `emitter:"*"` do YAML antigo já estava fora do contrato. O ticket conserta isso de brinde.
- **`deriveAlreadyAlerted` ignorar registros com `emitter:"*"`** é tratamento correto de compatibilidade — v1 não identifica ninguém, e incluí-los produziria dedup fantasma.
- **CA5 (morte real preservada) é o teste mais valioso da suíte** — é o guarda contra "consertar" o falso-positivo virando um auditor que nunca alerta, que seria uma falha muito pior que a original.
- **`now` injetado, nunca `Date.now()`** — decisão de auditor reproduzível a partir do log. Consistente com o padrão `ClockFixed` do projeto.
- **Validação de borda com `unknown` + acesso por índice** evita que o snake_case do JSON externo vaze para o sistema de tipos. Boa resposta ao lint, em vez de silenciá-lo.
- **A função pura separada do I/O** deixa o workflow sem lógica de decisão — que era a causa de o bug ter passado sem teste por 14 issues.

---

## Próximo passo

**REJECTED** → volta ao **W1**, round 2. Aplicar as Issues 🔴 **1** e **2**:

1. `EmitterVerdict` ganha `lastSeen: string | null`; `jq` volta a gravar `last_seen`.
2. Decidir (a) ou (b) para o enum `status` e **atualizar `handbook/infrastructure/07-deadman-switch-data-contracts.md` §3** — tabela, exemplos e a versão `v:2`.
3. Novo `it()` no W0 cobrindo `lastSeen` (inclusive `null` em bootstrap).

As 🟡 3 e 4 são baratas e ficam no mesmo round — ambas em `deadman-audit.yml`, ambas com fix de uma linha. As 🔵 ficam a critério; a Issue 5 (teste do CLI) é a que mais paga.

> Round 1 de no máximo 3. Nenhuma issue desta lista exige decisão de produto — todas têm fix mecânico e fonte normativa citada.
