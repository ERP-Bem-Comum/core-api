# W3 — Gate de qualidade (#454 gap 3)

> Agente: `ts-quality-checker` · Resultado: **VERDE**.

## Gate

| Comando | Exit |
| :--- | :--- |
| `pnpm run typecheck` | **0** |
| `pnpm run format:check` | **0** |
| `pnpm run lint` | **0** |
| `pnpm test` | **0** |

`pnpm test`: **4146 testes · pass 4123 · fail 0 · skipped 18** (baseline 4116 + 30).

## MySQL real (8.4) — container descartável

O `cost-structure-deactivate` respeita `BUDGET_PLANS_DATABASE_URL` e rodou na **3308**, sem tocar a
infra dev. As suítes de contrato hardcodam `127.0.0.1:3306`, então exigiram a receita documentada:
parar `core-api-mysql` → descartável na 3306 → validar → **restaurar** (feito, `Up (healthy)`
conferido). Nunca `pnpm test:integration:*` — destrói a infra dev.

**28/28**: contrato da árvore nos **2** adapters (com os 2 casos novos de `active`) ·
`cost-structure-deactivate` (CA8) · `drizzle-mysql` · `plan-lifecycle` (sem regressão).

## CAs

| CA | Prova |
| :--- | :--- |
| CA1 | renomeia nos 3 níveis; direção, launchType e filhos intactos |
| CA2 | desativa → volta no GET como inativo, **continua na árvore** (soft) |
| CA3 | Centro inativo → filhos inativos por herança; **a irmã não é afetada** |
| CA4 | reativar o Centro devolve cada filho ao que **ele** era |
| CA5 | plano `APROVADO` → **409** (domínio e borda), guard antes de achar o nó |
| CA6 | nó inexistente **ou de outro plano** → **404** `cost-node-not-found`, nos **6** caminhos |
| CA7 | `name: ''` → 400 (Zod) · `{}` → 400 (`cost-node-patch-empty`) |
| CA8 | subcategoria desativada → `bgp_budget_results` íntegro, id preservado no replace-all |

## Onde a decisão D2 vive

| Camada | Papel |
| :--- | :--- |
| `setActive*` (domínio) | grava **só o nó alvo** — a intenção |
| `costStructureToRows` | persiste a **intenção**, nunca o efetivo |
| `withInheritedActive` + DTO | deriva o **efetivo** na leitura |

Se qualquer um achatasse o efetivo na linha, o CA4 seria irrecuperável. O W2 **provou** que não há
caminho de escrita partindo do DTO: `withInheritedActive` tem 1 importador, e seu retorno é
`CostStructureTreeDto` — tipo que não entra em `save`/`mutate`.

## Migration

3 × `ADD COLUMN active boolean DEFAULT true NOT NULL`, gerada pelo drizzle-kit. `ALGORITHM=INSTANT`
sem hint em 8.4 (o erro 1845 conhecido é de widening de VARCHAR — caso diferente). `boolean` =
TINYINT(1), fora da lista de proibidos do ADR-0020; precedente `par_partners.active`.

## Follow-ups registrados (ADR-0040 — não corrigidos aqui)

- **#469** — a árvore só expõe o `active` **efetivo**; sem `activeSelf`, o switch do front não
  distingue herança de intenção. Consequência direta de D2; não quebra CA.
- **#470** — "desativar" hoje só esconde da árvore: o `POST /budget-results` ainda **aceita**
  subcategoria inativa, e o **CSV** exibe suas linhas sem marca. Precisa de 2 decisões da P.O.

## Ticket

Pronto para `close` e PR. **Front:** ligar os handlers de editar/desativar (feature 061) — outro repo.
