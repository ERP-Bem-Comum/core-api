[← Voltar ao Handbook](../README.md)

# 🏛️ Arquitetura

> **Como** o sistema é construído. Esta seção responde "como funciona". O **por que** das decisões mora em [`adr/`](./adr/README.md). O **o que** o sistema faz mora em [`../domain/`](../domain/README.md).

---

## 📚 Documentos

| # | Documento | Conteúdo |
| :--- | :--- | :--- |
| 01 | [Estratégia de Migração](./01-migration-strategy.md) | Strangler Fig: ordem de ataque, fases, marcos |
| 02 | [Topologia do Sistema](./02-system-topology.md) | BFF + legacy-api + core-api: diagramas e fluxos |
| 03 | [Arquitetura de Dados](./03-data-architecture.md) | DB compartilhado, schemas isolados, regras de escrita |
| 04 | [Eventos e Integração](./04-integration-events.md) | Outbox pattern, contrato de eventos, idempotência |
| 05 | [Decisões de Runtime](./05-runtime-decisions.md) | Por que Node, e quando re-avaliar |
| 06 | [Estratégia de Persistência](./06-persistence-strategy.md) | MySQL 8.4 único (ADR-0020), Drizzle/mysql2, mapeamentos canônicos, migrations, upsert estrito |

---

## 📋 ADRs (Architecture Decision Records)

Decisões arquiteturais ficam em [`adr/`](./adr/README.md). ADRs são **imutáveis**: uma vez aceitos, não são editados. Mudanças geram ADRs novos que `supersedes` os anteriores.

---

## 🧭 Princípios Arquiteturais

1. **Domínio puro, infra na borda.** Domain layer não importa nada de framework, runtime ou infra.
2. **Cada serviço dono do próprio dado.** Sem cross-write entre schemas. Sempre.
3. **Eventos como cola entre BCs.** Comunicação cross-fronteira sempre por contrato explícito.
4. **Auditoria desde o dia 1.** Outbox + log estruturado, não opcional.
5. **Uma batalha de cada vez.** Mudança simultânea de runtime, framework e modelo de domínio = projeto morto.
6. **Fronteira física, não social.** Boundary é processo separado, não "convenção de pasta".
7. **Documentar decisão, não opinião.** Toda decisão arquitetural relevante vira ADR.

---

## 🗺️ Mapa Mental

```
                        ┌─────────────────────┐
                        │      DOMÍNIO        │  ← O QUÊ (../domain/)
                        │  (Fato Gerador,     │
                        │   Títulos, ACL)     │
                        └──────────┬──────────┘
                                   │ "implementado por"
                                   ▼
                        ┌─────────────────────┐
                        │   ARQUITETURA       │  ← COMO (este diretório)
                        │  (Topologia,        │
                        │   Eventos, Dados)   │
                        └──────────┬──────────┘
                                   │ "justificada por"
                                   ▼
                        ┌─────────────────────┐
                        │       ADRs          │  ← POR QUE (adr/)
                        │  (Decisões          │
                        │   imutáveis)        │
                        └──────────┬──────────┘
                                   │ "operada via"
                                   ▼
                        ┌─────────────────────┐
                        │  INFRAESTRUTURA     │  ← ONDE (../infrastructure/)
                        │  (Provisionamento,  │
                        │   Ambientes)        │
                        └─────────────────────┘
```
