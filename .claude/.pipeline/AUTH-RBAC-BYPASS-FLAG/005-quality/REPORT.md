# W3 — Gate de qualidade (ADR-0052)

> Agente: `ts-quality-checker` · Resultado: **VERDE**.

## Gate

| Comando | Exit |
| :--- | :--- |
| `pnpm run typecheck` | **0** |
| `pnpm run format:check` | **0** |
| `pnpm run lint` | **0** |
| `pnpm test` | **0** |

`pnpm test`: **4181 testes · pass 4158 · fail 0 · skipped 18** (baseline 4163 + 18).

## CAs

| CA | Prova |
| :--- | :--- |
| CA1 | env ausente / `enforced` → `enforced` |
| CA2 | `AUTH_RBAC_MODE=bypass` → `bypass` |
| CA3 | 9 typos (`1`, `true`, `on`, `off`, `BYPASS`, ` bypass`, `disabled`, `yes`, `no`) → `enforced` (fail-secure) |
| CA4 | bypass: usuário sem `write` cria plano (201) |
| CA5 | enforced (default): mesmo usuário → **403** (não regride) |
| CA6 | bypass: sem token → **401** (autenticação intacta) |
| CA7 | bypass libera rota subsequente (o `hasPermission` também bypassa) |
| CA8 | `rbacBypassBanner` travado em teste + conferido no boot real |
| +M1 | bypass: ator sem `user:assign-role` **atribui** a role (auto-gestão liberada) |

## Comportamento entregue (ADR-0052)

`AUTH_RBAC_MODE=bypass` → **todo autenticado é super-usuário**. A autenticação (`requireAuth`)
permanece: sem `Bearer` válido é 401. O bypass é **total** — inclui a auto-gestão de RBAC (atribuir/
revogar papéis, alçada), o que permite se auto-recuperar do #462. Default `enforced` (RBAC
fail-closed); qualquer valor desconhecido também → `enforced`.

## Guardas anti-silêncio (a condição da decisão)

1. **Fail-secure** — só `'bypass'` exato liga; typo nunca abre.
2. **Banner de boot** gritante em stderr quando bypass, com `NODE_ENV` — extraído para função testada.
3. **Default seguro** — ausência da env = `enforced`.

## Trade-off registrado no ADR (aceito pelo dono)

Escalação **persistida**: uma role admin atribuída durante o bypass sobrevive ao desligar. Foi a
escolha explícita entre bypass total (auto-recuperação) × gestão sempre protegida. Reverter =
re-`enforced` + revogar as roles concedidas no período. Uma proteção de **integridade**
(`cannot-self-lockout`) sobrevive ao bypass — não é autorização.

## O que muda em produção

`AUTH_RBAC_MODE=bypass` no ambiente + restart → RBAC desligado, todo logado faz tudo, banner no boot.
Reversível: remover a env (ou `=enforced`) + restart. Sem migração, sem dado. O código do RBAC fica
intacto — é só um modo desligado.

## Follow-up (não implementado — ADR-0052 / W2 M3)

Visibilidade contínua do estado bypass (além do banner de boot) — endpoint **interno** com `rbacMode`,
nunca no `/health` público. YAGNI aceito; registrar se um dia o modo virar permanente.

## Ticket

Pronto para `close` e PR. **Requer o ADR-0052 aceito** (hoje `Proposed`) antes do merge — é decisão de
arquitetura de segurança.
