# W1 — Implementação GREEN · DEADMAN-AUDIT-FALSE-FIRED

> **Issue:** [#368](https://github.com/ERP-Bem-Comum/core-api/issues/368) · **Branch:** `fix/368-deadman-audit-false-fired`
> **Outcome:** **GREEN** ✅ — 14/14 testes passam, suíte completa `fail 0`

## O que mudou

| Arquivo | Δ | Papel |
| --- | --- | --- |
| `scripts/ci/deadman-audit.ts` | **novo** (~180 linhas) | a decisão do auditor, pura e testada |
| `.github/workflows/deadman-audit.yml` | `:52-111` reescrito | passa a **invocar** o script; segue dono do I/O |

O step único `Self-heal + decisão + keep-alive` virou **dois**: `Self-heal (S3 → history.jsonl)` e `Decidir (script testado) + payload + keep-alive`. O download do S3 (`:36-50`) ficou intacto, como o `000-request.md` previa.

## Os 3 defeitos, e onde cada um morreu

| | Antes (YAML) | Depois |
| --- | --- | --- |
| **D1** | `else status=DEAD  # nenhum sinal jamais visto` (`:84`), com `age_h` no inicial `0` | `auditEmitters` devolve `status:'bootstrap'`, `ageHours:null`, `firesPayload:false`. `null` é deliberado: qualquer número ali volta a permitir um título "há 0h" |
| **D2** | `jq '.default_threshold_days'` (`:56`) — não iterava `.emitters[]` | `parseEmitterConfig` lê cada emissor com o `default_threshold_days` como **fallback**; o veredito carrega o `thresholdDays` do emissor e o `emitter` real |
| **D3** | `gh issue create` a cada execução com `status=DEAD` (`:88-92`) | `firesPayload: dead && !alreadyAlerted.includes(id)` — dedup por transição |

## A decisão que o W0 deixou aberta: onde persistir `alreadyAlerted`

**Derivado do próprio `deadman/audit.jsonl`** via `deriveAlreadyAlerted`, sem peça nova de infra: vale o registro **mais recente** de cada emissor; se o último estado é `dead`, o alerta daquela transição já saiu; se voltou a `alive`/`bootstrap`, a marca cai sozinha.

Por que serve: o `audit.jsonl` **já** é commitado pelo keep-alive do workflow, então o estado sobrevive entre execuções do cron sem banco, sem artifact, sem label de issue. Registros `v1` (com `emitter:"*"`) são ignorados no dedup — não identificam ninguém.

O `audit.jsonl` passa a gravar **uma linha por emissor** (`v:2`), com o id real.

## Prova — o cenário que hoje abre uma p1 por dia

Contra os arquivos **reais** do repo (`history.jsonl` com 0 bytes — nenhum ping jamais chegou):

```
$ node --experimental-strip-types scripts/ci/deadman-audit.ts \
    deadman/emitters.json deadman/history.jsonl deadman/audit.jsonl 2026-07-28T06:00:00.000Z
{"emitter":"sweeper-vps-qa","status":"bootstrap","ageHours":null,"thresholdDays":2,"firesPayload":false}
```

Os três defeitos numa saída só: **bootstrap** (não `dead`), **thresholdDays 2** (do emissor, não o default 3), **emitter real** (não `"*"`). Neste estado o auditor **não abre issue** — antes abria uma por dia.

### Ciclo de dedup, ponta a ponta pelo CLI

| Cenário | `status` | `ageHours` | `firesPayload` |
| --- | --- | ---: | --- |
| morto há 120h, audit vazio (1ª detecção) | `dead` | 120 | **true** |
| mesmo estado, audit já registra `dead` | `dead` | 120 | **false** ← dedup |
| ressuscitou (ping há 1h), audit ainda `dead` | `alive` | 1 | false |
| morreu de novo, audit registra `alive` | `dead` | 120 | **true** ← re-alerta |

O dedup não é permanente — era o risco de "consertar" o D3 com um mute.

## Gates

| Gate | Resultado |
| --- | --- |
| `node --test tests/scripts/deadman-audit.test.ts` | **14/14 pass** |
| `pnpm test` (suíte completa) | **`pass 4550 · fail 0 · skipped 19 · todo 5`** (baseline do W0 era 4536; +14) |
| `pnpm run typecheck` | verde |
| `pnpm run format:check` | verde |
| `pnpm exec eslint` (arquivos do ticket) | verde — os 44 `no-unsafe-*` do W0 sumiram com o módulo tipado, como previsto |
| `act --list -W .github/workflows/deadman-audit.yml` | YAML válido — job `audit`, eventos `schedule,workflow_dispatch` |

## Correções feitas durante o W1

**Lint apontou um design melhor, não só estilo.** A 1ª versão declarava `type RawEmitter = { threshold_days?: unknown }`, o que violava `naming-convention` (snake_case em tipo). Em vez de silenciar a regra, a borda passou a validar `unknown` acessando as chaves do JSON externo por índice (`raw['default_threshold_days']`) — o contrato interno ficou **todo camelCase** e o snake_case não vaza para o sistema de tipos. Também caíram `consistent-type-definitions` (6× `type`→`interface`), `no-unnecessary-condition` e `init-declarations` (o `let rec` do try/catch virou o helper `parseLine`).

**Bug meu, pego no refactor:** a 1ª versão do entrypoint chamava `new Date().toISOString()` **duas vezes** — uma no input de `auditEmitters`, outra no `JSON.stringify` da saída. Podiam divergir em milissegundos, e o `now` do veredito não bateria com o `now` reportado. Virou uma `const now` única.

## Fora de escopo (mantido)

Download do S3 (`:36-50`) e self-heal (`:64-75`) seguem em bash — só a **decisão** migrou, como o `000-request.md` fixou. O `history.jsonl` vazio (emissor nunca pingou, embora `tools/deadman-emitter/` exista) continua sendo verificação de **deploy**, não deste ticket: com o CA1 ele deixa de gerar ruído, mas não vira verde por mágica.

## Para o W2 (read-only)

Pontos que merecem olhar crítico:

1. **`deriveAlreadyAlerted` lê o estado do arquivo que ele mesmo ajuda a escrever.** É simples e sem infra nova, mas acopla dedup a formato de log. Alternativa rejeitada por YAGNI: campo de estado dedicado.
2. **O `while read` do YAML roda em subshell** — variáveis setadas lá dentro não escapam. Nenhuma precisa escapar hoje (o `git add deadman/` pega o append), mas é uma armadilha se alguém acrescentar contador.
3. **`v:2` no `audit.jsonl` convive com `v:1` histórico.** `deriveAlreadyAlerted` ignora `emitter:"*"`; vale confirmar que nenhum outro consumidor lê o formato antigo.
4. **Sem teste do entrypoint CLI** — só das funções puras. O CLI foi validado à mão (tabela acima); se o W2 achar que merece teste, é `execFile` sobre o script.
