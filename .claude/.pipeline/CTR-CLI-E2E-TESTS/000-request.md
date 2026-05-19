# Ticket CTR-CLI-E2E-TESTS: Suite end-to-end da CLI via `child_process.spawnSync`

> Documentação PT, identificadores EN (regra invariante).

## Contexto

A sessão QA ([`tests/bdd/QA-REPORT.md`](../../../tests/bdd/QA-REPORT.md)) rodou os 5 cenários executáveis manualmente via `pnpm cli:contracts ...`, em sequência com `--state qa-state.json` como cola entre comandos. **Funcionou e validou regras de domínio** — mas o trabalho foi manual e não é repetível em CI.

Este ticket entrega a **suite automatizada equivalente**: `child_process.spawnSync` dispara o `main.ts` da CLI, valida stdout / stderr / exit code de cada cenário, e gera o relatório verde/vermelho no `pnpm test`.

> 📎 Recomendação direta do §5.4 do QA-REPORT.

## Escopo

```
tests/cli/
├── helpers/
│   ├── run-cli.ts          Wrapper de spawnSync com tipos para stdout/stderr/exit
│   ├── temp-state.ts       Gerencia arquivo temporário .json com tmpdir() + cleanup
│   └── extract.ts          Helpers para extrair IDs do output (regex de UUID na saída)
├── fixtures/
│   ├── valid-snapshot.json State conhecido para testes de re-hidratação
│   ├── corrupt-snapshot.json  JSON inválido (Defeito #12)
│   └── invalid-schema.json    Schema errado (Defeito #12, futuro)
└── contracts.cli.test.ts   Suite principal cobrindo BDD 1.1, 1.2, 2.1, 2.2
```

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | `child_process.spawnSync` (não `exec`) | Síncrono, sem stream parsing. Permite assertions inline sem promise hell. |
| D2 | Cada teste isola estado em `os.tmpdir() + crypto.randomUUID()` | Sem race conditions entre testes paralelos. Cleanup via `after()`. |
| D3 | `runCli(...args)` retorna `{ stdout, stderr, exitCode }` | API uniforme, parsing fica no teste. |
| D4 | Disparar via `pnpm cli:contracts --silent` para output limpo (sem prefix de pnpm) | Saída do `main.ts` direto, sem ruído da task runner. |
| D5 | Extrair IDs por regex (`/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/`) em vez de parsear o `--state` JSON | Mais resiliente; o teste valida o output ao usuário humano, que é o contrato real. |
| D6 | Tempo limite por chamada: 30s | Reset rápido se Node prender (não esperado, mas defensivo). |
| D7 | Suite NÃO substitui os testes unitários atuais | Continuamos com testes unit/integration em `tests/modules/...`. E2E foca em **integração de CLI + state file + use cases**. |

## Critérios de aceite

### Cenário BDD 1.1 — Persistência e numeração
- [ ] Roda `criar-contrato` com flags válidas → exit 0.
- [ ] Stdout contém `✅ Contrato criado.` e `Contrato 001/2026`.
- [ ] Stdout contém `Valor original: R$ 100.000,00` e `Valor vigente: R$ 100.000,00`.
- [ ] Stdout extrai UUID v4 como `contractId`.

### Cenário BDD 1.2 — Motor de cálculo
- [ ] Roda sequência `criar-contrato` → `criar-aditivo` → `anexar-documento` → `homologar-aditivo` no mesmo `--state`.
- [ ] Após `homologar-aditivo`: stdout contém `Valor vigente: R$ 105.000,00` (100k + 5k Addition).
- [ ] Stdout do contrato final mostra `Aditivos homologados: 1`.

### Cenário BDD 2.1 — Bloquear homologação sem documento
- [ ] Roda `criar-aditivo` + (NÃO anexa documento) + `homologar-aditivo`.
- [ ] Exit code 1.
- [ ] Stderr contém literalmente `Aditivo precisa ter documento assinado anexado para ser homologado.`

### Cenário BDD 2.2 — Validação de magnitude (kind+magnitude, conforme decisão D3 do BDD)
- [ ] `criar-aditivo --tipo Suppression --valor-centavos 500000` → exit 0 (aceito como magnitude).
- [ ] `criar-aditivo --tipo Suppression --valor-centavos -500000` → exit 1, stderr `money-negative-value`.
- [ ] `criar-aditivo --tipo Suppression --valor-centavos 0` → exit 1, stderr `amendment-impact-value-zero`.

### Side-effects da CLI
- [ ] Após `criar-contrato`, o arquivo `--state` existe e é JSON parseável.
- [ ] Após `--no-state`, nenhum arquivo é criado.
- [ ] `listar-contratos` em state vazio imprime `Nenhum contrato cadastrado.` e exit 0.

### Help / usage
- [ ] `pnpm cli:contracts --help` lista os 6 subcomandos e exit 0.
- [ ] `pnpm cli:contracts subcomando-inexistente` → exit 64, stderr com mensagem.

## Fora de escopo

- Cenários BDD 3 e 4 (HTTP/RBAC) — aguardam adapter HTTP.
- Inspeção do `InMemoryEventBus` via CLI — depende de flag `--verbose-events` (ticket à parte).
- Testes de stress / performance — não-funcional, ticket separado.
- Suite paralela em CI — habilitado depois de N execuções estáveis localmente.

## Restrição operacional

`spawnSync` precisa de `node`/`pnpm` no PATH. Em CI, garantir que `pnpm install` foi executado antes do `pnpm test`.

## Estimativa

~200 linhas de teste + ~80 linhas de helpers. 1 sprint curta.
