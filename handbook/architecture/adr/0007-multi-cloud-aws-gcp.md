[← Voltar para ADRs](./README.md)

# ADR-0007: Topologia Multi-Cloud (AWS legado + GCP novo)

- **Status:** Superseded by [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) (2026-05-22)
- **Date:** 2026-04-28
- **Deciders:** Arquiteto técnico (a confirmar com Codebit)

> ⚠️ **Superseded by [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md)** em 2026-05-22.
>
> A inferência "AWS legado + GCP novo" deste ADR não se confirmou. Decisão executiva da Bem Comum estabeleceu **fornecedor único de infra** (Codebit, que só opera AWS) para todo o stack produtivo. Multi-cloud continua existindo, mas com semântica diferente: **AWS para produção + MagaluCloud para PBE/homologação interno (custeado pela equipe, não pela Bem Comum)**.
>
> O conteúdo abaixo é preservado integralmente como histórico de raciocínio (ratio legis). Não usar como referência para decisões atuais — consultar [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md).

---

## Contexto

A migração Strangler Fig ([ADR-0001](./0001-strangler-fig-over-rewrite.md)) cria coexistência longa entre legado e novo. Em 2026-04-28 ficou claro, a partir de duas fontes independentes, que **as duas pernas vivem em clouds diferentes**:

1. **E-mail de Carlos Eduardo (Cadu / Going2)**, em 2026-04-22, mencionando explicitamente o "novo ambiente (GCP)" como destino do `core-api`.

2. **Ticket SGM #95026 da Codebit** (housekeeping semestral), tratando de retenção de logs em **CloudWatch, CloudTrail, S3, ELB e CloudFront** — todos serviços AWS — referindo-se ao ambiente atual da Bem Comum.

A inferência mais provável: **legado em AWS, novo em GCP**. A confirmação formal e detalhes operacionais estão pendentes ([Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md)).

---

## Decisão

**Adotar topologia multi-cloud durante a fase Strangler Fig:**

- **AWS** → ambiente do legado (`legacy-api`, MySQL legado, possivelmente VAN Windows VM, observabilidade existente).
- **GCP** → ambiente do novo (`bff-gateway`, `core-api`, MySQL novo, observabilidade nova).

**Modelo:** AWS → GCP definitiva (legado é estrangulado; AWS desativada quando legado morrer ou repropósito para outros sistemas da Bem Comum se houver).

---

## Status: PROPOSED

Esta decisão **só pode ser promovida a `Accepted`** após confirmação formal da Codebit nos seguintes pontos:

- [ ] Confirmação que legado roda em AWS hoje.
- [ ] Confirmação que novo será provisionado em GCP.
- [ ] Quem opera GCP (Codebit ou outra empresa).
- [ ] Estratégia de comunicação entre clouds (interconnect, VPN ou internet pública com TLS).
- [ ] Localização da VM Windows com STCPCLT (AWS atual ou GCP novo).
- [ ] Localização do MySQL legado (RDS AWS).

> ⚠️ Sem essas respostas, ADRs 0003 e 0004 podem precisar revisão. ADR-0007 fica sob revisão até confirmação.

---

## Consequências (assumindo confirmação)

### Positivas

- **Isolamento físico forte** entre legado e novo — falha de uma cloud não derruba a outra.
- **Cloud nova "limpa"** — sem bagagem operacional do legado.
- **Oportunidade de hardening** durante migração (novas práticas de IAM, secrets, observabilidade).
- **Saída do AWS legado** se Bem Comum decidir consolidar em GCP no futuro.

### Negativas

- **Custo de network egress** entre clouds (AWS → GCP típico de $0.02-0.09/GB).
- **Latência cross-cloud** afeta chamadas BFF → legado durante transição.
- **Operação dupla** durante 12-24 meses da migração.
- **Possível dois fornecedores de infra** (a confirmar) = coordenação extra.
- **Auditoria fragmentada** entre clouds requer agregação central.

### Neutras

- Cada ADR vigente continua válido em essência (decisões lógicas) — implementação física precisa adaptação.
- Padrão Outbox de eventos funciona cross-cloud (eventual consistency é compatível com latência adicional).

---

## Implicações nos ADRs vigentes

| ADR | Status após esta decisão |
| :--- | :--- |
| 0001 (Strangler Fig) | ✅ Mantém — figueira pode crescer em cloud diferente |
| 0002/0009 (Node 24) | ✅ Mantém — runtime independente de cloud |
| 0003 (Schemas isolados) | **Já superseded por 0014** (MySQL databases). Em multi-cloud, possível revisão se 2 MySQL separados forem necessários |
| 0004 (Postgres Outbox) | **Já superseded por 0015** (MySQL Outbox). Outbox cross-cloud é viável mas com latência maior |
| 0005 (BFF burro) | ✅ Mantém — BFF roteia entre v1 (AWS) e v2 (GCP) |
| 0006 (Modular Monolith) | ✅ Mantém — granularidade não muda |

---

## Alternativas Consideradas

### A. Consolidar tudo em uma única cloud (AWS ou GCP)
**Pendente confirmação.** Se confirmado que migração é AWS → GCP definitiva, esta opção é exatamente a escolhida (apenas com fase de coexistência).

### B. Multi-cloud permanente
**Rejeitada (provisória).** Custo operacional 2× sem benefício documentado para a Bem Comum.

### C. Reverter legado para GCP via lift-and-shift antes de iniciar Strangler
**Rejeitada.** Adiciona risco e tempo sem ganho proporcional. Strangler Fig é melhor ataque.

---

## Riscos identificados

| Risco | Severidade | Mitigação |
| :--- | :---: | :--- |
| Latência GCP↔AWS na UX | 🟡 | Otimização: cacheable em BFF onde possível |
| Custo de egress AWS→GCP | 🟡 | Monitorar; limitar chamadas pesadas a v1 |
| Auditoria fragmentada | 🔴 | Agregador central (a definir) |
| VM Windows VAN — em qual cloud | 🔴 | [Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md) cobre |
| Coordenação entre fornecedores | 🟡 | Codebit como ponto único se confirmar |

---

## Quando Re-avaliar

- Após receber resposta completa da Codebit ([Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md)).
- Promover a `Accepted` ou criar ADR substituto.
- Se cenário "multi-cloud permanente" for confirmado, revisar ADRs 0003 e 0004.

---

## Referências

- [Inquiry-0002](../../inquiries/0002-bradesco-van-architecture.md) — primeiro indício de GCP (Cadu).
- [Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md) — pendência aberta com Codebit.
- Ticket SGM #95026 (Codebit, 2026-04-27) — confirmação de AWS no legado.
- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Strangler Fig.
- [ADR-0003](./0003-shared-db-isolated-schemas.md) — pode precisar revisão.
- [ADR-0004](./0004-postgres-outbox-pattern.md) — pode precisar revisão.
