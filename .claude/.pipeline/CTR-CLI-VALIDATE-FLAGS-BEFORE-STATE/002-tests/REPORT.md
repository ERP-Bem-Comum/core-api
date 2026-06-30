# W0 (RED) — CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE

**Skill:** tdd-strategist
**Data:** 2026-05-27
**Resultado:** 🔴 RED — CA-V1/CA-V2 falham (74/erro de state); CA-V3 (guard) verde.

## Causa raiz confirmada empiricamente

`src/modules/contracts/cli/main.ts` ordena: `parseDriverFlags` → `buildContext` (carrega state) →
`cmd.run` (valida `rest`). Uma flag desconhecida cai em `rest` silenciosamente
(`parse-driver-flags.ts:82`) e só é rejeitada (EXIT=64) dentro de `cmd.run`. Quando
`buildContext` falha antes — `./cli-state.json` default com schema inválido → `state-entity-invalid`
→ `EXIT_IOERR=74` (`main.ts:49,109-113`) — o typo é mascarado.

Reprodução hermética (tmpdir + `cli-state.json` inválido):

```
listar-contratos --no-stat          → EXIT=74 "❌ Arquivo de estado contém entidade com schema inválido…"
listar-contratos --xyz=1 --no-state → EXIT=64 "❌ Flag desconhecida. (--xyz)"   (controle: --no-state pula o load)
```

## Comando

```bash
node --test --experimental-strip-types --no-warnings \
  tests/modules/contracts/cli/flag-validation-before-state.test.ts
# tests 3 · pass 1 · fail 2
```

## Testes adicionados — `tests/modules/contracts/cli/flag-validation-before-state.test.ts`

E2E herméticos: sobem `main.ts` via `spawn` num cwd temporário com `cli-state.json` inválido.

| Teste | Papel | W0 |
| :--- | :--- | :--- |
| CA-V1 | `--no-stat` + state inválido → `EXIT=64` (não 74) | 🔴 falha (74 hoje) |
| CA-V2 | stderr nomeia `--no-stat` e **não** reporta erro de state | 🔴 falha (msg de state hoje) |
| CA-V3 | state inválido permanece intacto (nenhuma escrita) | 🟢 guard anti-regressão (verde por design) |

CA-V3 é mantido (não descartado): protege o invariante "typo não persiste state default" — risco
plausível se o fix reordenar mal e ainda inicializar/salvar o state.

## Mapa W1

- `src/modules/contracts/cli/main.ts` — validar `rest` (flags desconhecidas) **antes** de
  `buildContext`. Provável: extrair a checagem de flag desconhecida hoje interna ao comando para
  um passo que roda pré-`buildContext`, ou expor um validador de `rest` reutilizável.
- Preservar: caminho feliz, distinção 64 (uso) vs 74 (I/O de state real), `--no-state`/`--driver mysql`.
- Cobertura-alvo: CA1–CA5 do `000-request.md`, incluindo REGR #10 verde sem depender de cwd.
