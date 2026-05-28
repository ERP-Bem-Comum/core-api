# CTR-CLI-VALIDATE-FLAGS-BEFORE-STATE — flag desconhecida deve falhar (64) antes de carregar state

## Origem

Sugestão 🔵 #2 do W2 de `CTR-PIPELINE-SUPERSEDE-STATUS`
(`.claude/.pipeline/CTR-PIPELINE-SUPERSEDE-STATUS/004-code-review/REVIEW.md`). Exposta ao
diagnosticar a falha pré-existente de `tests/regression/reports-2026-05-15.test.ts` (REGR #10) no
W1 daquele ticket.

## Problema

No CLI de Contratos (`src/modules/contracts/cli/`), uma **flag desconhecida** (typo) só é rejeitada
com `EXIT=64` (EX_USAGE) **se** a resolução/carga do state não falhar antes. Quando o state default
(`./cli-state.json`, `DEFAULT_MEMORY_STATE_PATH` em `parse-driver-flags.ts`) existe mas tem schema
inválido, o CLI retorna `EXIT=74` (EX_IOERR, `main.ts:36`) **antes** de reportar a flag — mascarando
o typo.

Evidência (REGR #10, `tests/regression/reports-2026-05-15.test.ts:601`):

- `listar-contratos --xyz=1 --no-state` → `64` ✅ (`--no-state` evita tocar o state).
- `listar-contratos --no-stat` (typo, sem `--no-state`) → **`74`** ❌ (esperado `64`): carrega
  `./cli-state.json` (inválido) e falha em I/O antes de detectar `--no-stat`.

Causa estrutural: tokens não reconhecidos caem em `rest` (`parseDriverFlags`,
`parse-driver-flags.ts:~87`) e a detecção de "flag desconhecida" roda **depois** da resolução do
driver/state. A ordem correta é: **validar flags (sintaxe/desconhecidas) → só então tocar I/O de
state**.

## Critérios de aceitação

- **CA1:** `listar-contratos --no-stat` (sem `--no-state`) retorna `EXIT=64` e nomeia a flag,
  **independente** do conteúdo (ou existência) de `./cli-state.json`. Nenhum I/O de state ocorre
  quando há flag desconhecida.
- **CA2:** Typo de flag **não cria** `./cli-state.json` default (a falha precede qualquer escrita).
- **CA3:** Comandos válidos seguem funcionando (regressão): caminho feliz de `listar-contratos`,
  `criar-contrato` etc. com `--state`/`--no-state`/`--driver mysql` inalterado.
- **CA4:** REGR #10 (`tests/regression/reports-2026-05-15.test.ts`) verde **sem** depender da
  ausência do `cli-state.json` no cwd.
- **CA5:** Erro de uso (64) e erro de I/O (74) permanecem distintos e corretos para os demais casos.

## Fora de escopo

- Mudar os exit codes canônicos (`main.ts:33-36`).
- Validação semântica do conteúdo do state (continua `74` quando o arquivo existe e é usado de fato).

## Notas

- Arquivos prováveis: `src/modules/contracts/cli/main.ts`, `parse-driver-flags.ts`,
  `parse-flags.ts`. Testes: `tests/regression/reports-2026-05-15.test.ts` (REGR #10),
  `tests/modules/contracts/cli/parse-flags.test.ts`.
- Relação histórica: este é o endurecimento do antigo Issue #10
  (`tests/reports/E2E-SECURITY-REVIEW.md` §"Issue #10"), que tratou a flag cair em `rest` mas não
  garantiu a precedência sobre o I/O de state.
