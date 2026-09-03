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

## 🚦 Estado

Os três ambientes existem e rodam: **local**, **homologação** (Codebit) e **produção**. `dev` é a
branch de integração; `main` é a produção.

> Esta seção não repete quais são nem como estão — o estado de ambiente muda sem que ninguém venha
> editar um README, e a versão anterior deste bloco afirmou por meses que staging e prod não estavam
> provisionados enquanto os dois serviam tráfego. O que vale é o que está no ar; o que este diretório
> documenta é a **planta** (ambientes, secrets, observabilidade), não o **estado**.

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
