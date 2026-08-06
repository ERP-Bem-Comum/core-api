# Code Review — DEADMAN-AUDIT-FALSE-FIRED — Round 2

**Veredito:** **REJECTED**

**Reviewer:** `code-reviewer` (read-only), com auditoria de `security-backend-expert`, `nodejs-runtime-expert` e `typescript-language-expert`
**Data:** 2026-07-28T13:05Z
**Regra do round:** lista **apenas o que ainda não foi corrigido** — as issues do round 1 não são repetidas.

---

## Status das issues do round 1 — todas fechadas ✅

| Round 1 | Estado | Verificação |
| --- | --- | --- |
| 🔴 1 — `last_seen` ausente | **corrigido** | `EmitterVerdict.lastSeen: string \| null`; `jq` grava `last_seen` com `--argjson`; 3 `it()` novos |
| 🔴 2 — enum × contrato | **corrigido** | handbook §3 reescrito p/ `v:2` + §3.1 novo; `it()` que lê o handbook; `deriveAlreadyAlerted` case-insensitive |
| 🟡 3 — keep-alive derrubado | **corrigido na forma, mas ver N3** | `if ! …` + `/tmp/payload-failures` + `exit 1` no fim; keep-alive executa |
| 🟡 4 — commit sem mudança | **corrigido** | `git commit --allow-empty` |
| 🔵 7 — `age_h` inteiro | **corrigido** | contrato passou a `int \| null` |

Também creditado: subshell do `while` eliminado (process substitution) e `status`→`st` — dois riscos que o round 1 não pediu.

---

## 🔴 Novos — Blocker

### N1 — `ts` malformado derruba a auditoria e envenena `history.jsonl` **permanentemente**

`scripts/ci/deadman-audit.ts:87-92` (`hoursBetween`) + `:160-173` (`lastSeenFromPings`) · `.github/workflows/deadman-audit.yml:74,79-80`

**Achado independente de dois especialistas** (security F1 · typescript M1), reproduzido aqui:

```
$ printf '{"emitter":"sweeper-vps-qa","seq":2,"ts":"nao-e-data"}\n' >> pings.jsonl
$ node … scripts/ci/deadman-audit.ts …
Error: timestamp inválido: nao-e-data
exit=1
```

A cadeia:

1. `lastSeenFromPings` ordena por `ts > current` — comparação de **string**. Qualquer valor começando por letra é lexicograficamente **maior** que toda data ISO (que começa por dígito). Lixo não empata: **vence sistematicamente**.
2. `hoursBetween` lança; `auditEmitters` chama dentro de `.map()` sem `try`; o entrypoint não captura → `exit 1`.
3. No workflow, `node … > /tmp/verdicts.json` é o **primeiro** comando sob `set -euo pipefail` → o step morre **antes** do `git commit --allow-empty` — o keep-alive.
4. `history.jsonl` é **append-only** por contrato (`07-deadman-switch-data-contracts.md:107`). A linha venenosa continua vencendo **em toda execução futura**.

**Resultado:** auditor permanentemente quebrado, zero alertas para **todos** os emissores, e sem commit → caminho aberto para a suspensão de 60 dias. É a falha exata que o ADR-0042 existe para impedir, causada pelo mecanismo que deveria impedi-la.

**Não exige atacante.** Um bug honesto no Emissor produz o mesmo efeito — `deadman-ingest.yml` valida presença de `emitter`/`seq`, nunca o formato de `ts`.

**Contradiz a intenção declarada** em `deadman-audit.ts:55` (*"linha corrompida não derruba a auditoria"*): hoje linha **sintaticamente** corrompida é tolerada, mas `ts` **semanticamente** corrompido mata o processo.

**Fix:** validar ISO-8601 estrito em `lastSeenFromPings` e descartar a linha, na mesma trilha do `parseLine`. Uma linha, e fecha N2 junto.

### N2 — `ts` no futuro silencia o alerta para sempre

`scripts/ci/deadman-audit.ts:114-115` (security F3), reproduzido:

```
ts = 2099-01-01 → {"status":"alive","ageHours":-634914,"firesPayload":false}
```

`ageHours` negativo nunca é `> thresholdDays * 24` → `alive` eterno, mesmo com o processo morto. O `-634914` ainda vai cru para o campo `age_h` do `audit.jsonl`, violando o contrato (`age_h` = idade, não pode ser negativa).

Mesma origem de N1 (`ts` não validado) e mesmo fix.

### N3 — o dedup não distingue "tentei alertar" de "alertei" — regressão do fix da Issue 3

`scripts/ci/deadman-audit.ts:140-154` · `.github/workflows/deadman-audit.yml:92,100,106,119`

Confirmado por inspeção: `payload_fired` é gravado a partir de **`$fires`** (`:92` ← `.firesPayload`, a **decisão**), enquanto a falha real do `gh`/`curl` só vai para `/tmp/payload-failures` (`:100`, `:106`). A linha do `audit.jsonl` é escrita **incondicionalmente** (`:119`).

**Consequência:** `gh issue create` falha (rate limit, outage) → grava `status:"dead"` mesmo assim → próxima execução, `deriveAlreadyAlerted` vê `dead` → **suprime a retentativa**. Uma falha transitória no momento de uma morte real perde o alerta **permanentemente e em silêncio**, até o emissor ressuscitar e morrer de novo.

Isso **invalida a premissa com que aprovei a Issue 3 no round 1** (*"perde-se uma execução, a próxima tenta de novo"*) — a retentativa não acontece. Mea culpa do round 1.

E contradiz o contrato que este ticket escreveu: `07-deadman-switch-data-contracts.md:82` diz que `payload_fired` é *"presente e `true` **apenas quando** o payload de contingência foi disparado"* — hoje é `true` quando foi **decidido**.

**Fix:** `deriveAlreadyAlerted` passa a exigir `status === 'dead' && payload_fired === true` (o campo já existe, o dedup só não olha para ele); e o YAML só grava `payload_fired:true` quando aquele emissor não registrou falha.

### N4 — falta `actions/setup-node`: o keep-alive depende do Node da imagem

`.github/workflows/deadman-audit.yml:72-80` (nodejs-runtime-expert), verificado:

| Workflow | pina Node? |
| --- | --- |
| `ci.yml`, `integration.yml`, `commit-policy.yml`, `integration-notifications.yml` | **sim** — `node-version: 24` |
| `deadman-audit.yml` | **não** — 0 ocorrências de `setup-node` |

Este ticket introduziu o **primeiro** uso de `node` neste workflow (antes era 100% bash/jq/date). `--experimental-strip-types` exige Node ≥22.6 e o projeto declara `engines.node >=24.0.0`, mas nada disso é garantido pelo runtime pré-instalado da imagem `ubuntu-latest` — que muda sem aviso. Se o Node da imagem não aceitar a flag, `set -e` mata o step **antes do keep-alive**.

**Risco introduzido por este diff**, não pré-existente.

**Fix:** `- uses: actions/setup-node@<sha>` com `node-version: '24'` antes do step de decisão, SHA-pinado (ADR-0011), como nos outros quatro.

---

## 🟡 Importante

### N5 — `readOrEmpty` engole qualquer erro, não só `ENOENT`

`scripts/ci/deadman-audit.ts:175-181`. Um `EISDIR`/`EACCES` vira `''`, indistinguível de "arquivo ainda não existe". Como alimenta `deriveAlreadyAlerted`, uma falha de I/O **reseta o dedup** e reabre issue já alertada — a classe de defeito que este ticket combate. `parseEmitterConfig` acerta ao não capturar; `readOrEmpty` deve restringir o catch a `ENOENT`.

### N6 — `id` duplicado em `emitters.json` gera duas issues para a mesma morte

`scripts/ci/deadman-audit.ts:66-85`. Probado pelo especialista: dois emissores com o mesmo `id` produzem dois vereditos → o loop do YAML abre **duas** issues e grava duas linhas. Num ticket que nasceu de *"14 issues idênticas"*, rejeitar `id` duplicado no parse é barato e temático.

---

## 🔵 Sugestão

- **N7** — `EmitterVerdict` não codifica a correlação `lastSeen`/`ageHours` (sempre ambos `null` ou nenhum). O especialista **probou o refactor**: discriminated union por `status`, os dois `return` compilam sem mudança no corpo, 4 linhas. O contrato (`:78`) já normatiza a correlação, então o tipo hoje é mais fraco que o contrato que implementa.
- **N8** — o `it()` do enum hardcoda `['alive','dead','bootstrap']` em vez de derivar de `AuditStatus`; um 4º status não faria o teste falhar. Derivar de um `as const` exportado torna o handbook um gate mecânico.
- **N9** — `lastSeenFromPings` acumula em objeto puro: um emissor chamado `__proto__` é engolido pelo setter de `Object.prototype` e fica eterno em bootstrap. `deriveAlreadyAlerted` já usa `Map` — alinhar.
- **N10** — `hoursBetween` sempre culpa `fromIso` na mensagem, mesmo quando o inválido é `toIso` (o `now` do runner) — manda o operador investigar o arquivo errado.
- **N11** — `JSON.parse` cru em `:67` escapa do padrão `emitters.json: …` das outras 3 falhas da função.
- **N12** — Issue 5 do round 1 (teste do entrypoint CLI) segue aberta. **Decisão:** não bloqueia. O CLI foi exercitado em 8 cenários entre os dois rounds, e N1/N2/N4 já forçam mexer nessa região — o teste sai de graça junto.
- **N13** — `curl -fsS` pode ecoar o host do webhook em erro de DNS; a máscara do Actions só redige ocorrência exata do secret.

---

## Retratação do round 1

Aprovei a Issue 3 escrevendo *"impacto real: baixo — perde-se uma execução, a próxima tenta de novo"*. **Estava errado**: N3 mostra que a retentativa é suprimida pelo dedup. A severidade correta daquele ponto era maior, e o fix aplicado no round 2 é necessário mas **não suficiente**.

## O que está bom (novo neste round)

- **Injeção de shell: verificada e limpa.** Toda interpolação (`${emitter}`, `${age}`, `${th}`, `${seen}`) está em string com aspas duplas passada como argv único a `gh`/`curl`, sem `eval`/`bash -c`; o JSON do Discord é montado com `jq --arg`. Bash não reexpande o valor de uma variável — backtick/`$( )` no conteúdo ficam inertes. **CWE-78 não se aplica.**
- **Least privilege correto:** `contents: write` + `issues: write` explícitos zeram o resto do `GITHUB_TOKEN`, e é exatamente o que o job faz (`git push` + `gh issue create`). Nenhum eco de secret, sem `set -x`.
- **Flood de issues não é vetor:** o número de issues por run é limitado por `emitters.json` (versionado), não pelo volume de pings — `auditEmitters` itera `input.emitters`, nunca as chaves de `lastSeenByEmitter`.
- **Verde por mérito, não por acidente.** O especialista de TS probou: `noUncheckedIndexedAccess` morde onde importa e todos os acessos indexados estão guardados; o cast `v as Json` é sound; `assert.ok` narrowa de fato (e o typecheck verde é a prova negativa); `isPositiveInt` não tem furo.
- **`item: unknown` em `:76` é a única barreira contra `any`** no caminho de parse — `Array.isArray` sobre `unknown` narrowa para `any[]`, e nem `tsc` nem `no-unsafe-argument` reclamariam se removida. Vale um comentário pinando-a.
- **Correção de premissa minha:** classifiquei `interface` como ponto de atenção no round 1 por hábito do `src/`. O especialista verificou que `consistent-type-definitions` deste repo tem `defaultOptions: ['interface']` — o lint **prefere** `interface`. O `src/` só escapa porque `type X = Readonly<{…}>` é invisível à regra, e a norma "port é `type`" é escopada a `src/modules/*/application/**`. **`interface` em `scripts/` está certo.**

## Fora de escopo — registrar, não consertar (ADR-0040)

- **Ausência de verificação de assinatura HMAC (`sig`)** em todo o pipeline. O contrato é explícito (`:111`): *"Sem `sig` válido → o Auditor **ignora** a linha (anti-spoof)"*, e não acontece em lugar nenhum. É a precondição que torna N1/N2 exploráveis por terceiro, além de alcançáveis por bug honesto. Já reconhecido no ADR-0042 (`:55`) como item aberto — recomendo **subir a prioridade** e abrir issue dedicada via `issue-report`.
- **`for k in $keys` não-quotado** (`:41-50`) e `--argjson s "$s"` sobre `seq` não validado (`:57-66`) — mesma classe de N1, um step antes, fora do trecho reescrito.

---

## Próximo passo

**REJECTED** → **round 3, o último** antes de escalar humano.

Bloqueiam: **N1, N2, N3, N4**. N1+N2 fecham com a mesma validação de `ts`. N3 é o mais sutil e o mais importante — é a garantia de entrega do alerta. N4 é uma linha de YAML.

N5 e N6 são baratas e cabem no mesmo round. As 🔵 ficam a critério, com N7 e N8 recomendadas por serem estruturais e já provadas gratuitas.

> Se o round 3 não fechar, escalar ao humano conforme a disciplina do pipeline.
