# Inquiry-0003: Estratégia multi-cloud (AWS legado + GCP novo)

- **Status:** Decided
- **Opened:** 2026-04-27
- **Closed/Decided:** 2026-05-22
- **Opened by:** Gabriel Aderaldo (via Alessandra Castro)
- **Asked to:** Codebit (infra) — Maria Isabel Martins ou ponto focal técnico (a maioria das perguntas técnicas ficou sem retorno; decisão final veio de fonte alternativa, ver §3)
- **Impact:** [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) (Superseded por [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md))

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

### 2026-05-22 — Decisão executiva da Bem Comum (substitui retorno técnico da Codebit)

A resposta às perguntas A1–A5 (estratégia de cloud) não veio da Codebit. Veio da própria **Bem Comum**, como **decisão executiva** baseada em critério financeiro/logístico:

> A Bem Comum quer **fornecedor único de infra**. Codebit é o fornecedor atual e só opera AWS. Portanto, **todo o stack produtivo fica em AWS** — legado, `core-api`, `bff-gateway`, MySQL `legacy` (com dump), MySQL `core`, VM Windows do STCPCLT, S3 de documentos. Sem GCP.

Implicações diretas das perguntas A1–A5:

| Pergunta | Resposta |
| :--- | :--- |
| A1 — ERP legado roda em AWS hoje? | ✅ Sim (mantido). |
| A2 — Novo ERP em GCP, conforme Cadu? | ❌ Não. O e-mail do Cadu mencionando "GCP" é reinterpretado como expressão genérica de "cloud nova" (compromisso técnico não confirmado). **Novo também em AWS**. |
| A3 — Migração AWS → GCP ou multi-cloud permanente? | ❌ Nenhuma. **AWS é definitiva** para produção. |
| A4 — Codebit opera ambas as clouds? | Não aplicável. Apenas AWS. |
| A5 — VPN/Interconnect AWS↔GCP? | Não aplicável. Sem cross-cloud em produção. |

**Adição não-Bem-Comum (iniciativa da equipe):** entra **MagaluCloud (MGC)** como ambiente PBE/homologação interno — custeado pela equipe (não Bem Comum, não Codebit), sem dump de DB legado, sem dados reais, para early-access. Analogia: PBE da Riot Games.

As perguntas B (Bradesco/VAN), C (Migração de dados), D (Observabilidade) e E (Coordenação) permanecem em aberto operacionalmente, mas sua resposta agora é **moldada por dentro do mesmo VPC AWS** — o que simplifica todas elas (sem latência cross-cloud, sem egress, IAM unificado, observabilidade já existe em CloudWatch/S3/ELB/CloudFront).

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

**Decided em 2026-05-22:** topologia **AWS-primary (Codebit) + MagaluCloud-PBE (equipe)**, formalizada em [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) que supersedes [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md).

**Bloqueador original** (aguardar Codebit) foi **substituído** por decisão executiva da Bem Comum (ver §3). As perguntas B/C/D/E continuam relevantes operacionalmente, mas dentro do escopo simplificado de uma única cloud — viram trabalho de implementação, não bloqueio arquitetural.

---

## 6. Saídas

- [x] [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) criado em status **Proposed** com pendências documentadas (2026-04-28).
- [x] Mensagem unificada preparada e disponibilizada para encaminhamento (2026-04-28).
- [x] [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) criado em status **Accepted** (2026-05-22) substituindo ADR-0007.
- [x] ADR-0007 marcado como **Superseded by ADR-0021** (2026-05-22).
- [ ] Atualizar `infrastructure/01-infra-handoff.md` para refletir AWS-único + MagaluCloud PBE (próximo ticket).
- [ ] Confirmar com Codebit operação técnica das peças remanescentes (perguntas B/C/D/E) — agora simplificadas por serem intra-AWS.
- [ ] Provisionar PBE MagaluCloud (ticket operacional separado, fora do escopo do `core-api` por ora).

---

## 7. Referências

- Ticket SGM #95026 — housekeeping AWS CloudWatch/CloudTrail (Codebit).
- E-mail Cadu mencionando GCP ([Inquiry-0002](./0002-bradesco-van-architecture.md)).
- ADRs vigentes: 0001, 0003, 0004 — premissas que podem precisar revisão.
