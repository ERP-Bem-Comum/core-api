[← Voltar para Arquitetura](./README.md)

# 🌳 Estratégia de Migração — Strangler Fig

> **Status:** vigente | **Última revisão:** 2026-04-27 | **Substitui:** nenhum

---

## 1. Contexto

O sistema legado é um ERP financeiro em **NestJS** centrado em "títulos avulsos" (CRUD). O handbook ([`../domain/DOCUMENTO_MESTRE.md`](../domain/DOCUMENTO_MESTRE.md)) define um modelo radicalmente diferente, centrado em **Fato Gerador** (documento fiscal soberano).

A diferença não é cosmética: muda quem é o agregado raiz, muda invariantes, muda fluxos de aprovação.

> **Não é refactor — é re-arquitetura.**

A P.O. estabeleceu que o handbook é fonte da verdade e não será alterado. Existe contrato com infra nova que vai migrar via dump do banco antigo.

---

## 2. Decisão

Adotamos o padrão **Strangler Fig** (Martin Fowler): o legado continua de pé, o novo é construído ao lado, e a funcionalidade migra incrementalmente até o legado ser desligado.

> Detalhamento e alternativas em [ADR-0001](./adr/0001-strangler-fig-over-rewrite.md).

---

## 3. Por Que Não as Alternativas

### ❌ Big Bang Rewrite
- 8-12 meses sem entregar valor.
- Regras não documentadas no legado se perdem.
- Risco político alto: projetos longos sem entregas concretas são cancelados.

### ❌ Refactor In-Place
- Paradigma do handbook é incompatível com a base CRUD existente.
- Convenções do Nest legado brigam com domínio puro.
- Fronteiras de pasta não impedem imports cruzados sob prazo.
- Em 3 meses vira Frankenstein.

---

## 4. Ordem de Ataque

| Fase | Bounded Context | Tipo | Por que nesta ordem |
| :--- | :--- | :--- | :--- |
| **1** | Integração Bancária (Bradesco) | Generic / ACL | Fronteira já isolada por natureza. Baixo acoplamento ao Core. Stack/cultura validados num BC menos crítico. |
| **2** | Ingestão & OCR | Supporting | Em paralelo com fase 1 se houver capacidade. Fronteira clara (arquivo → dados estruturados). |
| **3** | Gestão de Documentos | **Core ⭐** | A inversão de paradigma. Stack já provado nas fases anteriores. ACL natural contra o legado. |
| **4** | Títulos e Liquidação | **Core ⭐** | Depende de Documentos. Por essa altura, o módulo de títulos do legado já estará esvaziado. |

> **Regra:** um BC end-to-end em produção antes de iniciar o próximo. Nunca 4 BCs meio-prontos.

---

## 5. Fronteira Entre Legado e Novo

Durante a transição, os dois sistemas convivem:

- **Telas legadas** consomem `/api/v1/*` (legacy-api).
- **Telas novas** consomem `/api/v2/*` (core-api).
- **Telas em transição** podem chamar os dois (raro; evitar).
- **Eventos** propagam fatos relevantes de um lado para o outro via [Outbox Pattern](./04-integration-events.md).

---

## 6. Migração de Dados Históricos

> 🚫 **Não migrar.**

Dados financeiros históricos ficam no schema `legacy.*`, **congelados**. O `core.*` cresce com dados novos. Os princípios de "Time Travel" e auditoria do handbook valem do nascimento do `core` em diante.

**Razão:** migrar histórico financeiro reescrevendo formato é risco operacional alto sem ganho proporcional. Auditoria do passado consulta o legado; do futuro, o novo.

---

## 7. Marcos do Projeto

| Marco | Critério de saída | ETA conservador |
| :--- | :--- | :--- |
| **M0** — Topologia em dev | BFF + core-api skeleton + legacy-api roteados, todos com `/health` OK | 2 semanas |
| **M1** — Bradesco em prod | Geração CNAB + leitura retorno via core-api | 6-10 semanas |
| **M2** — OCR em prod | Pipeline de ingestão funcionando | M1 + 4 semanas |
| **M3** — Documentos em prod | Documentos novos nascem no core-api | M2 + 8-12 semanas |
| **M4** — Títulos em prod | Ciclo completo no novo modelo | M3 + 6-10 semanas |
| **M5** — Legado desligado | Tráfego zero em legacy-api | M4 + 3-6 meses |

> ETAs revisados a cada marco entregue.

---

## 8. Critérios de "BC Migrado"

Um BC só é considerado migrado quando **todos** os critérios abaixo são atendidos:

1. ✅ Funcionalidade equivalente do legado está desativada (ou apenas em modo leitura).
2. ✅ Métricas de produção do BC novo estáveis por ≥ 2 semanas (latência, erro, throughput).
3. ✅ Audit log do BC consistente (sem gaps, eventos sem dead-letter).
4. ✅ Rollback documentado e testado (procedimento de voltar para o legado).
5. ✅ Time treinado em operar o BC novo (runbooks em `../operations/`).

---

## 9. Riscos Identificados

| Risco | Mitigação |
| :--- | :--- |
| Regras não documentadas no legado se perdem na migração | Antes de migrar cada BC, fazer arqueologia de código + entrevistas com stakeholders |
| Coexistência longa gera fadiga e atrasa M5 | Definir budget de tempo para M5 e revisitar trimestralmente |
| Eventos cross-fronteira viram saga implícita | Catalogar todos os eventos cross-fronteira em [04-integration-events.md](./04-integration-events.md) |
| Time perde foco e mistura BCs simultâneos | Disciplina de "um BC por vez" reforçada na cerimônia de planejamento |

---

## 10. Referências

- Fowler, M. — [StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [ADR-0001](./adr/0001-strangler-fig-over-rewrite.md) — decisão raiz desta estratégia.
- [02-system-topology.md](./02-system-topology.md) — topologia que materializa a estratégia.
- [03-data-architecture.md](./03-data-architecture.md) — implicações de dados.
