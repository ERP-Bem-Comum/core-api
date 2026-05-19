# 📚 Handbook — ERP Financeiro

> Documentação viva do projeto ERP Financeiro. Cada seção tem propósito claro e índice próprio. Mudanças importantes são registradas no `CHANGELOG.md` e em ADRs.

---

## 🗺️ Como navegar

| Seção | Propósito | Quando consultar |
| :--- | :--- | :--- |
| [`domain/`](./domain/README.md) | Modelo de domínio, BCs, eventos, glossário | Entender **o que** o sistema faz e **por quê** |
| [`architecture/`](./architecture/README.md) | Decisões arquiteturais, topologia, integração | Entender **como** o sistema é construído |
| [`architecture/adr/`](./architecture/adr/README.md) | Registros de decisão (imutáveis) | Auditar uma decisão técnica histórica |
| [`infrastructure/`](./infrastructure/README.md) | Especificação de infraestrutura | Provisionar / operar ambientes |
| [`operations/`](./operations/README.md) | Runbooks, post-mortems, playbooks | Quando algo dá errado em produção |
| [`inquiries/`](./inquiries/README.md) | Log de chamadas, dúvidas e decisões | Auditar **como** chegamos a cada decisão |
| [`domain_questions/`](./domain_questions/) | Histórico de descoberta de domínio | Contexto histórico de decisões de negócio |
| [`guidelines/`](./guidelines/) | Documentação externa (Bradesco, etc.) | Referência de integrações com terceiros |

---

## 🎯 Visão Estratégica

O ERP é organizado em dois módulos de negócio que vivem no mesmo `core-api` (Modular Monolith) e se comunicam por eventos:

### 💰 Módulo Financeiro
> Transforma **documentos fiscais e não fiscais em obrigações financeiras integradas**, automatizando o cálculo de retenções e garantindo a imutabilidade do fluxo de caixa através do conceito de **Fato Gerador**.

Detalhamento em [`domain/DOCUMENTO_MESTRE.md`](./domain/DOCUMENTO_MESTRE.md).

### 📦 Módulo Contratos
> **Automatiza o ciclo de vida contratual**, transformando registros estáticos em um **Estado Contratual Vigente** dinâmico, auditável e baseado em eventos formais de alteração (aditivos).

Detalhamento em [`domain/contratos/DOCUMENTO_MESTRE.md`](./domain/contratos/DOCUMENTO_MESTRE.md).

### 🔗 Como conversam
Contratos publica `EstadoContratualAtualizado` via outbox; Financeiro consome para atualizar o teto disponível por contrato. Ver [`architecture/04-integration-events.md`](./architecture/04-integration-events.md) §6.2.

---

## 🚧 Estado Atual do Projeto

- ✅ Módulo Financeiro mapeado e validado com a P.O.
- ✅ Módulo Contratos mapeado e validado com a P.O. ([entrada inicial 2026-04-28](./CHANGELOG.md)).
- ✅ Estratégia de migração definida ([Strangler Fig](./architecture/01-migration-strategy.md)).
- ✅ Decisões arquiteturais fundamentais registradas ([ADRs 0001-0015](./architecture/adr/README.md)).
- ✅ Granularidade de serviço definida: Modular Monolith para o `core-api` hospedando os 2 módulos ([ADR-0006](./architecture/adr/0006-modular-monolith-core-api.md)).
- ✅ Engine de banco confirmado: **MySQL 8** ([ADR-0013](./architecture/adr/0013-mysql-database-engine.md)) — correção da assunção inicial de PostgreSQL.
- ✅ Stack técnica fechada: Node 24 LTS, TypeScript 6 (com plano TS 7), Fastify, pnpm, Drizzle + `mysql2`, Nodemailer + Adapter.
- ✅ Política de supply chain hardening definida ([ADR-0011](./architecture/adr/0011-supply-chain-hardening.md)).
- ✅ Sistema de [`inquiries/`](./inquiries/README.md) ativo para rastreabilidade de decisões em curso.
- 🟡 [Inquiry-0003](./inquiries/0003-multi-cloud-strategy.md): `Mostly Decided` (8 de 18 perguntas resolvidas em 2026-05-14 via comentários 11–14 do ticket de provisionamento). Bloqueador residual: acessos `codebit-br` + handover do dump.
- 🟡 [ADR-0007](./architecture/adr/0007-multi-cloud-aws-gcp.md) em `Proposed`: precisa ser reescrito como "Strangler cross-cloud transitório GCP→AWS, alvo AWS sa-east-1" (premissa AWS-legado / GCP-novo estava invertida).
- 🟢 [Inquiry-0014](./inquiries/0014-schema-legado-vs-modelo-alvo.md) **(NOVA — 2026-05-14):** schema legado real analisado. 32 tabelas mapeadas em [`domain/10-mapeamento-legado-schema.md`](./domain/10-mapeamento-legado-schema.md). Gap descoberto: BC de Planejamento Orçamentário ausente do handbook. Premissa de campos fiscais no legado invalidada (impacta ADR-0017 e Inquiry-0011).
- ⬜ Skeleton dos serviços `bff-gateway` e `core-api` (após respostas da Codebit + decisão Q4 da Inquiry-0014).
- ⬜ Primeiro BC em implementação — **recomendação:** Identity & Access (folha do grafo de FKs, desbloqueia auth/RBAC). Decisão final pela banca em [Inquiry-0014 §Q4](./inquiries/0014-schema-legado-vs-modelo-alvo.md).
- ⬜ ADR sobre estratégia de implementação dos 2 módulos no `core-api` (prefixos `fin_*` / `ctr_*` formalizado).

---

## 📋 Como Contribuir Com Este Handbook

| Tipo de mudança | Onde editar | O que registrar |
| :--- | :--- | :--- |
| Mudança de domínio | `domain/` | Entrada no `CHANGELOG.md` |
| Decisão arquitetural nova | **NOVO** ADR em `architecture/adr/` | Atualizar índice de ADRs |
| Decisão arquitetural revisada | NOVO ADR que `supersedes` o antigo | ADR antigo NÃO é editado |
| Mudança em infra real | `infrastructure/` | Reflete o estado provisionado |
| Incidente em produção | `operations/incidents/` | Post-mortem sem culpa |

> ⚠️ **ADRs são imutáveis.** Nunca edite um ADR aceito. Crie um novo que o substitua.

---

## 🧭 Princípios Imutáveis do Projeto

### Compartilhados pelos dois módulos
1. **A trilha de auditoria é transversal e inegociável** em cada mudança de estado.
2. **Cálculos derivados não são editáveis** — Valor Líquido (Financeiro) e Valor Vigente (Contratos) são funções de seus inputs, jamais digitados.
3. **Comunicação cross-módulo via evento (outbox), nunca por leitura cruzada de tabelas.**
4. **Cada módulo é dono do próprio dado** — `fin_*` só pelo Financeiro, `ctr_*` só pelo Contratos.
5. **Domínio puro, infra na borda** — sem framework dentro do domínio.

### Específicos do Módulo Financeiro
> Conforme seção 8 do [`domain/DOCUMENTO_MESTRE`](./domain/DOCUMENTO_MESTRE.md):

6. **Nada existe no financeiro sem um Fato Gerador validado.**
7. **O sistema reflete o documento, não o contrário** — soberania documental + sinalização de desvios.
8. **Sucesso bancário é a Saída Real, não o retorno do CNAB.**
9. **A Liquidação exige crivo humano** — automação assiste, governança decide.
10. **O Core não conhece formatos bancários** — toda complexidade fica na ACL.

### Específicos do Módulo Contratos
> Conforme seção 9 do [`domain/contratos/DOCUMENTO_MESTRE`](./domain/contratos/DOCUMENTO_MESTRE.md):

11. **Contrato Mãe é a raiz** — aditivos, documentos e eventos só existem com vínculo formal.
12. **Estado vigente é derivado de aditivos homologados, jamais digitado.**
13. **Documento assinado é gatilho** — sem ele, aditivo não impacta financeiro/prazo.
14. **Imutabilidade do histórico** — exclusão lógica preserva a trilha; nada se apaga.

---

> 🤖 Última atualização do índice: **2026-05-14**.
