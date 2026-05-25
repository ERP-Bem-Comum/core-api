# Visão Geral

Os boletins de segurança da Magalu Cloud comunicam vulnerabilidades, incidentes e ações recomendadas que podem impactar clientes e workloads hospedados na plataforma.

Cada boletim inclui descrição do problema, produtos afetados, nível de severidade e orientações de mitigação.

---

## Ação Necessária — MC-2026-001 no Kubernetes

Se você utiliza o **Magalu Kubernetes Engine**, é necessária a sua intervenção para aplicar o _patch_ da vulnerabilidade CVE-2026-31431 nos seus Node Pools: [⚠️ Ação Necessária — CVE-2026-31431 no MKE](bulletins/mc-2026-001-mke-action.md)

## Boletins Publicados

| ID | Título | Severidade | Produtos Afetados | Publicado em | Status |
|---|---|---|---|---|---|
| [MC-2026-001](bulletins/mc-2026-001-copy-fail.md) | Copy Fail (CVE-2026-31431) | Alta | Virtual Machines | 01/05/2026 | Ativo |
| [MC-2026-002](bulletins/mc-2026-002-dirty-frag.md) | Dirty Frag (CVE-2026-43284) | Alta | Virtual Machines | 08/05/2026 | Ativo |

---

## Classificação de Severidade

| Nível | Critério |
|---|---|
| **Crítico** | Exploração ativa confirmada ou risco de comprometimento total do ambiente |
| **Alto** | Vulnerabilidade com alto potencial de impacto, sem exploração confirmada |
| **Médio** | Risco limitado ao ambiente do cliente; mitigação recomendada |
| **Baixo** | Impacto mínimo; correção sugerida sem urgência |
