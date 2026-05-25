[← Voltar para ADRs](./README.md)

# ADR-0021: Topologia Cloud — AWS (Codebit) Primária + MagaluCloud PBE Interno (supersedes ADR-0007)

- **Status:** Accepted
- **Date:** 2026-05-22
- **Deciders:** Arquiteto técnico + Decisão executiva da Bem Comum
- **Supersedes:** [ADR-0007](./0007-multi-cloud-aws-gcp.md)

---

## Contexto

O [ADR-0007](./0007-multi-cloud-aws-gcp.md) (Proposed em 2026-04-28) inferiu — a partir de duas fontes independentes (e-mail Cadu mencionando "novo ambiente GCP" e ticket SGM #95026 da Codebit operando AWS) — que a topologia da Fase Strangler Fig seria **legado em AWS + novo em GCP**. A confirmação formal estava bloqueada na [Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md) aguardando retorno da Codebit.

A inferência **não se confirmou**. Em 2026-05-22, três pontos ficaram claros:

1. **Bem Comum quer fornecedor único de infra** — razão financeira/logística: um contrato, uma competência operacional, sem custo dobrado. Bancar duas clouds em produção (uma para dev, outra para prod, ou uma para legado, outra para novo) foi considerado caro demais para o porte do projeto.

2. **Codebit historicamente só opera AWS.** A combinação de (1) + (2) implica: **todo o stack productivo vive em AWS**.

3. **A coexistência Strangler Fig continua válida** ([ADR-0001](./0001-strangler-fig-over-rewrite.md)) — legado precisa rodar durante 12-24 meses de migração. A diferença é que agora roda **dentro do mesmo VPC AWS** que o `core-api` novo, não em cloud separada.

Mas a equipe (nós, **não** Bem Comum e **não** Codebit) **continua querendo MagaluCloud**, com escopo radicalmente diferente do GCP que o ADR-0007 imaginava:

- **Não** é cloud de produção alternativa.
- **Não** é cloud do "novo" enquanto AWS é do "legado".
- **É** um ambiente de homologação/PBE interno, sem dados reais, custeado pela equipe.
- **É** uma ponte de early-access para Bem Comum experimentar features antes de virem para produção AWS.

Analogia útil: **PBE (Public Beta Environment) da Riot Games**. Jogadores fazem login no PBE para testar patches antes de irem para os servidores live. Mesmo modelo: stakeholders da Bem Comum acessam MagaluCloud para validar releases antes de chegarem ao AWS produtivo.

---

## Decisão

**Topologia "AWS-primary + MagaluCloud-PBE":**

| Cloud | Patrocinador | Escopo | Conteúdo |
| :--- | :--- | :--- | :--- |
| **AWS** (operada pela Codebit) | Bem Comum | Produção real (legado + novo) | `legacy-api` (NestJS atual), `core-api`, `bff-gateway`, MySQL `legacy` (com dump), MySQL `core`, VM Windows com STCPCLT (Bradesco VAN), S3 para documentos ([ADR-0019](./0019-document-storage-s3-with-minio-dev.md)), observabilidade (CloudWatch/CloudTrail/S3/ELB/CloudFront — vide ticket SGM #95026). |
| **MagaluCloud** (operada pela equipe) | Equipe de desenvolvimento (nós) | PBE/homologação interno; early-access para Bem Comum | Builds preview do `core-api` + `bff-gateway`. **Sem** dump de banco legado. **Sem** dados reais ou pessoais. **Sem** integração Bradesco real (apenas sandbox/fake). Banco MySQL DBaaS da MGC com dataset sintético. |

**Estratégia de longo prazo:** AWS permanece como única cloud produtiva indefinidamente. Quando o legado for completamente estrangulado, ele desliga **dentro do mesmo AWS**, não há "saída de AWS para outra cloud" como o ADR-0007 cogitava. MagaluCloud segue ativa enquanto a equipe achar útil ter PBE separado da produção.

**Critério de promoção:** mudanças validadas no PBE MagaluCloud podem ser promovidas para AWS produção via pipeline de release (CodePipeline ou equivalente — decisão tática posterior).

---

## Consequências

### Positivas

- **Operação simplificada em produção** — uma cloud, um fornecedor (Codebit), um IAM, uma VPC, uma observabilidade. Auditoria fiscal cross-período ([ADR-0017](./0017-correlation-keys-cross-period-audit.md)) fica dentro do mesmo provider, sem fragmentação.
- **Zero latência cross-cloud em produção** — chamadas `bff-gateway` → `legacy-api`, `core-api` → MySQL `legacy`, e Outbox cross-módulo ([ADR-0015](./0015-mysql-outbox-pattern.md)) ficam todas no mesmo VPC. A §"Negativas" do ADR-0007 (latência GCP↔AWS, custo de egress AWS↔GCP) evapora.
- **Zero gap de segurança cross-cloud** — Inquiry-0012 §4.2 ("postura de segurança do legado incompatível com exposição cross-cloud") perde a premissa. Sem necessidade de VPN AWS↔GCP, sem TLS server cert no legado, sem Cloud Interconnect. Comunicação interna via security groups.
- **PBE isolado** — equipe pode quebrar coisas no MagaluCloud sem risco para produção. Bem Comum pode experimentar sem assinar nada.
- **Bem Comum não paga MagaluCloud** — early-access vem como cortesia/diferencial da equipe, não como linha extra no contrato.
- **MagaluCloud é provider brasileiro** — latência baixa para usuários BR (PBE é acessado de BR), suporte em PT-BR (`handbook/reference/magalu-cloud/index.md` já documenta), preços competitivos no plano BRL.

### Negativas

- **Vendor lock-in profundo em AWS** — `core-api` herda VPC, IAM patterns, observabilidade legada da AWS. Migrar daqui no futuro custaria duas vezes (legado + novo, ambos em AWS) em vez de uma só.
- **Perde a aposta GCP de longo prazo** que o e-mail do Cadu insinuava — se Bem Comum revisitar essa estratégia, vai ser revolução, não evolução.
- **Falha de região AWS pega ambos os sistemas simultaneamente** — sem isolamento físico cross-cloud entre legado e novo (ADR-0007 §Positivas perdida).
- **Equipe carrega o custo do PBE MagaluCloud** — pequeno (DBaaS + VM básica + object storage), mas sai do bolso da equipe. Justificado por valor de early-access.
- **PBE não exercita 100% do cenário produtivo** — sem legacy real no PBE, certas integrações cross-período (auditoria fiscal por exemplo) não podem ser validadas lá. Validação real precisa acontecer em staging dentro do próprio AWS, antes da prod.

### Neutras

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) (Strangler Fig) mantém-se inteiro — a figueira agora cresce dentro do mesmo VPC da árvore antiga.
- [ADR-0002](./0002-keep-nodejs-runtime.md) / [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) (Node 24 + TS 6) — runtime independente de cloud.
- [ADR-0005](./0005-thin-bff-gateway.md) (BFF burro) — segue válido, agora roteando dentro do mesmo VPC AWS.
- [ADR-0008](./0008-bradesco-integration-architecture.md) (Bradesco VAN) — VM Windows com STCPCLT fica confirmada em AWS, eliminando uma das pendências do ADR-0007.
- [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (S3 + MinIO dev) — segue válido. MinIO no Docker para dev local + S3 em AWS produção. PBE MagaluCloud usa **object-storage** da própria MGC (compatível S3), não S3 da AWS — adapter `@aws-sdk/client-s3` aponta para endpoint MGC via env config.

---

## Alternativas Consideradas

### A. Manter ADR-0007 como originalmente proposto (AWS legado + GCP novo)

**Rejeitada.** A premissa de fornecedor único da Bem Comum invalida. GCP exigiria contrato adicional, competência operacional adicional, custo de egress AWS↔GCP em todas as chamadas BFF → legacy, gap de segurança documentado em Inquiry-0012 §4.2.

### B. Tudo AWS, sem PBE

**Rejeitada.** Não exclui o desejo da equipe de ter PBE isolado para early-access. Forçaria PBE dentro do AWS produção (mais um conjunto de recursos AWS para a equipe pagar, com configuração para isolar de prod). MagaluCloud entrega isso mais barato e fora do contrato Bem Comum.

### C. Tudo MagaluCloud

**Rejeitada.** Bem Comum tem contrato com Codebit e Codebit só opera AWS. Trocar provider de produção exigiria renegociação de contrato e treinar Codebit em MGC — escopo fora de alcance.

### D. Multi-cloud permanente AWS + outra cloud para produção

**Rejeitada (de novo).** Era a alternativa B do ADR-0007 original e segue rejeitada pela mesma razão: custo operacional 2× sem benefício documentado para Bem Comum.

---

## Implicações nos ADRs vigentes

| ADR | Status após esta decisão |
| :--- | :--- |
| [0001](./0001-strangler-fig-over-rewrite.md) Strangler Fig | ✅ Mantém — figueira cresce dentro do mesmo AWS |
| [0002](./0002-keep-nodejs-runtime.md) / [0009](./0009-node-24-typescript-6-with-7-roadmap.md) Node 24 | ✅ Mantém |
| [0005](./0005-thin-bff-gateway.md) BFF burro | ✅ Mantém — agora rota intra-VPC |
| [0006](./0006-modular-monolith-core-api.md) Modular Monolith | ✅ Mantém |
| [0007](./0007-multi-cloud-aws-gcp.md) Multi-cloud AWS+GCP | ❌ **Superseded by 0021** |
| [0008](./0008-bradesco-integration-architecture.md) Bradesco | ✅ Mantém — VM Windows confirmada em AWS, pendência resolvida |
| [0015](./0015-mysql-outbox-pattern.md) Outbox MySQL | ✅ Mantém — Outbox cross-módulo agora 100% intra-VPC, sem latência cross-cloud |
| [0017](./0017-correlation-keys-cross-period-audit.md) Auditoria cross-período | ✅ Mantém (Proposed independente) |
| [0019](./0019-document-storage-s3-with-minio-dev.md) S3 + MinIO | ✅ Mantém — PBE MagaluCloud usa **MGC object-storage** (S3-compat) via endpoint config, sem mudar o adapter |

---

## Quando Re-avaliar

Esta decisão deve ser revisitada (gerando ADR novo) se:

1. **Bem Comum decidir trocar Codebit por outro fornecedor** que não opere AWS.
2. **Custo operacional do PBE MagaluCloud** crescer ao ponto da equipe não querer mais bancar.
3. **AWS sofrer incidente regulatório/sanção** que impeça operação no Brasil.
4. **MagaluCloud deixar de oferecer** algum serviço crítico para o PBE (DBaaS MySQL, object-storage, VMs).
5. **Bem Comum** explicitamente solicitar PBE em ambiente próprio (deixa de ser cortesia da equipe).

---

## Referências

- [ADR-0007](./0007-multi-cloud-aws-gcp.md) — superseded por este. Histórico preservado.
- [Inquiry-0003](../../inquiries/0003-multi-cloud-strategy.md) — fechada como `Decided` em 2026-05-22, apontando para este ADR.
- [Inquiry-0002](../../inquiries/0002-bradesco-van-architecture.md) — e-mail Cadu mencionando "GCP" (interpretado em retrospectiva como expressão genérica de "cloud nova", não compromisso técnico).
- [Inquiry-0012](../../inquiries/0012-bff-managed-api-gateway-vs-fastify.md) — §4.2 sobre cross-cloud security deixa de ser bloqueio; inquiry pode ser revisitada em ticket separado.
- Ticket SGM #95026 (Codebit, 2026-04-27) — confirmação de AWS no legado, agora estendida para todo o stack.
- [handbook/reference/magalu-cloud/](../../reference/magalu-cloud/) — documentação oficial da MGC (computing, object-storage, network, security) que embasa decisão de viabilidade do PBE.
