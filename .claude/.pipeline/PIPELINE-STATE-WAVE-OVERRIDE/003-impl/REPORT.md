# W1 — Implementação mínima · PIPELINE-STATE-WAVE-OVERRIDE

> **Agente:** `typescript-language-expert` · **Outcome:** **GREEN** ✅ — 46/46 nos 3 arquivos do W0; suíte completa `pass 4590 · fail 0`

## Mudanças

### `scripts/pipeline/state-schema.ts`

- **`+ WaveOverride`** — `Readonly<{ reason, authorizedAt, roundsAtOverride }>`, o shape fixado pelo W0. `roundsAtOverride` guarda o valor **antes** do incremento: é a evidência de que o teto estava esgotado quando a autorização foi dada, não um espelho de `rounds`.
- **`WaveEntry.override?: WaveOverride | null`** — opcional, não obrigatório. Sob `exactOptionalPropertyTypes`, um campo obrigatório invalidaria **todo** literal de `WaveEntry` existente (`cmdInit`, `makeWave`, `pendingWave`, fixture de `render-state-md.test.ts`) — era o risco nº 1 apontado pelo W0 e o que o DoD chama de *"campo adicional não pode quebrar leitores existentes"*.
- `REQUIRED_FIELDS` **não** tocado — valida campos top-level de `PipelineState`; `override` é aninhado e opcional.

### `scripts/pipeline/state-cli.ts` — **96 inserções, 1 remoção**

A única remoção é a string de uso, que passou a listar `wave-override`. **`cmdWaveReopen` tem zero bytes de diff** — verificado na sessão principal por `git diff | grep '^-'`.

- **`+ cmdWaveOverride`**, inserida logo após `cmdWaveReopen` para os irmãos ficarem lado a lado. As 8 guardas na ordem fixada pelo W0:
  1. `--reason` vazio após `trim()` → **exit 2**, *antes* do `loadState`: sem I/O, o `STATE.json` fica intacto **por construção**, não por sorte (CA1/CA1b). Exit 2 e não o exit 1 do `requireFlag` genérico — ausência de motivo é violação de invariante, não erro de digitação.
  2-5. `loadState` · wave existe (exit 1, estrutural) · `status==='done'` · `outcome==='REJECTED'`.
  6. **`rounds >= MAX_ROUNDS`** → senão exit 2 orientando `wave-reopen` (CA5). Oposto exato da guarda do irmão, **reusando a mesma constante** — sem segundo literal `3`.
  7. Wave posterior não-`pending` → exit 2, citando qual (CA6).
  8. Transição imutável via `map` (os tipos são `Readonly`): `in-progress`, `outcome`/`finishedAt` limpos, `rounds+1` (**pode passar de 3** — é o ponto do ticket), `override`, `currentWave`, `lastEvent`. Persiste por `writeStateAndMd`, que re-renderiza o `STATE.md` (CA3).
- **`+ case 'wave-override':`** no switch de `main()`.

### `scripts/pipeline/render-state-md.ts`

- **Nova seção `## Overrides autorizados`**, com o mesmo padrão condicional dos blockers — `STATE.md` de ticket sem override sai **byte a byte igual ao de antes**.
- `overriddenWaves()` usa `flatMap` em vez de `filter().map()`: sob `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`, `filter` não estreita `override?: T | null` para `T`; o `flatMap` estreita **sem** `!` nem cast.

### `AGENTS.md`

Uma linha em §"Comandos essenciais", entre `wave-reopen` e `close` (DoD item 4).

## Prova GREEN

```
ℹ tests 46 · suites 23 · pass 46 · fail 0
✔ CA1 · CA1b · CA2 · CA3 · CA5 · CA6      ← as 6 do W0, agora verdes
✔ CA4 (controle) · CA-DoD-dashboard · CA-DoD-metrics  ← seguem verdes
```

Os três controles positivos continuam passando: o override não vazou para o caminho normal nem para os leitores.

## Gates

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | verde |
| `pnpm exec eslint` (3 scripts + 3 testes) | verde |
| `pnpm run format:check` | verde |
| `pnpm test` completo | **`tests 4614 · pass 4590 · fail 0 · skipped 19 · todo 5`**, exit 0 |

Sobre a suíte completa: o rodapé lista `native-pdf-real.local.test.ts` sob `✖ failing tests:`. **Não é falha e não é deste ticket** — é `todo` anotado (`#388`, hex Identity-H sem `/ToUnicode`), entra em `todo 5`, fica fora de `fail`, exit 0. Nenhum arquivo daquele módulo foi tocado.

## Smoke real — ticket temporário, criado e removido

`TMP-OVERRIDE-SMOKE` levado por CLI até `W2 done+REJECTED [rounds=3]`:

```
$ wave-reopen  … W2                     → wave W2 atingiu max rounds (3); escalar ao humano   (exit 2)
$ wave-override … W2                    → flag --reason obrigatória e não-vazia …             (exit 2)
$ wave-override … W2 --reason "Autorizado por Gabriel — …"   → W2 overridden (round 4)
```

`STATE.json` resultante:

```json
{ "id": "W2", "status": "in-progress", "rounds": 4, "outcome": null,
  "override": { "reason": "Autorizado por Gabriel — …",
                "authorizedAt": "2026-07-28T14:35:20.511Z", "roundsAtOverride": 3 } }
```

**DoD verificado contra os leitores reais**, não só fixtures: `pipeline:status` listou o ticket normalmente e `pipeline:metrics --json` agregou os **484 tickets reais** do repo com o `STATE.json` novo entre eles. E `wave-finish --outcome APPROVED` depois do override fecha a wave **preservando** o registro de autorização — a exceção não é apagada pelo fluxo normal, que era o ponto do CA3.

Ticket temporário removido; verificado na sessão principal (`ls .claude/.pipeline/ | grep TMP` → vazio).

## Decisões dentro da liberdade que o W0 deixou

1. **Override é lista, não coluna** no `STATE.md`. O `reason` é texto livre e pode conter `|`, que dentro da tabela quebraria as colunas que o hook `inject-ticket-context.sh` parseia. O motivo está em comentário no código.
2. **`lastEvent` carrega o motivo**, não só o contador. É o que o hook injeta no contexto de quem abre a próxima sessão — a autorização aparece na primeira linha lida.
3. **Mensagens dizem o que fazer**, não só o que falhou: a da guarda 6 mostra `(3/3)` e nomeia o comando correto, porque quem bate nela está no ponto exato de decisão entre os dois caminhos.
4. **Verbo `overridden`**, alinhado ao `reopened` do irmão.
5. **`REQUIRED_FIELDS`/`parsePipelineState` não tocados** — validar campo opcional aninhado exigiria um parser de `WaveEntry` que não existe para nenhum outro campo; seria escopo novo, não mínimo.
