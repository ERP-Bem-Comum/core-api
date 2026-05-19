# 📦 ERP Financeiro - Módulo de Contratos (V2)

Documentação estratégica e tática do **Módulo de Contratos**, redesenhado para garantir compliance, automação do ciclo de vida e integridade documental através de **Domain-Driven Design (DDD)**.

## 🎯 Visão Estratégica
* **Propósito**: Eliminar a edição manual e a "cegueira" documental, transformando dados estáticos em um **Estado Contratual Vigente** auditável.
* **Problema**: Inconsistências de valor/prazo, falta de histórico confiável e ausência de gestão de arquivos.
* **Pilar Central**: A **Timeline Imutável** é a única fonte da verdade. O valor do contrato é um campo calculado, nunca editado.

## 🗺️ Mapa de Contextos (Context Map)
O sistema é dividido em quatro áreas de responsabilidade:
1. **Gestão de Contratos (Core ⭐)**: Mantém o registro mestre e o saldo atual.
2. **Aditivos e Alterações (Core ⭐)**: Orquestra as mudanças e exige formalização.
3. **Memória Operacional (Support)**: Gere a Timeline e o repositório de documentos.
4. **Integração Financeira (Generic)**: Interface protegida com o Contas a Pagar via ACL.

## 🧩 Bounded Contexts

| BC | Tipo | Documento |
| :-- | :-- | :-- |
| Gestão de Contratos | Core ⭐ | [bounded-contexts/gestao-contratos.md](./bounded-contexts/gestao-contratos.md) |
| Aditivos e Alterações | Core ⭐ | [bounded-contexts/aditivos.md](./bounded-contexts/aditivos.md) |
| Memória Operacional (Timeline) | Supporting | [bounded-contexts/timeline.md](./bounded-contexts/timeline.md) |
| Integração Financeira | Generic (ACL) | [07-external-context.md](./07-external-context.md) |

### Regras-chave por BC
* **Gestão de Contratos** — `Valor Vigente = Valor Original + Σ Aditivos Homologados`. Status: `Vigente | Encerrado | Distratado`.
* **Aditivos e Alterações** — Proibido homologar aditivos sem o arquivo assinado em anexo. Tipos: Acréscimo, Supressão, Prazo e Variado.
* **Memória Operacional** — Imutabilidade total. Eventos são *append-only*. Centraliza histórico de auditoria e documentos.

## 📚 Documentos Transversais
* [01-introducao.md](./01-introducao.md) — Visão de produto, atores, fluxo do dia, MVP, KPIs
* [02-context-map.md](./02-context-map.md) — Mapa de contextos e relacionamentos
* [06-event-flow.md](./06-event-flow.md) — Matriz de eventos
* [07-external-context.md](./07-external-context.md) — Fronteiras externas (Financeiro, Storage, RBAC)
* [especificacao-dominio.md](./especificacao-dominio.md) — Especificação de domínio formal (RNs, RNFs, casos de uso, cenários de teste)

## 📡 Eventos Principais do Sistema
| Evento | Significado para o Negócio |
| :--- | :--- |
| `ContratoMaeCriado` | Um novo compromisso jurídico foi registrado. |
| `AditivoHomologado` | Uma alteração foi formalizada com documento e o saldo mudou. |
| `EstadoAtualizado` | O novo valor/prazo está disponível para o Financeiro e Cliente. |
| `DocumentoDisponibilizado` | Uma nova evidência foi anexada à Timeline. |

## 📖 Glossário Essencial
* **Aditivo de Supressão**: Redução formal do valor global do contrato.
* **Contrato Mãe**: O documento e registro original que inicia a relação.
* **Estado Vigente**: A situação real do contrato no dia de hoje (Valor + Prazo).
* **Timeline**: Trilha cronológica de todos os fatos e documentos do ciclo de vida.

---
*Status: Especificação finalizada para implementação.*
