# W3 — QUALITY · PARTNERS-COLLABORATOR-LIST-FILTERS

**Skill:** ts-quality-checker · **Resultado:** GREEN (escopo do ticket)

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| `pnpm run lint` (`eslint .`) | ✅ zero erros (após remover `clock` morto do teste) |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `node --test .../collaborator-list-filter.test.ts` | ✅ **14/14** |
| `node --test tests/modules/partners/**/*.test.ts` | ✅ **180/180** |
| `pnpm test` (global) | 1806 testes · **1774 pass** · 16 fail (todas pré-existentes de infra) |

## Ajustes feitos durante o W3

1. **lint (`no-unused-vars`)** — `clock`/`Clock`/`PlainDate` declarados no teste mas não usados (query
   não consome `Clock`). Removidos.
2. **format** — `prettier --write` no teste.

## Falhas pré-existentes (fora de escopo)

`pnpm test` global: **16 falhas, todas** em `tests/infra/mysql-compose.test.ts` (`CTR-DB-COMPOSE-MYSQL`,
CA-3..CA-19). Idênticas às dos tickets anteriores; independem deste ticket (query pura na application).
Filtro `grep -v 'CA-|mysql-compose'` não retorna falha adicional.

## Veredito

Gate do ticket **GREEN**. Ticket pronto para fechar.
