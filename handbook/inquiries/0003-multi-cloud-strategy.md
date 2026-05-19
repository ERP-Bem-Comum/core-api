# Inquiry-0003: Estratégia multi-cloud (AWS legado + GCP novo)

- **Status:** Pending Response
- **Opened:** 2026-04-27
- **Closed/Decided:** —
- **Opened by:** Gabriel Aderaldo (via Alessandra Castro)
- **Asked to:** Codebit (infra) — Maria Isabel Martins ou ponto focal técnico
- **Impact:** [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) (atualmente Proposed), `infrastructure/01-infra-handoff.md`

---

## 1. Contexto

Em 2026-04-22, Cadu mencionou em e-mail que o **novo ambiente é GCP** ([Inquiry-0002](./0002-bradesco-van-architecture.md)).

Em 2026-04-27, recebi ticket SGM #95026 da Codebit sobre housekeeping de logs **na AWS** (CloudWatch, CloudTrail, S3, ELB, CloudFront).

Conflito aparente: **legado mora em AWS, novo vai pra GCP**, mas ainda não há confirmação formal nem detalhes operacionais.

Sem clareza sobre:
- Quem opera GCP (Codebit ou outra empresa?).
- Como se comunicam as duas clouds.
- Se haverá interconnect/VPN ou só via internet pública.
- Onde fica o Postgres legado (RDS AWS provavelmente).
- Onde fica a Windows VM com STCPCLT.

---

## 2. Pergunta(s) feita(s)

Mensagem unificada preparada para encaminhamento à Codebit (10 perguntas):

### A. Estratégia de cloud
1. Confirmação: ERP legado roda em AWS hoje?
2. Novo ERP será provisionado em GCP, conforme Cadu?
3. Estratégia é migração definitiva AWS → GCP, ou multi-cloud permanente?
4. Codebit opera AWS e GCP, ou GCP terá outra empresa? Quem é o ponto focal técnico de cada cloud?
5. VPN/interconnect dedicado entre AWS e GCP, ou comunicação via internet pública com TLS?

### B. Bradesco / VAN
6. Windows VM com STCPCLT — fica em AWS ou move para GCP?
7. Migração: lift-and-shift ou recriação?
8. Versão STCPCLT, licenciamento, prazo renovação cert?
9. Odette ID e senha — onde estão guardados?
10. Existe sandbox/homologação Bradesco?

### C. Migração de dados
11. Postgres legado em RDS AWS? Versão? Classe?
12. Quem faz o dump? Em que janela? Para onde vai?
13. Manter dados históricos? Por quanto tempo (lembrando 5 anos fiscais)?

### D. Observabilidade
14. Existe agregador central de logs (Datadog, Splunk, etc.)?
15. Retenção 5 anos para auditoria fiscal já está implementada? Como?
16. Estratégia de tracing distribuído atual?

### E. Coordenação
17. Ferramenta de IaC (Terraform, Pulumi, etc.)?
18. Esteira de CI/CD?

---

## 3. Respostas / Investigação

### Pendente
**Aguardando retorno da Codebit.** Sem essas respostas, ADR-0007 (Multi-cloud) fica em status `Proposed` e não pode ser confirmado.

---

## 4. Análise interna (preliminar)

### Cenários possíveis e implicações

| Cenário | Impacto na arquitetura |
| :--- | :--- |
| AWS → GCP definitiva | ADRs vigentes mantêm-se; só ajusta provider específico (RDS → Cloud SQL) |
| Multi-cloud permanente | ADR-0003 pode precisar revisão (2 Postgres separados) |
| VM Windows fica em AWS | Comunicação cross-cloud GCP → AWS pra cada CNAB; latência + custo |
| VM Windows move pra GCP | Coexistência simplifica, mas precisa migrar STCPCLT/cert |

### Premissa preliminar (a confirmar)

Mais provável: **AWS → GCP como migração definitiva**, com legado vivendo em AWS até desligamento e novo crescendo em GCP. Codebit opera ambas as clouds.

---

## 5. Decisão final

**PENDENTE.** Bloqueador: respostas da Codebit.

**Cronograma esperado:** desejo de resposta em 1-2 dias úteis para começar implementação.

---

## 6. Saídas

- [x] [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) criado em status **Proposed** com pendências documentadas.
- [x] Mensagem unificada preparada e disponibilizada para encaminhamento.
- [ ] Atualizar `infrastructure/01-infra-handoff.md` quando respostas chegarem.
- [ ] Promover ADR-0007 a `Accepted` ou criar substituto após esclarecimento.

---

## 7. Referências

- Ticket SGM #95026 — housekeeping AWS CloudWatch/CloudTrail (Codebit).
- E-mail Cadu mencionando GCP ([Inquiry-0002](./0002-bradesco-van-architecture.md)).
- ADRs vigentes: 0001, 0003, 0004 — premissas que podem precisar revisão.
