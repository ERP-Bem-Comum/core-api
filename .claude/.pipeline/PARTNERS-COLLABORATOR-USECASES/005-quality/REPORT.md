# W3 — QUALITY · PARTNERS-COLLABORATOR-USECASES

**Skill:** ts-quality-checker · **Resultado:** GREEN (escopo do ticket)

## Gates

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| `pnpm run lint` (`eslint .`) | ✅ zero erros |
| `pnpm run format:check` (`prettier --check .`) | ✅ All matched files use Prettier code style |
| `node --test tests/modules/partners/**/*.test.ts` | ✅ **142/142** (suíte partners completa) |
| `node --test .../collaborator-usecases.test.ts` | ✅ **19/19** (suíte do ticket) |

## Ajustes feitos durante o W3

1. **typecheck (TS2322)** — `DeactivateCollaboratorOutput.collaborator` era `InactiveCollaborator`, mas
   o domínio `Collaborator.deactivate` **não estreita** o retorno (devolve `Collaborator`, diferente de
   `Supplier.deactivate`). Alinhado o output ao domínio (`Collaborator as CollaboratorAggregate` para
   evitar choque com o namespace `import * as Collaborator`). Domínio fechado **não** foi tocado.
2. **lint (`no-use-before-define`)** — `validCmd` referenciava `baseCmd` definido abaixo; reordenado.
3. **format** — `prettier --write` no arquivo de teste.

> O runner `--experimental-strip-types` (W0/W1) **não faz typecheck** — só remove tipos. Por isso o
> TS2322 só apareceu no gate `tsc` do W3. Comportamento esperado.

## Falhas pré-existentes (fora de escopo)

`pnpm test` (suíte global) acusa **16 falhas, todas** em `tests/infra/mysql-compose.test.ts`
(`CTR-DB-COMPOSE-MYSQL`, CA-3..CA-19). São o gate de infra que orquestra `docker compose` próprio e
exige ambiente específico (container `bemcomum-mysql`, portas, secrets) — **independente deste ticket**,
que é application pura + adapter InMemory, sem tocar Docker/compose/MySQL. Gap de ambiente conhecido
(mesma classe de `test:integration` que exige invocação manual).

## Veredito

Gate do ticket **GREEN**. Ticket pronto para fechar.
