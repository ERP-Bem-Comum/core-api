# W1 — Implementação (só em teste)

> Outcome: **GREEN**

Único arquivo tocado: `tests/cli/contracts.cli.mysql.test.ts`. **Nenhuma mudança em
`src/`** — o contrato de produção (`attach-signed-document` exigir documento existente)
está correto.

## Mudança 1 — `truncateAll` inclui `ctr_documents`

Adicionado `TRUNCATE TABLE ctr_documents;` ao reset entre testes (dentro do bloco
`FOREIGN_KEY_CHECKS=0`). Higiene: evita documento órfão / colisão de PK do `--doc-id`
fixo em runs repetidos.

## Mudança 2 — CA-6 registra o documento antes do attach

Inserido passo `subir-documento` entre `criar-aditivo` e `anexar-documento`:

```
subir-documento --driver mysql --connection-string <conn>
  --parent-id <amendmentId> --parent-tipo Amendment --doc-id <documentId>
```

O `documentId` (UUID v4 fixo) agora corresponde a um agregado `ContractDocument`
realmente persistido → `attachSignedDocument` encontra o documento via
`documentRepo.findById` e o attach sucede.
