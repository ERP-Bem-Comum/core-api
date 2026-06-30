# W3 — Quality Gate — FIN-CLI-MOSTRAR-TITULO

**Data:** 2026-05-25
**Agente:** ts-quality-checker (main-session)
**Ambiente:** laptop de viagem — **Docker daemon OFFLINE**

---

## Resultado dos 4 checks

| Check | Comando | Resultado |
| :--- | :--- | :--- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ exit 0 |
| Format | `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` (`eslint .`) | ✅ exit 0 (após fix Issue 🟡 #1) |
| Test | `pnpm test` | ⚠️ exit 1 — **falhas exclusivamente ambientais** (ver abaixo) |

## Sugestões do REVIEW aplicadas

- **Issue 🟡 #1** — `money.ts`: NBSP literal → escape ` ` (2 ocorrências: regex + comentário). Lint `no-irregular-whitespace` confirmou a necessidade (quebrava com o literal); resolvido.
- **Sugestão 🔵 1** — `payable.ts`: header agora avisa que o narrow por `if`s **não é TS-exaustivo** e que `status.ts` (Record) é o complemento compile-time.
- **Sugestão 🔵 2** — `status.ts`: comentário precisa "pattern **estrutural**" + nota 7 vs 3 status.
- **Sugestão 🔵 3** — NÃO aplicada: depende de decisão da P.O. ("Pago em" no estado Settled). Registrada para demo real.
- **Sugestão 🔵 4** — já OK como está.

## Testes do ticket (CA-19..25) — 7/7 ✅

```
✔ mostrar-titulo — happy path Open (CA-19)
✔ mostrar-titulo — happy path Approved (CA-20)
✔ mostrar-titulo — happy path PaidFromBank (CA-21)
✔ mostrar-titulo — help (CA-22)
✔ mostrar-titulo — flag obrigatória ausente (CA-23)
✔ mostrar-titulo — invalid id (CA-24)
✔ mostrar-titulo — not found (CA-25)
```

Delta **+7** conforme CA-29.

## Falhas: 100% ambientais (Docker offline)

Todas as falhas estão em `tests/infra/mysql-compose.test.ts` (`CTR-DB-COMPOSE-MYSQL`, CA-2..CA-19):

```
Cannot connect to the Docker daemon at unix:///.../docker.sock. Is the docker daemon running?
```

Esse arquivo sobe `docker compose` e **não tem skip guard** para Docker offline (diferente do `test:integration`, que gateia com `MYSQL_INTEGRATION=1`). É inconsistência pré-existente do setup de testes — **fora do escopo deste ticket**. Zero relação com `mostrar-titulo` (que mexe só em `modules/financial/{cli/formatters,cli/commands,application/use-cases}`).

## Veredito

- **Gate de código: ALL-GREEN** (typecheck + format + lint + 7 testes do ticket).
- **Gate de suíte completa: BLOQUEADO POR AMBIENTE** — requer Docker para `tests/infra/` + `test:integration`.

**Pendente para fechar o ticket** (no PC com Docker, ou ao retomar a viagem):

```bash
open -a Docker            # ou iniciar o daemon
pnpm test                 # esperado exit 0 com Docker rodando
pnpm run pipeline:state wave-finish FIN-CLI-MOSTRAR-TITULO W3 --outcome ALL-GREEN --report 005-quality/REPORT.md
pnpm run pipeline:state close FIN-CLI-MOSTRAR-TITULO
```

> **Sugestão de tech-debt:** abrir `FIN-TEST-INFRA-SKIP-GUARD` — adicionar guard
> `before(() => { if (!dockerAvailable()) ctx.skip() })` em `tests/infra/mysql-compose.test.ts`
> para que `pnpm test` passe sem Docker (testes de infra só rodam quando o daemon existe).
