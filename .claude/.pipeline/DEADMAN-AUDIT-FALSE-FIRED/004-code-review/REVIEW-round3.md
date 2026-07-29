# Code Review — DEADMAN-AUDIT-FALSE-FIRED — Round 3 (final)

**Veredito:** **REJECTED** → **ESCALAR AO HUMANO** (limite de 3 rounds do pipeline esgotado)

**Reviewer:** `code-reviewer` (read-only) · **Especialistas:** `security-backend-expert`, `nodejs-runtime-expert`, `typescript-language-expert` — os três **continuados** do round 2, verificando os próprios achados
**Data:** 2026-07-28T13:40Z
**Gates no estado atual:** `typecheck` · `eslint` · `format` verdes · **31/31** no ticket · `pnpm test` `pass 4567 · fail 0`

---

## Fechados — confirmados pelos especialistas que os abriram

| Achado | Verificado por | Status |
| --- | --- | --- |
| N1 — exceção por `ts` malformado | security F1 · ts M1 | **FECHADO** (a exceção; ver R2 para o resíduo) |
| N2 — `ts` futuro → `alive` eterno | security F3 | **FECHADO** |
| N3 — dedup pela decisão | security F4 | **FECHADO no TS**; ver R3 no bash |
| N4 — `setup-node` ausente | nodejs B1 | **FECHADO** — posição correta, `cache:` corretamente omitido, SHA idêntico ao dos outros 6 workflows |
| N5 — `readOrEmpty` catch-all | nodejs M2 | **FECHADO** — narrowing idiomático; o cast `NodeJS.ErrnoException` tem precedente em `s3-error-mapper.ts:48` e `pdf-lowlevel.ts:46` |
| N6 — `id` duplicado | ts m3 | **FECHADO** |
| N9 — `__proto__` na **escrita** | ts m4 | **FECHADO** — `fromEntries` usa `[[DefineOwnProperty]]`, não aciona o setter; protótipo não é poluído |
| N10 — mensagem de erro | nodejs m7 · ts m5 | **FECHADO** |
| N13 — stderr do curl | security F8 | **FECHADO** |

---

## 🔴 R1 (Blocker) — leitura de chave **herdada** derruba o step antes do keep-alive

`scripts/ci/deadman-audit.ts:128-131` · achado por `typescript-language-expert`, **reproduzido por mim**:

```
emissor "toString", zero pings:
THROW: Error: last_seen inválido: function toString() { [native code] }
```

`Object.fromEntries` fechou o lado da **escrita** (N9), mas o objeto devolvido tem `Object.prototype` na cadeia — o `Map` não tinha. Então `lastSeenByEmitter['toString']` devolve **`Function`**, não `undefined`, e o guard atual (`=== undefined || === ''`) não pega. Cai em `hoursBetween` → `throw` → `set -e` → **step morto antes do commit de keep-alive**.

É o mesmo dano do N1 original, por outra porta. O tipo `Readonly<Record<string, string>>` mente: o compilador não tem como saber que o runtime devolve `Function`.

**Não é só o `lastSeenFromPings`:** os 31 testes passam literais `{ [SWEEPER]: '…' }`, que também herdam `Object.prototype`. O buraco está no **ponto de leitura**, não no de escrita.

**Fix — uma linha**, reusando o predicate que este round criou:

```ts
const lastSeen = input.lastSeenByEmitter[emitter.id];
if (!isIsoUtc(lastSeen)) {          // era: === undefined || === ''
```

Cobre `undefined`, `''`, `Function` herdada e qualquer não-ISO num guard só, e torna os dois `throw` de `hoursBetween` **inalcançáveis a partir de `auditEmitters`**. O especialista verificou que é drop-in: todos os fixtures dos 31 testes são ISO completo e `''` continua caindo em `bootstrap`.

## 🟠 R2 (Major) — o invariante que o comentário afirma é falso

`scripts/ci/deadman-audit.ts:67` e `:188-190`. O comentário diz:

> *"A ordenação é lexicográfica, o que **só** equivale a cronológica porque `isIsoUtc` garante que toda `ts` aceita tem exatamente o mesmo formato."*

A regex é `(?:\.\d{1,3})?Z` — fração **opcional** e de **largura variável**, aceitando 4 formatos. Reproduzi os pares que escolhem o timestamp **errado**:

```
ERRO 2026-07-28T05:00:00Z    vs 2026-07-28T05:00:00.001Z → lex escolhe o SEM fração (mais antigo)
ERRO 2026-07-28T05:00:00.5Z  vs 2026-07-28T05:00:00.51Z  → lex escolhe .5Z (mais antigo)
```

Hoje não morde — todo produtor real emite 3 dígitos (`date -u +…000Z` no YAML `:69`/`:82`, `toISOString()` no entrypoint, e todos os fixtures). Mas **a defesa contra "linha corrompida vence para sempre num arquivo append-only" repousa exatamente nesse invariante**, e a regex permite o que a justificativa proíbe.

**Fix — um intervalo:** `(?:\.\d{1,3})?Z` → `\.\d{3}Z`. Verificado que não quebra nada; `semZ` e `mes13` seguem rejeitados.

## 🟠 R3 (Major) — `delivered` fica `true` sem entrega completa; **não tem fix mecânico**

`.github/workflows/deadman-audit.yml:104-124`. Achado pelo `security-backend-expert` e, independentemente, por mim antes de receber o retorno dele.

Se `gh issue create` **sucede** e o `curl` do Discord **falha**, `delivered` permanece `true` (só é zerado dentro do bloco do `gh`, `:113`). O step falha corretamente (`exit 1`), mas grava `payload_fired: true` — e a próxima execução trata como já alertado e **nunca retenta o Discord** para aquela transição.

**O fix óbvio é uma armadilha.** Espelhar `delivered=false` na falha do Discord faz a próxima execução retentar **os dois** canais — e `gh issue create` não é idempotente, então nasce uma **segunda issue duplicada** para a mesma morte: exatamente o bug que originou este ticket.

**É decisão de produto, não correção mecânica:**

- **(A)** o dedup segue governado só pelo canal mínimo (a issue — como `permissions:` já o chama, `:16`); Discord é best-effort, falha fica visível pelo `exit 1` sem retry automático. **É o que o código já faz hoje** — falta apenas assumir isso por escrito, no comentário e no contrato §3.
- **(B)** separar `issue_fired` / `discord_fired`, com o dedup olhando só o primeiro. Mais correto, mais escopo, muda o contrato de dados de novo.

Recomendo **(A)** agora + **(B)** como follow-up, mas a escolha é do dono.

## 🔵 Menores (não bloqueiam)

- **R4** — `notAfter` inválido desliga o filtro de skew em silêncio (`:200-203`), enquanto o mesmo valor ruim faz `auditEmitters` **lançar**. Duas funções, comportamentos opostos para o mesmo dado.
- **R5** — `Date.parse` faz **rollover** em datas calendarmente impossíveis: `2026-02-30` → 2/mar, `2025-02-29` → 1/mar (ambos os especialistas acharam, independentemente). Passam na validação com a data deslocada. O teste `'…data impossível também é descartado'` (`:297`) **promete mais do que entrega** — pega `2026-13-45`, não pega `2026-02-30`. O nome deveria ser honesto.
- **R6** — descarte de linha é totalmente silencioso: um Emissor com bug (ou ataque sistemático) fica invisível. Sugerido contar descartes e emitir `::warning::` sem falhar o run.
- **R7** — emissor com relógio **permanentemente** >2h adiantado fica preso em `bootstrap`, indistinguível de "nunca iniciou". Não é regressão (antes ficava `alive` eterno, pior), mas o troubleshooting fica difícil.
- **R8** — `Math.floor` antes da comparação com o limiar segue podendo atrasar o veredito em <1h (nodejs Minor 8, aberto desde o round 1). Irrelevante com cron diário.
- **R9** — a compatibilidade com registros v1 é **código que o arquivo real nunca exercita**: as 22 linhas de `deadman/audit.jsonl` têm todas `emitter:"*"` e são filtradas. Não é bug; só não conte o teste `:373` como prova de migração.
- **R10** — o bash do step continua **sem teste** — e R3 nasceu exatamente ali.

---

## Por que ESCALAR, e não aprovar nem rodar um round 4

O pipeline fixa **3 rounds** de W2 antes de escalar (`AGENTS.md`), e este é o terceiro. Não vou aprovar com **R1 confirmado por execução**: é perda de keep-alive, a falha mais grave possível neste subsistema — o dead-man morrendo em silêncio é pior que o falso-positivo que o ticket veio consertar.

Mas o quadro é bom, e a decisão é sua:

- **R1 e R2 são uma linha cada**, com fix exato e verificado, sem tocar tipo público nem os 31 testes.
- **R3 não tem fix mecânico** — precisa da sua escolha entre (A) e (B).
- O ticket já corrigiu, com prova, **tudo** que motivou sua abertura: bootstrap não é morte, threshold por emissor, emitter real, dedup por entrega, `ts` corrompido inofensivo, `setup-node` pinado.

**Recomendo:** autorizar um round 4 excepcional aplicando R1 + R2 + R3(A) — três mudanças pequenas com teste — e abrir follow-up para o que sobra (union discriminada `EmitterVerdict`, brand `Iso8601`, R3(B), teste do bash do step, e a **verificação HMAC do `sig`**, que segue ausente e é o gap mais sério do subsistema).

## O que os especialistas confirmaram como sólido

- **Injeção de shell: limpa** — a leitura da expansão do bash está certa; `jq --arg` escapa corretamente. A regex não tem ReDoS (quantificadores de largura fixa), rejeita dígitos Unicode, offsets `+00:00`, `z` minúsculo e espaços.
- **`setup-node` fechou uma fragilidade que ninguém tinha notado:** antes dele, `--experimental-strip-types` dependia do Node não-pinado da imagem — uma atualização silenciosa do runner quebraria o step **antes do keep-alive**, o mesmo padrão de falha do N1.
- **`deriveAlreadyAlerted` usa `=== true` estrito** — `"true"` (string) e `1` não contam. Sem coerção por truthiness, que é o certo.
- **`Object.fromEntries` não polui protótipo** — verificado: `ownKeys: ['__proto__']`, protótipo intacto.
- **O adiamento de N7/N8 foi a chamada certa**, nas palavras do especialista que os propôs: *"'o refactor compila de graça' não é o mesmo que 'o refactor é de graça neste round' — o custo real é não ter round sobrando para detectar a regressão"*.
