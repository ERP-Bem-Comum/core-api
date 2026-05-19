[← Voltar para ADRs](./README.md)

# ADR-0001: Estratégia Strangler Fig sobre Big Bang Rewrite ou Refactor In-Place

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Arquiteto de domínio + P.O.

---

## Contexto

O sistema legado é um ERP financeiro em **NestJS** centrado em "títulos avulsos" (CRUD). O handbook (`domain/DOCUMENTO_MESTRE.md`) define um modelo radicalmente diferente, centrado em **Fato Gerador** (documento fiscal soberano).

A diferença não é cosmética:

- Muda quem é o agregado raiz (Documento, não Título).
- Muda invariantes (R3: alterar valor de título exige reabrir o documento pai).
- Muda fluxos de aprovação (selagem → imutabilidade pós-selo).
- Muda eventos de domínio (matriz nova).

A P.O. estabeleceu que **o handbook é fonte da verdade e não será alterado**. Existe contrato com infra nova que vai migrar via dump do banco antigo.

---

## Decisão

Adotamos **Strangler Fig** (Martin Fowler):

- Legado roda intocado.
- Novo é construído ao lado, em serviços separados.
- Funcionalidade migra **incrementalmente**, BC por BC.
- Legado é desligado naturalmente quando o último BC é absorvido.

**Ordem de migração:** Bradesco → OCR → Documentos → Títulos.

---

## Consequências

### Positivas

- Entrega de valor incremental — cada BC migrado é benefício real em produção.
- Risco distribuído — falha em um BC não compromete o sistema inteiro.
- Reversibilidade — se um BC novo der errado, tráfego volta para o legado.
- Aprendizado escalonado — primeiros BCs (menos críticos) validam stack para os críticos.
- Coexistência longa permite refinamento orgânico do modelo novo.

### Negativas

- Custo operacional duplicado durante a transição (2 sistemas em produção).
- UI precisa lidar com dualidade (telas legado + telas novas).
- Complexidade de eventos cross-fronteira durante a transição.
- Migração total leva **12-24 meses**, não 3-6.

### Neutras

- Histórico financeiro permanece no schema `legacy.*`, congelado. Auditoria do passado consulta o legado; do futuro, o novo.

---

## Alternativas Consideradas

### A. Big Bang Rewrite

Reescrever do zero seguindo o handbook, desligar o legado de uma vez.

**Rejeitada porque:**
- Tempo sem entregar valor: 8-12 meses mínimo.
- Regras de negócio não documentadas no legado se perdem.
- Histórico de tentativas similares mostra alta taxa de fracasso/cancelamento.
- Risco político: projeto longo sem entregas concretas é cancelado.

### B. Refactor In-Place

Morfar o legado para o modelo novo dentro do mesmo código.

**Rejeitada porque:**
- Paradigma do handbook (Fato Gerador soberano) é incompatível com a base CRUD existente.
- Convenções do Nest legado (decorators, DI, classes) brigam com domínio puro.
- Fronteiras de pasta não impedem imports cruzados sob prazo de entrega.
- Em 3 meses vira Frankenstein.

---

## Quando Re-avaliar

A decisão deve ser revisitada se:

- Surgir requisito de negócio que torne a coexistência inviável (ex: regulação que exige unificação imediata).
- O custo da operação dupla ultrapassar o benefício da migração incremental por mais de 6 meses.

---

## Referências

- Fowler, M. — [StranglerFigApplication](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [`../01-migration-strategy.md`](../01-migration-strategy.md) — detalhamento operacional.
- [ADR-0003](./0003-shared-db-isolated-schemas.md) — consequência: schemas isolados.
- [ADR-0005](./0005-thin-bff-gateway.md) — consequência: BFF como ponto de roteamento.
