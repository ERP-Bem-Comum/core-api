# W3 — Quality Gate

Tudo sob **pnpm 11.5.0** (corepack).

| Gate | Resultado |
| :--- | :--- |
| `pnpm install --frozen-lockfile` | ✅ Already up to date |
| `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| `pnpm run lint` | ✅ (após ignorar `website/`) |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| `pnpm test` (unit/domínio/app) | ✅ 1523 pass · 16 skipped |
| `tests/scripts/only-allow-pnpm.test.ts` | ✅ 7/7 (inclui casos pnpm 11) |
| Supply-chain policy (lockfile, 367 entries) | ✅ passa com a exceção documentada |

## Ressalva — integração não validada nesta sessão

Os 16 `fail` do `pnpm test` são **exclusivamente** o bootstrap de infra `CTR-DB-COMPOSE-MYSQL`
(`tests/infra/mysql-compose.test.ts`, CA-3..19). Causa: o daemon Docker está vivo, então o
skip-guard tenta subir, mas o `pnpm test` puro não cria os `secrets/` (trabalho do
`test:integration`). São **independentes do package manager** — falhariam igual no pnpm 10.

`pnpm run test:integration` **não pôde rodar** nesta sessão: a porta 3306 está ocupada por
um container alheio (`bemcomum-mysql`, up 22h, healthy) que **não foi derrubado** por não
pertencer a este trabalho. Validar a persistência real sob pnpm 11 fica pendente de uma janela
com a 3306 livre (`pnpm run test:integration`).

## Conclusão

Verde em tudo que a migração pnpm 10→11 afeta. Integração MySQL pendente por conflito de
porta externo (não regressão).
