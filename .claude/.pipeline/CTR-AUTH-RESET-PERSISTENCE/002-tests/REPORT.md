# W0 — Tests (RED)

`tests/modules/auth/adapters/persistence/password-reset-token-repository.inmemory.test.ts` (novo):
- save + findByTokenHash devolve o token; hash inexistente → null.
- findUnusedByUserId retorna só os não consumidos do usuário (filtra usados + outros usuários).

RED: port + adapter InMemory não existiam.

Integração MySQL (repo Drizzle real) não exercida — porta 3306 ocupada por container alheio.
A estrutura do repo Drizzle espelha `refresh-token-repository.drizzle.ts` (validado em integração).
