# AUTH-REPO-SESSION — Port `RefreshTokenRepository` + InMemory

## Origem

Fase A, ticket A3 (fecha os repos). Decisão `DD-PORTS-01`: repo no domínio (§3.H.2), 1 port. Espelha A1/A2.

## Arquivos a criar

- `src/modules/auth/domain/session/refresh-token-repository.ts` — port + `RefreshTokenRepositoryError`.
- `src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts` — `makeInMemoryRefreshTokenStore()`.
- `tests/modules/auth/adapters/persistence/refresh-token-repository.contract.ts` — `runRefreshTokenRepositoryContract`.
- `tests/modules/auth/adapters/persistence/refresh-token-repository.inmemory.test.ts`.

## Contrato (type)

```ts
type RefreshTokenRepositoryError = 'refresh-token-repo-unavailable';
type RefreshTokenRepository = Readonly<{
  save:            (token: RefreshToken) => Promise<Result<void, RefreshTokenRepositoryError>>;
  findById:        (id: RefreshTokenId)  => Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>>;
  findByTokenHash: (tokenHash: string)   => Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>>;
}>;
```

> `findByTokenHash` é o lookup do fluxo de refresh: o use case hasheia o refresh em claro recebido e busca.
> `findByUserId` (revogar todas as sessões) entra quando "logout all" for requisito — YAGNI.

## Critérios de aceitação (contract-suite vs InMemory)

- **CA1:** `save(token)` → `findById(token.id)` retorna o token.
- **CA2:** `findById` inexistente → `ok(null)`.
- **CA3:** `save(token)` → `findByTokenHash(token.tokenHash)` retorna o token.
- **CA4:** `findByTokenHash` inexistente → `ok(null)`.
- **CA5 (upsert):** `save` de mesmo `id` após `revoke` → `findById` reflete `revokedAt != null`.

## Fora de escopo
- Adapter Drizzle/MySQL (Fase P). `findByUserId`. Split (RefreshToken: 1 port).

## Notas
- **Skill:** `ports-and-adapters`. Padrão idêntico a A1/A2 (port async, InMemory `Map`, factory sync-ou-async, `clear` com chaves). ASCII puro. RED: `*.inmemory.test.ts` falha.
