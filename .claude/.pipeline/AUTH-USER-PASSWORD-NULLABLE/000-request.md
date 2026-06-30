# AUTH-USER-PASSWORD-NULLABLE — migrar `passwordHash` placeholder → `PasswordHash | null`

> **Origem:** supersede o PR #7 (`fix/auth-user-password-optional`, criado 2026-06-02), que ficou
> conflitante com `dev` depois que a spec 005 entregou o caminho do placeholder. Reaproveitar o
> design do #7 — ele já tinha W0→W3 verde no seu próprio contexto.

## Problema

`dev` modela usuário sem credencial local (federado/OIDC/convite) com um **placeholder**
`unusablePasswordHash`/`dummyPasswordHash` (bytes aleatórios por boot) no campo
`passwordHash: PasswordHash` — sempre presente. Funciona e está testado (005 verde), mas o tipo
**mente**: afirma haver hash quando semanticamente não há. A abstração não conta a verdade.

## Objetivo

Migrar o domínio para `passwordHash: PasswordHash | null` (deliberadamente `| null`, não `?` —
força o compilador a tratar a ausência em todo consumidor; fail-closed por tipo), eliminando o
placeholder. Alinha com o estilo DDD/branded-type do projeto (`ts-domain-modeler`).

## Escopo (arquivos esperados)

- `src/modules/auth/domain/identity/user/types.ts` — `passwordHash: PasswordHash | null`.
- `src/modules/auth/application/use-cases/authenticate-user.ts` — branch `passwordHash === null`
  → verify dummy anti-timing → `invalid-credentials` (espelha o ramo "usuário inexistente").
- `src/modules/auth/application/use-cases/change-password.ts` e `confirm-password-reset.ts` —
  tratar `null` (federado não troca senha local).
- `src/modules/auth/application/use-cases/create-user-by-admin.ts` — remover dependência
  `unusablePasswordHash`; criar com `passwordHash: null`.
- `src/modules/auth/adapters/persistence/mappers/user.mapper.ts` — `null ↔ NULL` na coluna.
- `src/modules/auth/adapters/persistence/schemas/mysql.ts` — coluna `password_hash` nullable +
  migration (conferir CHARSET/COLLATE/CHECK à mão, ADR-0020).
- `src/modules/auth/adapters/http/composition.ts` — remover wiring `dummyPasswordHash` como
  `unusablePasswordHash` (manter o `dummyPasswordHash` que `authenticate-user` usa anti-timing).

## Critérios de aceitação

- CA1: usuário federado (`passwordHash: null`) **nunca** autentica por senha; resposta uniforme
  anti-enumeração (mesmo timing/erro do usuário inexistente).
- CA2: `change-password`/`confirm-password-reset` rejeitam usuário sem credencial local com erro
  de domínio dedicado (EN kebab-case).
- CA3: round-trip Drizzle preserva `null` (coluna `password_hash` nullable).
- CA4: nenhum resquício de `unusablePasswordHash` no wiring; o `dummyPasswordHash` anti-timing
  permanece.
- CA5: gate W3 verde + `test:integration:auth` verde.

## Fora de escopo

- Fluxo de login federado em si (OIDC handshake) — só a modelagem da ausência de senha local.

## Referência

PR #7 fechado apontando para este ticket. Diff original do #7 serve de ponto de partida para W1.
