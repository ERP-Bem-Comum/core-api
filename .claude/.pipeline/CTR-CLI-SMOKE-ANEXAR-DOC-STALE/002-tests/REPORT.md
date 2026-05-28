# W0 — RED + diagnóstico

> Outcome: **RED** (já era o estado atual — teste defasado, não regressão).

## Falha observada

`tests/cli/contracts.cli.mysql.test.ts:233` — `CA-6: fluxo Addition completo`:

```
anexar-documento: ❌ Erro desconhecido (código interno: signed-document-not-found).
1 !== 0
```

## Causa raiz (não é regressão)

O ticket `CTR-AMENDMENT-DOCUMENT-LINK` adicionou validação **intencional e correta** em
`src/modules/contracts/application/use-cases/attach-signed-document.ts:65-69`:

```ts
const docLookup = await deps.documentRepo.findById(docIdResult.value);
if (!docLookup.ok) return docLookup;
if (docLookup.value === null) return err('signed-document-not-found');
```

O documento referenciado precisa existir como agregado `ContractDocument` antes do attach.
O teste CA-6 (linha 220-221) usa um `documentId` **fictício** nunca registrado:

```ts
// Anexa documento (UUID fictício — neste ticket o storage não é wired).
const documentId = 'dddddddd-6666-4666-8666-dddddddddddd';
```

→ `findById` retorna `null` → `signed-document-not-found`. **O contrato de produção está
correto**; o teste é que ficou defasado (escrito antes da validação existir).

## Correção esperada (W1) — só em teste

1. Registrar o documento antes do attach via comando `subir-documento` (criado no mesmo
   `CTR-AMENDMENT-DOCUMENT-LINK` justamente para isso): `--parent-tipo Amendment
   --parent-id <amendmentId> --doc-id <documentId>`.
2. Adicionar `ctr_documents` ao `truncateAll` (higiene entre runs — evita doc órfão /
   colisão de PK com o `--doc-id` fixo).

Nenhuma mudança em `src/` — o código de produção permanece como está.

## CA do ticket atendidos por esta correção

- CA1: `CA-6` verde no `test:integration`.
- CA2: a expectativa do teste reflete o contrato atual (documento existente exigido).
