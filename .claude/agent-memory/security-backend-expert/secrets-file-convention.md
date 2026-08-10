---
name: secrets-file-convention
description: qual é o padrão canônico de secret-por-arquivo no core-api e qual precedente NÃO copiar
metadata:
  type: reference
---

O core-api tem duas camadas de segredo coexistindo, e só uma é o padrão a recomendar em review/design:

- **Padrão certo (copiar):** convenção `<NOME>` XOR `<NOME>_FILE`, função pura que recebe `env` e devolve
  `Result<string, Erro>`, falha explícita em ambíguo/ausente/vazio. Exemplo real:
  `src/jobs/contracts/sweeper/config.ts:50-66` (`resolveConnectionString`, consumindo
  `CONTRACTS_DATABASE_URL_FILE`). O arquivo é montado via Docker Compose `secrets:` top-level em
  `/run/secrets/<name>` (não aparece em `docker inspect`) — ver `compose.yaml:169-172`.
- **Padrão a NÃO copiar, apesar de existir no código:** `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY`
  (`src/modules/auth/adapters/http/jwt-key-config.ts:48-51`) leem o valor PEM direto de env, sem
  variante `_FILE`. É o segredo mais sensível do sistema (chave de assinatura de access token) e usa o
  mecanismo mais fraco dos dois. Não citar isso como "o jeito que o projeto faz" ao desenhar segredo
  novo — citar o `sweeper/config.ts` em vez disso.
- `scripts/setup/secrets.ts` só sabe gerar dois formatos: senha aleatória hex (`randomPassword`,
  `:114`) e connection-string composta (`writeDatabaseUrlSecret`, `:266-286`). Não há geração de par de
  chaves assimétrico (SSH/PEM) nessa ferramenta — se uma feature nova precisar disso (ex.: chave SSH
  para VAN Bradesco), é extensão a construir, não algo que já existe e passou despercebido.

Boot-guard fail-closed em produção (com degradação avisada fora dela) tem molde pronto em
`src/modules/auth/adapters/http/jwt-key-config.ts:84-114` — função pura, `Result`, `exitCode = 78`
(EX_CONFIG) disparado pelo `server.ts`, nunca `console.error`+`process.exit` direto no meio do código.
