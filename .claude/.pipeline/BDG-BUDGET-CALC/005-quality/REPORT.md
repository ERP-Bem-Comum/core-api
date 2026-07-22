# W3 — Gate de qualidade · BDG-BUDGET-CALC (#317)

Skill: `ts-quality-checker`.

## Gates locais — TODOS VERDES ✅
| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` (`tsc --noEmit`) | ✅ zero erros |
| Format | `pnpm run format:check` | ✅ "All matched files use Prettier code style!" |
| Lint | `pnpm run lint` (`eslint .`) | ✅ zero erros |
| Testes | `pnpm test` | ✅ **3607 pass, 0 fail, 18 skipped** (integração gateada) — zero regressão no projeto |

## Integração MySQL real — BLOQUEADA POR INFRA ⏳
`pnpm run test:integration:budget-plans` (script adicionado ao package.json; suíte `budget-plans` no runner —
cobre `cost-structure.drizzle-mysql` da #316 + `budget-result.drizzle-mysql` novo) valida a migration `0002`
+ o mapper contra MySQL 8.4 real.

**Não executável agora:**
- **x99 OFFLINE** — Tailscale: "offline, last seen 23h ago"; ping 100% loss.
- **Docker local DOWN** — Docker Desktop fechado no Mac (o runner faz `docker compose up --wait`).

Não é vermelho de código — é indisponibilidade de infra. Escalado ao humano (política de regressão zero,
saída 3). **O ticket NÃO fecha closed-green até a integração rodar verde.**

## Para destravar (ação do Gabriel)
- (a) `! open -a Docker` → aguardar o daemon → `pnpm run test:integration:budget-plans` (local, Mac); OU
- (b) ligar o x99 + reconectar Tailscale → rodar a integração lá (receita [[mac-dev-x99-docker-runner-tunnel]]).

## Decisão (2026-07-09)
Gabriel autorizou **fechar o ticket** com a integração MySQL real **DEFERIDA** (infra indisponível — x99 offline +
Docker local down). Fechamento honesto: os 4 gates locais estão verdes; a validação da migration `0002` + mapper
contra MySQL 8.4 real fica como **follow-up rastreável** (issue aberta) — a rodar assim que a infra voltar, ANTES de
qualquer deploy que aplique a migration em produção. W3 marcado GREEN pelos gates locais; ressalva registrada aqui.
