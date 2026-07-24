# REPORTS-DEMOGRAPHICS-GATE-ALIGN — escopo (o gate dos gráficos desce para `collaborator:read`)

> Size **S**. Os 3 gráficos demográficos não apareciam **em nenhum ambiente** (localhost nem
> produção). Causa: gate mais restritivo que o da tabela, protegendo menos dado.

## Problema

| Rota | Mostra | Exigia |
| :-- | :-- | :-- |
| `GET /reports/team` (tabela) | linha por pessoa, **com nome**, raça, gênero, idade | `collaborator:read` |
| `GET /reports/team/demographics` (gráficos) | só contagens — **ninguém identificável** | **`collaborator:read-sensitive`** |

A tabela mostra **mais** e exige **menos**. Os gráficos ficavam vazios porque ninguém tem a permissão
mais restritiva — e conceder esbarraria na #496 (`sync-permissions` só cobre o papel `admin-sistema`).

## Causa-raiz

O `readSensitive` nasceu no `REPORTS-TEAM-DEMOGRAPHICS` sob a premissa de que o dado demográfico seria
**protegido** (mundo do carve-out do ADR-0053 e do k-anonimato). A P.O. **reverteu as duas decisões**
— a régua virou *replicar o legado, que era aberto*. O gate ficou órfão da decisão que o justificava,
e virou sobra, do mesmo tipo que o k=5 era.

## Decisão (P.O., 2026-07-20)

Gate dos gráficos = **`collaborator:read`**, o mesmo da tabela. Uma linha em `plugin.ts`.

- Quem vê a tabela nominal já vê tudo que os gráficos mostram, e mais — trancar o agregado não
  protegia nada.
- Resolve localhost **e** produção sem depender de conceder permissão (bloqueado pela #496).
- Coerente com a régua: o legado não segregava.
- Nivela a assimetria da **#497** na direção certa enquanto tudo é aberto.

**O que NÃO muda:** `collaborator:read-sensitive` segue no catálogo (`PermissionCatalog`) e em
`COLLABORATOR_PERMISSION.readSensitive`. A segregação volta no **redesenho do RBAC**, aplicada aos
**dois** endpoints juntos, com critério de LGPD.

## Critérios de aceite

- **CA1** Com `collaborator:read` → **200** nos gráficos (mesmo gate da tabela).
- **CA2** Sem permissão nenhuma → **403**. A rota **não** vira pública.
- **CA3** Permissões são **planas**: `read-sensitive` sozinho (sem `read`) → 403. Documentado para
  ninguém assumir hierarquia inexistente.
- **CA4** `readSensitive` continua no catálogo e em `COLLABORATOR_PERMISSION` (o redesenho do RBAC vai usá-lo).
- **CA5** Regressão zero.

## Fora de escopo
Redesenho do RBAC (#497), `sync-permissions` (#496), export CSV (#482).
