[← Voltar ao Handbook](../README.md)

# 🛠️ Infraestrutura

> O que precisa ser provisionado, em quais ambientes, e como operar.

---

## 📚 Documentos

| # | Documento | Audiência |
| :--- | :--- | :--- |
| 01 | [Handoff de Infra](./01-infra-handoff.md) | Time de plataforma / infra |
| 02 | [Ambientes](./02-environments.md) | Dev, DevOps, QA |
| 03 | [Catálogo de Secrets](./03-secrets-catalog.md) | Infra + Security |
| 04 | [Observabilidade — Baseline](./04-observability-baseline.md) | Infra + SRE |

---

## 🚦 Estado Atual

- 🟡 Aguardando provisionamento de **dev** (handoff entregue).
- ⬜ Staging não provisionado.
- ⬜ Prod não provisionado.

---

## 🧭 Princípios

1. **Topologia em staging = topologia em prod.** Sem versão "simplificada" — bugs de concorrência só aparecem em ambiente realista.
2. **Tudo como código.** Provisionamento via IaC (Terraform / Pulumi / equivalente). Mudanças via PR.
3. **Secrets nunca em texto plano.** Sempre via Secrets Manager.
4. **Auditoria desde o dia 1.** Logs, métricas e backups configurados antes do primeiro deploy.
5. **Rollback testado, não suposto.** Restore de backup exercitado em staging antes de prod.

---

## 🔗 Relação com Outras Seções

- [`../architecture/02-system-topology.md`](../architecture/02-system-topology.md) — define **o quê** provisionar.
- [`../architecture/03-data-architecture.md`](../architecture/03-data-architecture.md) — define **como** o banco é estruturado.
- [`../operations/`](../operations/README.md) — runbooks operacionais (a popular conforme produção amadurece).
