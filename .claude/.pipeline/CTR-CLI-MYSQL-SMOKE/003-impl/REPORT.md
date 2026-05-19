# W1 — GREEN — CTR-CLI-MYSQL-SMOKE

**Wave:** W1 (GREEN)
**Skill:** `application-cli-builder`
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — 10/10 CAs GREEN, todos os gates clean

## Gates

| Gate | Resultado |
| :--- | :--- |
| `tests/cli/contracts.cli.mysql.test.ts` isolado | ✅ 10/10 GREEN em 13.8s |
| `pnpm run typecheck` | ✅ exit 0 |
| `pnpm run lint` | ✅ exit 0 |
| `pnpm run format:check` | ✅ All files use Prettier code style |
| `pnpm test` (suite default) | ✅ 433 tests / 422 pass / 0 fail / 11 skipped |
| `pnpm test:integration` (suite completa) | ✅ 57/57 pass em 18s |

## Operações realizadas

1. **`tests/cli/contracts.cli.mysql.test.ts`** entregue (345 linhas) com 10 CAs.
2. **`package.json#scripts.test:integration`** ampliado para incluir o novo arquivo (1 entrada a mais no glob do `node --test`).

## Bugs encontrados e corrigidos durante o W1

Quando rodei a suite pela primeira vez, 5 CAs falharam. Análise:

| CA | Causa raiz | Fix |
| :--- | :--- | :--- |
| CA-4 | Assertion regex `/Listagem MySQL/` — `listar-contratos` mostra **sumário** (`<numero> [<status>] <valor>`), título não aparece | Trocar para `/004\/2026.*\[Ativo\].*R\$\s*100\.000,00/` |
| CA-6 | Flag `--kind` inventada — a CLI usa `--tipo` (PT-BR) | Trocar para `--tipo` |
| CA-7 | Mesma causa do CA-4 (assertion `/Persistência Real/` no sumário) | Trocar para `/007\/2026.*\[Ativo\]/` |
| CA-9 | Mesma causa do CA-6 (`--kind` → `--tipo`) | Trocar para `--tipo` |

Lições:
- A CLI segue convenção PT-BR consistente (`--tipo`, `--contrato`, `--usuario`, `--numero`, `--titulo`, `--objetivo`). Antes de escrever assertions, consultar `--help` do subcomando ou `cli/commands/*.ts:ALLOWED`.
- `listar-contratos` é **sumário**, `mostrar-contrato` é **detalhe**. Assertions devem refletir.

## Correções de lint

`@typescript-eslint/unbound-method` em `await import('node:path')` (`{ resolve, join }` desestruturados de método do object module). Solução: mover para imports estáticos no topo do arquivo.

## CAs do `000-request.md` × resultado

| CA | Status | Tempo |
| :--- | :---: | :---: |
| CA-1: arquivo existe | ✅ | < 1ms |
| CA-2: glob inclui arquivo | ✅ | < 1ms |
| CA-3: criar-contrato exit 0 + saída esperada | ✅ | 900ms |
| CA-4: listar-contratos mostra contrato criado | ✅ | 1.5s |
| CA-5: mostrar-contrato detalhes | ✅ | 1.4s |
| CA-6: fluxo Addition (criar+aditivo+anexar+homologar) | ✅ | 3.3s (5 invocações encadeadas) |
| CA-7: persistência cross-invocation | ✅ | 1.5s |
| CA-8: UNIQUE sequential_number | ✅ | 1.6s |
| CA-9: RN-12 (homologar sem documento) | ✅ | 2.1s |
| CA-10: bad credentials → exit 74 | ✅ | 870ms |

## Configuração entregue

```json
"test:integration": "… node --test --test-concurrency=1 … \
  'tests/modules/contracts/adapters/persistence/migrations/*.test.ts' \
  'tests/modules/contracts/adapters/persistence/mysql-driver.test.ts' \
  'tests/modules/contracts/adapters/persistence/drizzle-mysql.test.ts' \
  'tests/cli/contracts.cli.mysql.test.ts' …"
```

4 globs paralelos no `node --test`, agora cobrindo: migration, driver level, repo level, CLI level. **Cobertura completa da pirâmide de tests do módulo Contratos contra MySQL real.**

## Próximo passo

W2 — REVIEW. Vou fazer self-review consistente com #4/#5.
