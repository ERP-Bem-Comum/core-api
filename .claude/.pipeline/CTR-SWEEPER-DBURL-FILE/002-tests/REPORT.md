# W0 — CTR-SWEEPER-DBURL-FILE — REPORT (RED) ✓

**Outcome:** RED · **Agente:** tdd-strategist (+ `nodejs-runtime-expert` para o padrão de leitura de secret file)

## Teste RED

`tests/jobs/contracts/sweeper/config.test.ts` — 8 casos cobrindo a tabela de semântica da decisão CA5 (#50):

| Caso | Cenário | Esperado |
|---|---|---|
| CA1 | `URL` setada, `_FILE` ausente | usa a env direta |
| CA1b | `URL=""` (vazia) + `_FILE` setada | vazia conta como ausente → usa `_FILE` (não ambíguo) |
| CA2 | `_FILE` → arquivo com trailing `\n` (FS real + default reader) | `connectionString` sem `\n` |
| CA3 | ambas setadas | `err('sweeper-ambiguous-connection-config')` |
| CA4 | nenhuma | `err('sweeper-missing-connection-string')` |
| CA5 | `_FILE` + arquivo ilegível (reader → `err`) | `err('sweeper-unreadable-connection-file')` |
| CA6 | `_FILE` + arquivo vazio (reader → `ok('')`) | `err('sweeper-unreadable-connection-file')` |
| CA7 | URL via `_FILE` + `SWEEP_BATCH_SIZE` | `batchSize` respeitado |

## Evidência RED

```
SyntaxError: The requested module '#src/jobs/contracts/sweeper/config.ts'
  does not provide an export named 'defaultConnectionFileReader'
✖ tests 1 · pass 0 · fail 1
```

RED genuíno por **inexistência da API**: `config.ts` ainda não exporta `defaultConnectionFileReader`/`ConnectionFileReader`, não aceita o reader como 2º parâmetro, e os erros `sweeper-ambiguous-connection-config`/`sweeper-unreadable-connection-file` não existem no union.

## Padrão a implementar no W1 (nodejs-runtime-expert — opção (a))

- `type ConnectionFileReader = (path: string) => Result<string, 'unreadable'>`.
- `defaultConnectionFileReader` = `readFileSync(path, 'utf8').trim()` em `try/catch → Result` (síncrono no boot one-shot = idiomático).
- `readJobConfig(env, readFile = defaultConnectionFileReader)` — XOR/exclusividade num só lugar; `run.ts` inalterado.
- `.trim()` vive no reader (a borda FS), não no `readJobConfig`.
