# Mapa de worktrees — backlog needs-decision (2026-06-18)

> Apontamentos para criar worktrees em paralelo a partir das 12 issues `needs-decision`
> agrupadas em hierarquia válida (épico → feature → sub-issue) no GitHub.
> **Regra de ouro do paralelismo:** worktree paralelo só é seguro **entre módulos
> diferentes** (ADR-0014). Mesmo módulo = serial (colisão de migration + mesmo schema).

## Hierarquia criada

```
#64  [EPIC] Financeiro (existente)
├── #89  [feat] Lançar Documento
│   ├── #48   create: competência/emissão/conta-débito + categorização herdada
│   ├── #90   favorecido = qualquer parceiro (payeeRef/payeeKind)
│   ├── #91   expor submitDraft via HTTP (já existia)
│   ├── #147  categorização editável + listagens
│   └── #148  aprovador no create (approverRef)
└── #171 [feat] Conciliação — categorização & extrato (gaps pós-#60)  ← NOVO
    ├── #142  dados de referência (Programa/Categoria/Centro de custo)
    └── #159  política de entryType (union fechado vs string aberta)

#169 [EPIC] Front v2 · paridade com o legado  ← NOVO
├── #112  Dashboard / statistics
├── #113  Budget Plans
└── #114  Reports (parcial — recebíveis bloqueado)

#170 [EPIC] Notifications · E-mail transacional & deliverability  ← NOVO
├── #117  núcleo SMTP/Umbler (entregue; decidir provider)
├── #132  bounce handling via webhook
└── #135  provisionar em deploy (infra)
```

## Frentes de worktree (paralelas)

| # | Frente | Issues | Módulo / prefixo | Migration | Branch sugerida | Independente de |
|---|---|---|---|---|---|---|
| WT-1 | **financial · Lançar Documento** | #48, #90, #147, #148 (+#91) | `financial` / `fin_*` | `0009`–`0012` | `feat/fin-lancar-documento` | todas as outras |
| WT-2 | **financial · Conciliação** | #142, #159 | `financial` / `fin_*` | `0013` (só #159-A) | `feat/fin-conciliacao-gaps` | todas, **menos WT-1** ⚠️ |
| WT-3 | **statistics** (novo módulo) | #112 | `statistics` (greenfield) | própria `0000+` | `feat/statistics-dashboard` | **todas** |
| WT-4 | **budget-plans** (novo módulo) | #113 | `budget-plans` (greenfield) | própria `0000+` | `feat/budget-plans` | **todas** |
| WT-5 | **reports** (novo módulo) | #114 | `reports` (greenfield) | própria `0000+` | `feat/reports` | **todas** |
| WT-6 | **notifications · bounce** | #132 | `notifications` / `notif_*` | conforme | `feat/email-bounce-webhook` | **todas** |
| WT-7 | **infra · e-mail deploy** | #135 | — (não toca `src/`) | n/a | runbook de deploy | **todas** |

WT-3, WT-4, WT-5, WT-6, WT-7 são **100% independentes** entre si e do financial — podem rodar
todas ao mesmo tempo. WT-1 e WT-2 são o **mesmo módulo** (`financial`): só rodam juntas porque a
**faixa de migration foi pré-alocada** (WT-1 = `0009-0012`, WT-2 = `0013`). Sem respeitar a faixa,
repetem a colisão histórica (#83-86 colidiu em `0009`). Quem não gerar migration (#142, #159-B) roda livre.

## Worktrees criados (2026-06-18, base `dev` @ 4841f42)

Os 6 worktrees já existem em `.claude/worktrees/<slug>/` (gitignored). Para trabalhar, **abra um
Claude Code em cada um** (primeira vez por dir aceita o trust dialog; rode `pnpm install` antes dos gates):

```bash
cd .claude/worktrees/fin-lancar-documento  && pnpm install && claude   # feat/fin-lancar-documento · #48/90/147/148 · migrations 0009-0012
cd .claude/worktrees/fin-conciliacao-gaps  && pnpm install && claude   # feat/fin-conciliacao-gaps · #142/159 · migration 0013
cd .claude/worktrees/statistics-dashboard  && pnpm install && claude   # feat/statistics-dashboard · #112
cd .claude/worktrees/budget-plans          && pnpm install && claude   # feat/budget-plans · #113
cd .claude/worktrees/reports               && pnpm install && claude   # feat/reports · #114
cd .claude/worktrees/email-bounce-webhook  && pnpm install && claude   # feat/email-bounce-webhook · #132
```

Remover quando terminar: `git worktree remove .claude/worktrees/<slug>` (+ `git branch -d feat/<slug>`).

> Base = `dev` (fluxo do projeto integra ali; o default de `claude --worktree` seria `origin/main`).
> Não havia `.env`/`secrets/*.txt` locais para copiar — gere com `pnpm run secrets:setup` no worktree
> se for rodar integração. Módulos greenfield (#112/#113/#114) podem depois virar spec SDD via
> `/speckit-specify` (renomeando a branch para `≥018-…`) — a `feat/*` é o ponto de partida.

## Decisões que destravam cada frente (needs-decision)

- **WT-1/#48+#147+#142:** onde vive a fonte canônica de Programa/Categoria/Centro de custo (orçamento? contratos? programas?) — decidir #48/#147/#142 juntos (mesmo dado).
- **WT-1/#90:** `payeeRef`+`payeeKind` vs validar por agregado; partners precisa expor list-fn de Colaborador.
- **WT-1/#148:** `approverRef` no create vs aprovação 100% como ação separada.
- **WT-2/#159:** fechar union EN (+CHECK, migration `0013`) vs oficializar string normalizada.
- **WT-3/#112:** endpoint agregado vs fatiado; período-base das variações; mapear "centro de custo".
- **WT-4/#113:** mapear cenário/calibração/IPCA/CAED; compartilhamento externo entra no v2?
- **WT-5/#114:** ⚠️ **dependência dura** — Recebíveis/Fluxo de Caixa precisam de módulos inexistentes; só os slices de Pagáveis/Equipe/Sem-Contrato/Realizado são fazíveis agora. Fatiar por slice.
- **WT-6/#132 + WT-7/#135:** ambos dependem só da **decisão de provider** (#117 — SMTP vs API HTTP), não um do outro.

## Reagrupamento (merge)

Cada frente funde por **PR independente** (1 módulo por PR) → dev. Sem ordem de merge entre frentes,
**exceto** WT-1 antes de WT-2 se ambas gerarem migration fora da faixa pré-alocada (revisar o `_journal.json`
do `financial` no rebase). Os épicos #169/#170/#171 são o ponto de reagrupamento/rastreio no GitHub.
