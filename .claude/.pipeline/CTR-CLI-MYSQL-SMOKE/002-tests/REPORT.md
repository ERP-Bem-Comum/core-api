# W0 — RED — CTR-CLI-MYSQL-SMOKE

**Wave:** W0 (RED)
**Data:** 2026-05-16
**Status:** ✅ COMPLETED — RED válido

## Arquivo entregue

`tests/cli/contracts.cli.mysql.test.ts` (~345 linhas) — 10 CAs:

| Bloco | CAs | Comportamento offline (sem MYSQL_INTEGRATION) |
| :--- | :--- | :--- |
| Estruturais | CA-1, CA-2 | CA-1 ✔; CA-2 ✖ (glob ainda não atualizado) |
| Smoke real | CA-3..10 | Não registrados (bloco `if (integrationEnabled())` falso) |

## Resultado offline

```
ℹ tests 2 / pass 1 / fail 1
```

CA-2 falha com mensagem precisa: "glob não inclui contracts.cli.mysql.test.ts" — checklist exato do W1.

## Estrutura do test

- **Reuso de `runCli` helper** (`tests/cli/helpers/run-cli.ts`) e `extractUuidAfter` (`extract.ts`) — mesmos padrões do `contracts.cli.test.ts` (memory driver) para consistência.
- **Helpers locais**: `criarContrato(overrides)`, `listarContratos()`, `mostrarContrato(id)` — convenientes para os 6 subcomandos.
- **`truncateAll()`**: TRUNCATE em ordem reversa de FK via `docker exec mysql` — chamado em `beforeEach` para isolamento.
- **Pattern `if (integrationEnabled()) { describe(...) }`**: replicado do `drizzle-mysql.test.ts`. Quando `MYSQL_INTEGRATION≠1`, os 8 CAs funcionais simplesmente não são registrados — sem `t.skip` ruidoso, sem falsos negativos.
- **Conexão fixa**: `mysql://core_app:apppw-migration-test-only@127.0.0.1:3306/core` — bate com o secret file do `test:integration` script.

## Cobertura por CA

| CA | Test | Comando exercitado |
| :--- | :--- | :--- |
| CA-1 | estrutural | (arquivo existe) |
| CA-2 | estrutural | `package.json#scripts.test:integration` |
| CA-3 | runtime | `criar-contrato` (exit + saída PT-BR + UUID extraído) |
| CA-4 | runtime | `listar-contratos` (vê o contrato criado) |
| CA-5 | runtime | `mostrar-contrato --id` (detalhes formatados) |
| CA-6 | runtime | `criar-contrato → criar-aditivo (Addition) → anexar-documento → homologar-aditivo → mostrar-contrato` (valor vigente 100k → 105k) |
| CA-7 | runtime | persistência cross-invocation (2 processos Node consecutivos vêem o mesmo contrato) |
| CA-8 | runtime | UNIQUE sequential_number — 2º `criar-contrato` com mesmo `--numero` falha |
| CA-9 | runtime | RN-12 — `homologar-aditivo` sem antes `anexar-documento` falha |
| CA-10 | runtime | credenciais inválidas → exit 74 (IOERR) com mensagem PT-BR |

## Próximo passo

W1 — GREEN: atualizar `package.json#scripts.test:integration` para incluir `tests/cli/contracts.cli.mysql.test.ts` no glob. Rodar `pnpm test:integration` e validar 10/10 GREEN com Docker MySQL up.
