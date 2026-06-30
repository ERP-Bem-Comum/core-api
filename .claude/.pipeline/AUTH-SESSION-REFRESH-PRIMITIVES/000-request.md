# AUTH-SESSION-REFRESH-PRIMITIVES (A6a) — primitivos de port para o refresh/rotação

## Origem

Fase A, pré-requisito de **A6b** (`AUTH-USECASE-REFRESH-ACCESS`). Decisões `DD-SESSION-04` (User ativo no refresh)
e `DD-SESSION-05` (reuse detection → revoga cadeia) exigem dois primitivos de port que ainda não existem. Este
ticket entrega **só os primitivos** (port + adapters + contract-suites), sem use case.

## Escopo

### 1. `RefreshTokenMinter.hash(rawToken)`

O A6b recebe o refresh **em claro** do cliente e precisa hasheá-lo para o lookup `findByTokenHash`. A capacidade
de hash é a **mesma primitiva** do `mint` (sha256 hex) — vive no mesmo port.

- **Port** `application/ports/refresh-token-minter.ts`: adiciona `hash: (rawToken: string) => string`.
- **Adapter node** `refresh-token-minter.node.ts`: `hash = sha256(rawToken)` hex (reusa `createHash`).
- **Adapter fake** `refresh-token-minter.fake.ts`: `hash = \`${rawToken}-hash\`` (consistente com a convenção do `mint` fake).

### 2. `RefreshTokenRepository.findRevocableByUserId(userId)`

A reuse detection (DD-SESSION-05) revoga **todos os refresh revogáveis** do usuário. `active` é estado temporal
(DD-SESSION-01) e o repo não tem `Clock` → o filtro armazenável é `revokedAt === null`.

- **Port** `domain/session/refresh-token-repository.ts`: adiciona
  `findRevocableByUserId: (userId: UserId) => Promise<Result<readonly RefreshToken[], RefreshTokenRepositoryError>>`.
- **Adapter InMemory** `refresh-token-repository.in-memory.ts`: varredura por `userId` filtrando `revokedAt === null`.

## Critérios de aceitação

### Minter (estende a contract-suite `refresh-token-minter.contract.ts`)
- **CA1:** `hash(token)` retorna string hex não-vazia.
- **CA2 (invariante-chave):** `hash(mint().token) === mint().tokenHash` — hash e mint usam a mesma função.
- **CA3:** `hash` é determinístico — `hash(x) === hash(x)` para o mesmo input.
- **CA4 (node):** `hash(x) === sha256(x)` hex.

### Repository (estende a contract-suite `refresh-token-repository.contract.ts`)
- **CA5:** `findRevocableByUserId(u)` retorna `[]` quando não há tokens do usuário.
- **CA6:** retorna apenas tokens do `userId` informado (não vaza de outro usuário).
- **CA7:** **exclui** tokens com `revokedAt !== null`; **inclui** `active`, `expired` e `rotated` (todos com `revokedAt === null`).
- **CA8 (regressão):** os CAs existentes de `save`/`findById`/`findByTokenHash` seguem verdes.

## Fora de escopo

- O use case `refreshAccessToken` (A6b). Evento `AccessTokenRefreshed`. Atomicidade da revogação em cascata
  (aceita não-atômica, DD-SESSION-05). `revokeAllByUserId` (recusado — mutação fica no Functional Core do use case).

## Notas

- **Skill:** `ports-and-adapters`. `hash` síncrono (sem `Result` — sha256 não falha). ASCII puro.
- **Pipeline W0→W3.** W0 RED: estender as duas contract-suites + os 2 testes de adapter (`*.node`/`*.fake`/`*.inmemory`).
- Honra: DD-SESSION-01 (estado temporal não vai ao repo), DD-SESSION-04/05, DD-LOGIN-02 (sha256 do refresh).
