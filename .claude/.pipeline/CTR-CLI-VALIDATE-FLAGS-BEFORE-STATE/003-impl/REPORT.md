# W1 (GREEN) — CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE

**Skill:** application-cli-builder
**Data:** 2026-05-27
**Resultado:** 🟢 GREEN — CA-V1/V2/V3 verdes; REGR #10 verde sem depender do cwd.

## Implementação

A validação de flag desconhecida do subcomando passou a rodar **antes** de `buildContext` (load
de state). Antes a ordem era `parseDriverFlags → buildContext → cmd.run (validava rest)`.

| Arquivo | Mudança |
| :--- | :--- |
| `cli/registry.ts` | `SubCommand` += `allowedFlags: readonly string[]` |
| `cli/commands/*.ts` (12) | `export const allowedFlags = ALLOWED` — re-exposição pública da allowlist privada |
| `cli/main.ts` | após `parseDriverFlags` e antes de `buildContext`: `parseFlags(rest)` + `validateAllowedFlags(_, cmd.allowedFlags)` → `EXIT_USAGE` (64) em flag desconhecida/duplicada |

## Decisão de design

- **Defense-in-depth (não-duplicação de fonte):** os comandos mantêm sua validação interna
  (`parseFlags` + `validateAllowedFlags`) — continuam corretos se chamados isoladamente (testados
  em `commands/*.test.ts`). A allowlist é **fonte única** (`ALLOWED`, re-exportada como
  `allowedFlags`); `main` valida cedo (antes do I/O) reusando a mesma lista. Não há divergência
  possível entre as duas barreiras.
- **Sem mudança de assinatura** de `cmd.run` nem do fluxo de drivers/`--no-state`/`--driver mysql`.

## Efeito (CAs)

- **CA1/CA2:** `listar-contratos --no-stat` com `cli-state.json` inválido → `EXIT=64` nomeando a
  flag, sem reportar erro de state (load nunca ocorre).
- **CA3:** caminho feliz preservado — suíte CLI 66/66.
- **CA4:** REGR #10 verde independente da presença/ausência do `cli-state.json` (teste hermético).
- **CA5:** distinção 64 (uso) vs 74 (I/O real de state) mantida — quando a flag é válida e o state
  é de fato carregado e inválido, segue `74`.

## Gate (antecipado no W1)

```
node --test tests/modules/contracts/cli/flag-validation-before-state.test.ts → 3/3
node --test --test-name-pattern="REGR #10" ...reports-2026-05-15.test.ts     → 2/2
node --test tests/modules/contracts/cli/**                                    → 66/66
pnpm run typecheck                                                            → limpo
pnpm run lint                                                                 → exit 0
pnpm run format:check                                                         → ok
pnpm test                                                                     → tests 1208 · pass 1192 · fail 0 · skipped 16
```

Lint pegou `strict-void-return`/`no-confusing-void-expression` no arquivo de teste (handlers em
arrow shorthand) — corrigido para blocos com `{}`, alinhado aos helpers existentes.
