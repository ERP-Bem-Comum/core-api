# CTR-NODE-SOURCE-MAPS — `--enable-source-maps` nos scripts que rodam `.ts`

## Origem

Auditoria de boas práticas (sessão 2026-05-26), gap Node #2. Com
`--experimental-strip-types`, o Node executa `.ts` removendo os tipos — stack
traces apontam para a linha do JS stripped (whitespace no lugar dos tipos), não
para a linha TypeScript original. Quando o outbox worker crasha, o diagnóstico
fica enganoso.

## Escopo

Adicionar `--enable-source-maps` (Stable, `reference/nodejs/Command-line options.md`)
aos scripts de `package.json` que executam `.ts` em runtime: `test`,
`test:integration*`, `cli:contracts`, `cli:financial`, `secrets:setup`,
`pipeline:*`. Mudança de **config pura** (CLAUDE.md permite config direto), mas
rastreada por ticket a pedido do solicitante.

## Critérios de aceitação

- CA1: todo script que invoca `node ... .ts` inclui `--enable-source-maps`.
- CA2: ordem das flags preserva `--experimental-strip-types --no-warnings`.
- CA3: `pnpm test` continua verde após a mudança.

## Fora de escopo

- Migração de `--experimental-strip-types` para o default Stable do Node 24.12+
  (mudança de doc, não de script — registrada separadamente).
