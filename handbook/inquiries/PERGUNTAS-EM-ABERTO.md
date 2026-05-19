[← Voltar ao README de Inquiries](./README.md)

# ❓ Perguntas em Aberto

> Consolidação de **todas as perguntas pendentes** extraídas das inquiries com status `Open` ou `Pending Response`. Este arquivo é gerado a partir das inquiries-fonte e serve como _checklist_ executivo — para detalhe, contexto e fundamentação, sempre voltar ao arquivo original linkado em cada bloco.

- **Última atualização:** 2026-05-14 (síntese pós-comentários 11–14 da Codebit/Samuel + descoberta do schema legado)
- **Inquiries cobertas:** [0003](#inquiry-0003--estratégia-multi-cloud-aws--gcp), [0011](#inquiry-0011--auditoria-fiscal-cross-período-strangler-fig), [0012](#inquiry-0012--bff-aws-api-gateway-managed-vs-fastify-burro), [0014](#inquiry-0014--schema-legado-vs-modelo-alvo)
- **Total de perguntas em aberto:** 28 _(8 da 0003 resolvidas, 3 parciais; +7 novas da 0014 após descoberta do schema)_

---

## Visão geral

| Inquiry | Status | Aguardando | Bloqueia | # perguntas |
| :--- | :--- | :--- | :--- | ---: |
| [0003](./0003-multi-cloud-strategy.md) | `Mostly Decided` | Codebit (Samuel Ribeiro) — itens residuais + acessos | Provisionamento real (gap orçamentário R$ 142,76 → R$ 982,93 com Caratti); reescrita do [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) como "Strangler cross-cloud GCP→AWS transitório, alvo AWS sa-east-1"; abertura da **Inquiry-0013** (conectividade cross-cloud) | 10 |
| [0011](./0011-auditoria-fiscal-cross-periodo.md) | `Open` | Banca interna (squad) | Schema de `core.fin_documentos` no marco M3; promoção do [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) para `Accepted` | 6 |
| [0012](./0012-bff-managed-api-gateway-vs-fastify.md) | `Decisão de fato (formalizar)` | Banca + DevOps + dono do legado | Diagrama do Samuel já adota **Hipótese A** (API Gateway managed → core-api em ECS). Formalizar **ADR-0018** (`Proposed`) e marcar [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md) como `Superseded` | 5 |
| [0014](./0014-schema-legado-vs-modelo-alvo.md) | `Open` | Banca interna + P.O. | (Q1) Revisão do [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) — não há campos NFe no legado; (Q2) BC novo de Planejamento Orçamentário (gap); (Q3) política de migração de `contracts`; (Q4) confirmação do primeiro vertical slice (Identity & Access recomendado) | 7 |

---

## Inquiry-0003 — Estratégia multi-cloud (AWS + GCP)

> **Origem:** [`0003-multi-cloud-strategy.md`](./0003-multi-cloud-strategy.md)
> **Aberta em:** 2026-04-27
> **Destinatário:** Codebit — Maria Isabel Martins / Samuel Ribeiro (ponto focal técnico)
> **Por que importa:** sem essas respostas, [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) (Multi-cloud AWS + GCP) fica em `Proposed` e o provisionamento real não pode começar.

### 🆕 Síntese 2026-05-14 — pivôs descobertos via comentários da Codebit

A premissa original do [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) (**"legado AWS → novo GCP"**) está **invertida**. O diagrama do Samuel (comentários 11–14 do ticket) e o achado da `going2` confirmam:

- **Legado roda em GCP** (`legacy-api` no box do GCP). _Inverte A1._
- **Novo ERP é provisionado em AWS** — conta `270011658274`, região `sa-east-1`. _Inverte A2._
- **Estratégia real:** Strangler Fig **cross-cloud GCP→AWS transitório**, alvo final AWS. _Refina A3._
- **Pivô de runtime:** core-api roda em **ECS em EC2** (aplicação já containerizada), não EC2 puro. Diagrama: API Gateway em public subnet, ECS em private subnet, EC2 Windows STCPCLT em public subnet. _Impacta [02-system-topology.md](../architecture/02-system-topology.md) §3/§5 e converge com Hipótese A da [Inquiry-0012](#inquiry-0012--bff-aws-api-gateway-managed-vs-fastify-burro)._
- **Estratégia de repositórios:** **multi-repo** (Codebit recomenda — "segregação das pipelines e melhor organização"). _Impacta o [ADR-0012](../architecture/adr/0012-package-manager.md) e demanda novo ADR de estratégia git._
- **Gap orçamentário:** valor previsto R$ 142,76 → real R$ 982,93. **Bloqueia provisionamento** até aprovação do Caratti.

**Ações disparadas:**
1. Falar com Caratti sobre o gap R$ 142,76 → R$ 982,93 (sem aprovação, Samuel não provisiona).
2. Liberar acesso de leitura ao(s) repositório(s) para `codebit-br` no GitHub.
3. Compartilhar pasta **DUMP PROD** (Drive da Nicole Ruivo, 30/abr) com `samuel.ribeiro@codebit.com.br`.
4. Confirmar à Codebit que a diretriz de **multi-repo** foi aceita.
5. Abrir **Inquiry-0013** — conectividade cross-cloud GCP↔AWS (A5 segue omisso no diagrama).
6. Reescrever/superceder [ADR-0007](../architecture/adr/0007-multi-cloud-aws-gcp.md) como "Strangler cross-cloud transitório, alvo AWS sa-east-1".

### A. Estratégia de cloud

- [x] **A1.** ~~ERP legado em AWS?~~ → **Não.** Legado roda em **GCP** (going2/Cadu/Nicole). Pergunta original partia de premissa invertida.
- [x] **A2.** ~~Novo ERP em GCP?~~ → **Não.** Novo ERP provisionado em **AWS** `sa-east-1`, conta `270011658274` (operada pela Codebit).
- [x] **A3.** Estratégia: **Strangler Fig cross-cloud GCP→AWS transitório**, alvo final AWS. Não é multi-cloud permanente.
- [x] **A4.** **Codebit** opera AWS (Samuel Ribeiro como ponto focal técnico). **going2** (Cadu / Nicole Ruivo) cuida do legado e do GCP.
- [ ] **A5.** Haverá VPN/Interconnect dedicado entre GCP e AWS, ou comunicação via internet pública com mTLS? _Diagrama do Samuel mostra conexão cross-cloud direta sem explicitar o canal._ → **Promover para [Inquiry-0013](./0013-cross-cloud-connectivity.md)** (a criar).

### B. Bradesco / VAN

- [x] **B6.** VM Windows com STCPCLT — **AWS** (EC2 Windows, public subnet, `sa-east-1`).
- [x] **B7.** Migração: **AWS MGN** (lift-and-shift) como abordagem primária; recriação como fallback.
- [ ] **B8.** Versão do STCPCLT confirmada como **STCPCli 4.0 (Riversoft)** _(via manual)_. **Pendente:** condições de licenciamento e prazo de renovação do certificado.
- [x] **B9.** **Odette ID** e senha configurados diretamente na VM (resposta do Cadu em 2026-04-22). ⚠️ **Risco operacional:** valores enviados por email em 2026-05-06 — recomendar rotação e migração para secret manager (AWS Secrets Manager) antes do go-live.
- [ ] **B10.** Existe sandbox/homologação Bradesco? _Sem resposta._

### C. Migração de dados

- [x] **C11.** ~~Postgres em RDS AWS?~~ → **Não.** Engine confirmada como **MySQL 8.4 LTS em RDS** _(ver [Inquiry-0010](./0010-mysql-engine-correction.md))_, mesma instância com 2 databases, collation `utf8mb4_unicode_ci`.
- [ ] **C12.** **Parcial.** Dump produzido por **Nicole Ruivo / going2** e disponibilizado em pasta do Drive em 2026-04-30. **Pendência:** compartilhamento efetivo com `samuel.ribeiro@codebit.com.br` para que a Codebit possa fazer o restore.
- [ ] **C13.** Manter dados históricos por 5 anos fiscais? _Sem resposta — deslocar para [Inquiry-0011](#inquiry-0011--auditoria-fiscal-cross-período-strangler-fig)._

### D. Observabilidade

- [ ] **D14.** Existe agregador central de logs (Datadog, Splunk, etc.)? _CloudWatch nativo da AWS está implícito mas não confirmado._
- [ ] **D15.** Retenção de 5 anos para auditoria fiscal já está implementada? Como?
- [ ] **D16.** Estratégia de tracing distribuído atual?

### E. Coordenação

- [ ] **E17.** Ferramenta de IaC (Terraform, Pulumi, etc.)? _Samuel mencionou "preparação para o provisionamento" sem nomear a ferramenta._
- [ ] **E18.** **Parcial.** Estratégia de repositórios: **multi-repo** (decisão da Codebit). Codebit monta a CI/CD após receber acesso de leitura aos repositórios — esteira em si (GitHub Actions? GitLab CI? CodePipeline?) ainda não nomeada.

> ✅ **Status atualizado:** 8 perguntas com resposta concreta, 3 parciais, 7 ainda em aberto. Saiu de `Pending Response (~17 dias)` para `Mostly Decided`. **Bloqueador residual:** aprovação do gap orçamentário com Caratti + entrega dos acessos (repos + dump) à Codebit.

---

## Inquiry-0011 — Auditoria fiscal cross-período (Strangler Fig)

> **Origem:** [`0011-auditoria-fiscal-cross-periodo.md`](./0011-auditoria-fiscal-cross-periodo.md) — §7 "Pontos onde gostaria de orientação explícita"
> **Aberta em:** 2026-05-07
> **Destinatário:** Banca interna de arquitetura (squad de engenharia)
> **Por que importa:** chave de correlação entre `legacy.*` e `core.fin_documentos` precisa ser definida **antes** do desenho do schema do marco M3 — janela de oportunidade fechando. Hipótese de trabalho do autor: **Hipótese D** ("Adiar com gatilho explícito + chave de correlação preservada hoje").

- [ ] **7.1.** Existe um padrão estabelecido na literatura para "auditoria cross-período em sistemas sob Strangler Fig", ou cada equipe inventa do zero? Caso exista, qual a referência? Newman trata Reporting Database em geral (p. 115) mas **não** trata o caso especificamente cross-temporal de migração.
- [ ] **7.2.** A escolha entre **Reporting Database** (Newman) e **Read Model CQRS** (Vernon) para o nosso caso é uma diferença real ou superficial? Em ambos projetamos via worker, em ambos o consumidor é externo ao domínio, em ambos o schema é estável e versionado. A diferença está apenas em **onde** o database vive (terceiro DB vs schema dentro do core), ou há propriedades arquiteturais mais profundas?
- [ ] **7.3.** A chave de correlação `cnpj_emitente + numero_documento_original` é suficiente, ou tem armadilhas (CNPJ que se reorganiza, numeração reiniciada, série fiscal, chave NF-e 44 dígitos)? Existe padrão consolidado no domínio fiscal brasileiro? _(Reconhecida em §C.9 como **fora do corpus técnico** — validação direta com contabilidade.)_
- [ ] **7.4.** Se adotarmos **Hipótese C (Read Model CQRS)**, qual é a recomendação para o **bootstrap dos dados pré-existentes**? As três alternativas — (i) ETL one-shot direto na tabela / (ii) eventos sintéticos no `legacy.outbox` / (iii) projeção que lê direto do legado — têm trade-offs documentados, ou cada equipe escolhe ad hoc?
- [ ] **7.5.** Latência de Read Model: para reporting fiscal, qual é o limite aceitável? Há jurisprudência (literal ou de comunidade) sobre apresentar a um auditor um dado com lag de minutos vs segundos vs imediato? _(Reconhecida em §C.9 como **fora do corpus técnico**.)_
- [ ] **7.6.** **Pergunta principal.** Qual seria a recomendação da banca — **A**, **B**, **C**, **D** ou um híbrido? Qual a sequência temporal recomendada? A hipótese de trabalho do autor é **D agora, B como solução-alvo no gatilho**. É razoável, ou tem armadilhas não enxergadas?

> 📎 **Próximo passo se a banca aprovar a Hipótese D:** promover [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) de `Proposed` para `Accepted`, adicionar parágrafo em [`01-migration-strategy.md §6`](../architecture/01-migration-strategy.md), incluir 3 colunas em `core.fin_documentos` e registrar entrada no [`CHANGELOG.md`](../CHANGELOG.md).

---

## Inquiry-0012 — BFF: AWS API Gateway managed vs. Fastify burro

> **Origem:** [`0012-bff-managed-api-gateway-vs-fastify.md`](./0012-bff-managed-api-gateway-vs-fastify.md) — §6 "Perguntas em aberto (para a banca)"
> **Aberta em:** 2026-05-07
> **Destinatário:** Banca interna + DevOps (Codebit) + dono do legado
> **Por que importa:** bloqueia o skeleton do `bff-gateway` e pode `supersede` o [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md). Decisão recomendada (a confirmar): **Hipótese A** — API Gateway managed substitui o BFF Fastify, com restrições estritas ancoradas em Newman §3.2 e §3.3.

> 🆕 **Atualização 2026-05-14:** o diagrama do Samuel (comentários 11–14 do ticket de provisionamento) **já adota Hipótese A de fato** — API Gateway em public subnet termina diretamente no `core-api` (ECS em EC2, private subnet). Parte significativa da deliberação está acontecendo no ticket sem ADR formal. **Próximo passo imediato:** formalizar **ADR-0018** (`Proposed`), marcar [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md) como `Superseded by ADR-0018`, e reescrever [`02-system-topology.md`](../architecture/02-system-topology.md) §3/§5 com o runtime real (ECS em EC2, não EC2 puro).

> 🆕 **Confirmação adicional via schema legado (2026-05-14):** análise do dump real (`database/.dump/schema-only.sql`) confirma TypeORM 0.3 + NestJS no legado. Adicionar `app.setGlobalPrefix('api/v1')` no `main.ts` é literalmente **uma linha** (a frase do §6.1 não era retórica) — viabiliza Hipótese A sem refactor estrutural. Ver [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md).

---

## Inquiry-0014 — Schema legado vs. modelo alvo

> **Origem:** [`0014-schema-legado-vs-modelo-alvo.md`](./0014-schema-legado-vs-modelo-alvo.md)
> **Aberta em:** 2026-05-14
> **Destinatário:** Banca interna de arquitetura + P.O.
> **Por que importa:** a análise do schema real (`database/.dump/schema-only.sql` derivado do dump da Cloud SQL) revelou que o legado **não modela documento fiscal** — só "fluxo financeiro de obrigações". Isso muda a base empírica do [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) e abre gap de BC novo no handbook (Planejamento Orçamentário não está em [`../domain/02-context-map.md`](../domain/02-context-map.md)).
> **Documento mestre:** [`../domain/10-mapeamento-legado-schema.md`](../domain/10-mapeamento-legado-schema.md).

### Q1. Chave de correlação cross-período (impacta ADR-0017 e Inquiry-0011)

- [ ] **Q1.1.** A chave de correlação deve ser repensada como **"id_legado + tipo_origem + createdAt_legado"** (tripla simbólica) em vez de chave fiscal natural?
- [ ] **Q1.2.** O [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) precisa ser revisado/superseded, ou só a justificativa precisa atualização?
- [ ] **Q1.3.** A auditoria fiscal cross-período passa a depender de **manter o legado vivo + readonly indefinidamente**? Isso muda o desenho do Strangler Fig.

### Q2. Modelagem de `categorization` e BC novo de Planejamento Orçamentário

- [ ] **Q2.1.** Existe um **BC "Planejamento Orçamentário"** que deveria estar no handbook e foi omitido?
- [ ] **Q2.2.** Ou esse comportamento é uma **funcionalidade transversal** que será descontinuada/repensada no modelo novo?
- [ ] **Q2.3.** Sem decidir Q2, **não é possível migrar Financial Core** — `payables` e `receivables` aparecem em `categorization` e perderiam sentido analítico sem ela.

### Q3. Migração de `contracts` legado → "Contrato Mãe + Aditivos"

- [ ] **Q3.1.** Bootstrap one-shot que cria 1 Contrato Mãe + N aditivos sintéticos "homologados" a partir do snapshot atual?
- [ ] **Q3.2.** Ou legado preservado para "contratos anteriores ao corte" e modelo novo só para contratos pós-go-live?

### Q4. Primeiro vertical slice (recomendação: Identity & Access)

- [ ] **Q4.1.** Banca confirma **Identity & Access** (`users` + `collaborators`, ~5 tabelas folha) como primeiro slice, ou prefere começar pela **Integração Bancária** (Bradesco/CNAB) conforme roadmap atual do handbook?

> 📎 **Próximo passo se a banca confirmar as 4 hipóteses do autor:** (i) revisar ADR-0017; (ii) criar `domain/11-planejamento-orcamentario-context.md`; (iii) abrir ADR sobre estratégia de bootstrap de contratos; (iv) iniciar implementação do BC Identity & Access no `core-api`.

- [ ] **6.1. Quem aceita a mudança no legado?**
   Adicionar `app.setGlobalPrefix('api/v1')` no `main.ts` do legado é **uma linha**, mas contradiz o "não editar" do `sistemas_legado_referencia/`. Precisa de OK explícito do dono do legado e janela de release coordenada com o frontend (`NEXT_PUBLIC_API_URL` rebuild).
- [ ] **6.2. Qual mecanismo de autenticação no API Gateway?**
   Custom Lambda authorizer validando JWT do Zitadel/NextAuth? Cognito? mTLS interno? Pode caber em ADR próprio ou na ADR-0018.
- [ ] **6.3. Como o API Gateway termina no `core-api`?**
   IP público vs **VPC Link** (Private Link → NLB privado → EC2 em Private Subnet, sem IP público). Boa prática AWS é a segunda. Confirmar com DevOps.
- [ ] **6.4. Qual o modo de conectividade cross-cloud até o legado no GCP?**
   VPN/Interconnect ou internet com mTLS? **Abrir Inquiry-0013 dedicada** se a decisão demorar — sobreposição com [Inquiry-0003 §A5](#a-estratégia-de-cloud) e [B6](#b-bradesco--van).
- [ ] **6.5. Custo estimado.**
   API Gateway tem custo por requisição (≈ US$ 3,50 / milhão REST requests + transferência). Para volumes ERP típicos é desprezível, mas vale validar com Codebit em estimativa de tráfego.

> 📎 **Próximo passo se a banca aprovar a Hipótese A:** abrir candidato **ADR-0018** (`Proposed`); marcar [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md) como `Superseded by ADR-0018`; reescrever [`02-system-topology.md`](../architecture/02-system-topology.md) §3 e §5; abrir Inquiry-0013 (Conectividade cross-cloud) como follow-up; nova entrada no [`CHANGELOG.md`](../CHANGELOG.md).

---

## Caminho crítico (atualizado 2026-05-14)

```
   ┌──────────────────────────────┐    ┌─────────────────────────────┐
   │ Gap orçamentário com Caratti │    │ Liberar acessos à Codebit:  │
   │ R$ 142,76 → R$ 982,93        │    │ • repos (codebit-br GitHub) │
   │ ⛔ Bloqueia provisionamento  │    │ • pasta DUMP PROD no Drive  │
   └──────────────┬───────────────┘    └──────────────┬──────────────┘
                  └───────────────┬───────────────────┘
                                  ▼
              ┌────────────────────────────────────┐
              │ Codebit/Samuel provisiona AWS      │
              │ sa-east-1 (conta 270011658274)     │
              │ → ECS em EC2 + API Gateway + RDS   │
              └──────────────────┬─────────────────┘
                                 │
   ┌─────────────────────────────┼──────────────────────────────┐
   ▼                             ▼                              ▼
┌─────────────────┐   ┌───────────────────────┐   ┌────────────────────────┐
│ Inquiry-0013    │   │ Inquiry-0012 → ADR-   │   │ Inquiry-0011 (Banca)   │
│ (a abrir):      │   │ 0018 (formalizar      │   │ decisão A/B/C/D        │
│ conectividade   │   │ Hipótese A) +         │   │ → ADR-0017 (Accepted)  │
│ cross-cloud     │   │ Superseded ADR-0005   │   │                        │
│ GCP↔AWS         │   │                       │   │                        │
└─────────────────┘   └───────────┬───────────┘   └────────────┬───────────┘
                                  │                            │
                                  ▼                            ▼
                  Reescrita 02-system-topology    Schema core.fin_documentos
                  + ADR-0007 superseded            no marco M3
                  (Strangler cross-cloud)
```

**Bloqueador #1 (novo):** Gap orçamentário R$ 142,76 → R$ 982,93. Sem aprovação do Caratti, Samuel não provisiona.
**Bloqueador #2:** Entrega dos acessos `codebit-br` (repos) + compartilhamento da pasta DUMP PROD com `samuel.ribeiro@codebit.com.br`.
**Em paralelo:** Inquiry-0011 e formalização do ADR-0018 (Inquiry-0012) seguem independentes desses bloqueios.

---

## Como atualizar este arquivo

1. Sempre que uma inquiry for fechada (`Decided`), remover o bloco correspondente e atualizar o **total** no topo.
2. Sempre que uma nova inquiry abrir com perguntas pendentes, adicionar bloco aqui referenciando o arquivo-fonte.
3. Marcar perguntas individuais com `[x]` quando respondidas, mesmo antes do fechamento da inquiry — preserva trilha de quais ficam em aberto.
4. Atualizar o campo **Última atualização** no topo.

> 🔁 Este arquivo é um índice executivo — a fonte de verdade continua sendo cada inquiry individual.
