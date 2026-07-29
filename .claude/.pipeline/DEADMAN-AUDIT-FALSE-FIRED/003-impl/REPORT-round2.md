# W1 — Round 2 (correções do W2) · DEADMAN-AUDIT-FALSE-FIRED

> **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Branch:** `fix/368-deadman-audit-false-fired`
> **Entrada:** `004-code-review/REVIEW.md` round 1 (REJECTED — 2 🔴, 2 🟡, 3 🔵)
> **Outcome:** **GREEN** ✅ — 19/19 no ticket, suíte completa `pass 4555 · fail 0`

## Disciplina do round

Os 5 `it()` novos foram escritos **antes** da implementação e provados RED (`pass 14 · fail 5`), depois GREEN. O fail-first vale dentro do round de correção, não só no W0 original.

## 🔴 Issue 1 — `last_seen` de volta ao `audit.jsonl`

O defeito estava no tipo, como o review apontou: sem `lastSeen` no `EmitterVerdict`, o workflow não tinha de onde gravá-lo.

- `EmitterVerdict` ganhou `readonly lastSeen: string | null` — `null` em bootstrap, **nunca `''`** (string vazia reintroduziria o `last_seen=` mudo do v1). O `it()` assere isso explicitamente.
- `auditEmitters` propaga nos dois ramos.
- O `jq` do workflow grava `last_seen:$seen` via `--argjson seen "$(jq -c '.lastSeen' <<<"$v")"` — `--argjson` (não `--arg`) para que `null` chegue como `null` JSON, não como a string `"null"`.
- A mensagem da issue de alerta agora cita o `last_seen` (*"último sinal em `X` (há Yh)"*) — era a informação que faltava para diagnosticar sem abrir o log.

**3 `it()` novos:** vivo, morto, e bootstrap (`lastSeen === null` espelhando `ageHours`).

## 🔴 Issue 2 — enum `status` × contrato de dados

Escolhida a **opção (a)** do review: minúsculas no código **e** contrato atualizado. Motivo: `v:2` é formato novo, e `'alive' | 'DEAD'` misturava grafias para o mesmo enum — herança do `status=DEAD` do bash, onde era nome de variável shell.

**`handbook/infrastructure/07-deadman-switch-data-contracts.md` §3 reescrito:**

- Exemplos passam a `v:2`, incluindo **uma linha de `bootstrap`** com `last_seen: null` / `age_h: null`.
- Tabela de campos: `v` documentado; `last_seen` e `age_h` passam a `… | null`; `status` vira `"alive" | "dead" | "bootstrap"`; `threshold_days` passa a ser o **do emissor**, com o default como fallback.
- **Novo §3.1** — tabela comparando `v:1` × `v:2` nos 4 eixos que mudaram, a fundamentação do bootstrap ancorada no ADR-0042 (`:37`), e a regra de leitura de registros antigos.

**Bug latente encontrado ao escrever o teste do enum:** `deriveAlreadyAlerted` comparava `status === 'dead'`, então um registro v1 com `"DEAD"` não seria reconhecido como já-alertado → **re-alerta em falso** na primeira execução v2. A comparação passou a ser case-insensitive (`status.toLowerCase()`), com o porquê no docblock. Hoje é inofensivo (todo v1 tem `emitter:"*"`, já ignorado), mas a classe do bug some. **1 `it()` cobrindo.**

O 5º `it()` novo trava o contrato ao contrário: lê o **handbook** e falha se ele não documentar os 3 status. Documentação que o teste verifica não sai de sincronia calada.

## 🟡 Issue 3 — keep-alive preservado sem reintroduzir escape

O `|| true` **não** voltou (ADR-0011, CA do ticket). Em vez disso:

- Cada payload roda sob `if ! …; then echo "…" >> /tmp/payload-failures; fi` — a falha é **registrada**, não engolida.
- `git add`/`commit`/`push` (o keep-alive) executa **sempre**.
- No fim do step, `[ -s /tmp/payload-failures ]` → `::error::` + `exit 1`.

Falha visível **e** keep-alive garantido — o step ainda fica vermelho, só que depois de proteger o mecanismo.

## 🟡 Issue 4 — commit sem mudança

`git commit --allow-empty`. Satisfaz o `:82` do contrato (*"toda execução escreve uma linha e commita"*) mesmo com `emitters: []`, em vez de abortar por *nothing to commit*.

## Correções extras, ambas achadas por execução real

1. **Subshell do `while` eliminado.** Era o ponto 2 do meu próprio handoff do W1 round 1. `jq … | while` virou `while … done < <(jq …)` (process substitution) — variáveis do loop passam a escapar, então o acumulador de falhas da Issue 3 é robusto e não depende de I/O em arquivo.
2. **`status` como nome de variável em shell.** A simulação do loop falhou com `read-only variable: status` — o meu shell é zsh, onde `$status` é alias de `$?`. O runner usa bash, onde funciona; mas é risco gratuito. Renomeada para `st`, com o porquê em comentário.

## Prova de contrato — a linha gravada bate com o handbook

Loop do workflow simulado em `bash` real, com o script de verdade:

```
bootstrap → {"v":2,"run_at":"…","emitter":"sweeper-vps-qa","last_seen":null,"age_h":null,"status":"bootstrap","merged":0,"threshold_days":2}
dead      → {"v":2,"run_at":"…","emitter":"sweeper-vps-qa","last_seen":"2026-07-23T06:00:00.000Z","age_h":120,"status":"dead","merged":0,"threshold_days":2,"payload_fired":true}
```

Campos, ordem e tipos idênticos aos exemplos do §3 recém-escrito — incluindo `null` **JSON** (não `"null"`) nos dois campos do bootstrap.

## Gates

| Gate | Resultado |
| --- | --- |
| `tests/scripts/deadman-audit.test.ts` | **19/19** (era 14; +5) |
| `pnpm test` | **`pass 4555 · fail 0 · skipped 19 · todo 5`** |
| `pnpm run typecheck` | verde |
| `pnpm run format:check` | verde |
| `pnpm exec eslint` (arquivos do ticket) | verde |
| `act --list -W deadman-audit.yml` | YAML válido |
| CLI contra dados reais | `bootstrap · lastSeen null · firesPayload false` |
| CLI: dedup com `"DEAD"` v1 | `status dead · firesPayload false` — não re-alerta |

## 🔵 não aplicadas (com razão)

- **Issue 5 (teste do entrypoint CLI):** não feita. O CLI foi exercitado à mão em 6 cenários neste round (bootstrap, dead, dedup v1/v2, ressurreição, shape do `jq`), mas segue sem teste automatizado. **Recomendo que o W2 decida** se bloqueia — é o único ponto do review que não endereço, e não quero fechá-lo por conta própria.
- **Issue 6 (regex frágil):** mantida como está; a fragilidade é inerente a asserção de estrutura sobre texto e já está registrada no REVIEW.
- **Issue 7 (`age_h` inteiro):** mantido `Math.floor`, agora **documentado** no contrato (`age_h` passou a `int | null` na tabela) — a divergência com o exemplo decimal do v1 deixa de existir.
