# W3 — QUALITY · PARTNERS-COLLABORATOR-PERSISTENCE

**Skill:** ts-quality-checker · **Resultado:** GREEN (escopo do ticket)

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros (covariância do `parseNullable` compila) |
| `pnpm run lint` (`eslint .`) | ✅ zero erros |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `node --test tests/modules/partners/**/*.test.ts` | ✅ **157/157** |
| `pnpm test` (global) | 1783 testes · **1751 pass** · 16 fail (todas pré-existentes de infra) |

## Ajustes feitos durante o W3

1. **format** — `prettier --write` nos arquivos gerados pelo `drizzle-kit` (`meta/0002_snapshot.json`,
   `meta/_journal.json`) e nos testes novos. Nenhuma mudança de lógica.

> typecheck e lint passaram de primeira (diferente do ticket de usecases, onde o `tsc` pegou um TS2322).
> O `parseNullable` com `ParseFn<T>` (erro fixado em `string`) compila — covariância do `Result` em E confirmada.

## Falhas pré-existentes (fora de escopo)

`pnpm test` global acusa **16 falhas, todas** em `tests/infra/mysql-compose.test.ts`
(`CTR-DB-COMPOSE-MYSQL`, CA-3..CA-19) — gate de infra que orquestra `docker compose` próprio. Idênticas
às do ticket anterior; independem deste ticket. Filtro `grep -v 'CA-|mysql-compose'` não retorna nenhuma
falha adicional.

## Integração (gated — não rodada)

A suíte `collaborator-repository.drizzle.test.ts` (6 testes) roda só com `MYSQL_INTEGRATION=1` via
`pnpm run test:integration:partners` (já estendido). **Não executada** no W3 para não alterar/zerar
(`docker compose down -v`) o container `bemcomum-mysql` do usuário sem autorização. Gap conhecido,
mesmo padrão de supplier/financier. O mapper round-trip (unit, 14 testes) cobre a tradução row↔domínio.

## Veredito

Gate do ticket **GREEN**. Ticket pronto para fechar.
