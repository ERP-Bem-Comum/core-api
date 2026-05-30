---
sidebar_position: 2
title: Camadas e regras
description: As regras invariantes de domain, application e adapters — e o porquê de cada uma.
---

# Camadas e regras

Cada módulo tem quatro camadas com responsabilidades estritas. As regras abaixo são
**invariantes** — valem para todo `.ts` da respectiva pasta, sem exceção. Elas vivem
em `.claude/rules/` no repositório; aqui está a narrativa do _porquê_.

## `domain/` — o coração puro

O domínio é onde mora a regra de negócio, e **só** ela. Nada de banco, HTTP, S3 ou
framework.

- **`throw` é proibido.** Toda operação que pode falhar devolve `Result<T, E>`, com `E`
  sendo uma união de erros literais (`'contract-not-active'`). Erros são valores que o
  compilador obriga você a tratar — não exceções que escapam silenciosamente.
- **Sem `class`, `this` ou `any`.** Tipos são `Readonly<{}>`, operações são funções
  livres. Estado muda por cópia via spread, nunca por mutação.
- **Branded types com smart constructors.** Um `CPF` não é `string` — é
  `Brand<string, 'CPF'>`, e a única forma de criar um é pelo construtor que valida e
  devolve `Result`. Dados inválidos não conseguem existir.
- **Discriminated unions + `switch` exaustivo.** Estados e comandos têm um campo `type`
  discriminante. O `default` do switch usa `const _: never = x` — se alguém adicionar
  uma variante e esquecer de tratá-la, **o compilador quebra**.

:::warning Anti-padrão
`throw new Error(...)` no `default` de um switch exaustivo. Use `const _: never = x` —
a exaustividade tem que ser garantida em tempo de compilação, não de execução.
:::

## `application/` — orquestração sem regra

A camada de aplicação **coordena**, mas não decide regra de negócio. Se um `if` decide
estado de negócio, ele pertence ao domínio.

- **Use case é uma factory:** `(deps) => (input) => Promise<Result<O, E>>`. As
  dependências chegam como ports (type contracts), nunca como imports de infra.
- **Sequência canônica:** `validar → fetch → domain → persist → publish event`.
  Sempre nessa ordem. Eventos só são publicados **depois** que `repo.save` confirma.
- **União de erros completa** no tipo de retorno. Nada de engolir erro.

## `adapters/` — a única fronteira com o mundo

É aqui — e só aqui — que existe infraestrutura real: Drizzle/mysql2, S3, Fastify, CLI.

- **`try/catch` é permitido**, mas **converte para `Result` na borda**. O erro de
  exceção morre no adapter; para cima sobe sempre um `Result`.
- **Cada port tem ≥ 2 adapters:** um `InMemory` (testes, CLI, validação rápida) e um
  real (Drizzle, S3). O `composition root` escolhe qual usar por **driver**
  (`memory` | `mysql`).

## `public-api/` — o contrato entre módulos

O único ponto que outro módulo pode importar. Expõe eventos versionados (decoder v1) e,
quando há borda HTTP, o plugin/composition. Importar `contracts/domain/` de dentro de
`financial/` é uma violação direta do ADR-0006.

## A tabela de fronteiras

| De \ Para   | domain | application | adapters | public-api (outro módulo) |
| :---------- | :----: | :---------: | :------: | :-----------------------: |
| domain      |   ✅   |     ❌      |    ❌    |            ❌             |
| application |   ✅   |     ✅      |    ❌    |            ❌             |
| adapters    |   ✅   |     ✅      |    ✅    |            ✅             |

A direção das setas conta a história: a infraestrutura conhece o domínio, mas o domínio
nunca conhece a infraestrutura. É a **regra da dependência** invertida — e é o que
torna o domínio testável sem subir banco nenhum.
