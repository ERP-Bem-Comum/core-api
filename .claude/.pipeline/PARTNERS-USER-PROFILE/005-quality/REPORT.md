# W3 — QUALITY · PARTNERS-USER-PROFILE

**Skill:** ts-quality-checker · **Resultado:** GREEN (escopo do ticket)

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| `pnpm run lint` (`eslint .`) | ✅ zero erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `node --test tests/modules/partners/**/*.test.ts` | ✅ **217/217** |
| `pnpm test` (global) | 1843 testes · **1811 pass** · 16 fail (todas pré-existentes de infra) |

## Ajustes feitos durante o W3

1. **format** — `prettier --write` nos arquivos novos do agregado user-profile (domínio + use cases +
   testes). Nenhuma mudança de lógica. typecheck e lint passaram de primeira.

## Verificação de fronteira

`grep` confirmou **zero import de `auth/domain/` ou `modules/auth`** no agregado user-profile — ADR-0006
respeitado (referência ao user só via `UserRef` do shared kernel).

## Falhas pré-existentes (fora de escopo)

`pnpm test` global: **16 falhas, todas** em `tests/infra/mysql-compose.test.ts` (`CTR-DB-COMPOSE-MYSQL`,
CA-3..CA-19). Idênticas às dos tickets anteriores; independem deste ticket (domínio + app + InMemory).

## Veredito

Gate do ticket **GREEN**. Ticket pronto para fechar.
