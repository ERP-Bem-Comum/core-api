---
sidebar_position: 3
title: Ports & adapters
description: Como o domínio declara dependências externas como types puros — e como o composition root as resolve.
---

# Ports & adapters

O domínio precisa de coisas do mundo externo: salvar um contrato, guardar um arquivo,
saber que horas são, emitir um token. Mas ele **não pode conhecer** banco nem S3. A
solução é o padrão **ports & adapters**: o domínio declara o _contrato_ da dependência;
os adapters fornecem a _implementação_.

## Port é um type, não uma interface com implementação

Um port é apenas um type contract — um `Readonly<{}>` de funções que devolvem `Result`.
Exemplos reais do projeto:

- `ContractRepository`, `AmendmentRepository`, `DocumentRepository`
- `DocumentStorage` (S3/MinIO, ADR-0019)
- `EventBus` / `OutboxPort` (ADR-0015)
- `Clock`, `TokenIssuer`

A aplicação recebe esses ports como dependências; nunca importa a implementação.

## Cada port tem pelo menos dois adapters

Esta é a parte que paga dividendos todos os dias:

- **InMemory** — usado em testes e na CLI. Roda sem Docker, sem banco, sem rede.
  Permite a P.O. validar regra de negócio na CLI antes de qualquer infra real existir.
- **Real** — Drizzle/mysql2 para persistência, `@aws-sdk/client-s3` para storage, etc.

Como o domínio só conhece o type, trocar um pelo outro é transparente. Os testes de
domínio e application rodam **sem subir banco nenhum**.

## O composition root resolve por driver

Quem decide qual adapter usar é o **composition root**, no momento do bootstrap:

- **CLI:** `cli/context.ts`
- **HTTP:** `adapters/http/composition.ts`

A escolha é por **driver**: `--driver memory` monta tudo InMemory; `--driver mysql`
monta os adapters reais com pool de conexão. Mesmo use case, mesma regra de negócio —
só muda quem implementa o port.

```bash
# Valida a regra de negócio sem banco
pnpm run cli:contracts -- listar-contratos

# Mesmo comando, agora contra MySQL real
pnpm run cli:contracts -- listar-contratos \
  --driver mysql \
  --connection-string 'mysql://user:pass@127.0.0.1:3306/core'
```

## Read/write split (ADR-0026)

O adapter de persistência MySQL ainda separa pool de **escrita** (writer) e **leitura**
(reader), deixando o sistema pronto para topologia master-slave sem mudar uma linha de
domínio ou application. A separação é transversal e invisível para as camadas de cima —
exatamente o ponto do padrão.

:::tip Fonte
A skill canônica de ports é `ports-and-adapters`; a de schema Drizzle é
`drizzle-schema-author`. Detalhes normativos em `.claude/rules/` e nos ADRs 0019, 0020
e 0026.
:::
