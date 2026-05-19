[← Voltar ao Módulo Contratos](./README.md)

# 📍 Mapa de Contextos — Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28

---

## 1. Objetivo

Descreve a divisão de responsabilidades do módulo de Contratos, separando o "coração" do negócio (Core) das funções de suporte ou genéricas, garantindo que a lógica de cálculo contratual não seja corrompida por detalhes técnicos ou outros módulos.

## 2. Diagrama de Fronteiras

```plaintext
[ Interface do Usuário / BFF ]
          |
          ▼
[ GESTÃO DE CONTRATOS (Core ⭐) ] <───> [ ADITIVOS E ALTERAÇÕES (Core ⭐) ]
          |                                     |
          └───────────┬─────────────────────────┘
                      ▼
        [ MEMÓRIA OPERACIONAL / TIMELINE (Support) ]
                      |
                      ▼
        [ INTEGRAÇÃO FINANCEIRA (Generic / ACL) ] ───> Módulo Financeiro
```

## 3. Tabela de Bounded Contexts

| Bounded Context | Responsabilidade Principal | Tipo de Domínio |
| :--- | :--- | :--- |
| **Gestão de Contratos** | Define a estrutura do Contrato Mãe e mantém o "Estado Vigente" (valor/prazo atual). | **Core ⭐** |
| **Aditivos e Alterações** | Orquestra o ciclo de vida das mutações contratuais e exige a formalização documental. | **Core ⭐** |
| **Memória Operacional (Timeline)** | Gerencia Timeline append-only, repositório de arquivos e trilha de auditoria. | Supporting |
| **Integração Financeira** | Isola o domínio de contratos das regras externas do Contas a Pagar via ACL. | Generic |

## 4. Detalhes dos Bounded Contexts

### 🧩 Gestão de Contratos
- **Tipo:** Core Domain.
- **Responsável por:** Cadastro inicial, numeração sequencial, controle de status (Vigente, Encerrado, Distratado) e motor de consolidação de valores.
- **Interage com:** Aditivos (recebe atualizações) e Memória Operacional (persiste estados).

### 🧩 Aditivos e Alterações
- **Tipo:** Core Domain.
- **Responsável por:** Tipificar alterações (Acréscimo, Supressão, Prazo, Variado), gerir status de homologação e garantir que nenhum aditivo mude o contrato sem arquivo assinado.
- **Interage com:** Gestão de Contratos (notifica homologação).

### 🧩 Memória Operacional (Timeline)
- **Tipo:** Supporting Domain.
- **Responsável por:** Armazenamento de arquivos, integridade de logs append-only e visualização cronológica para o Auditor.
- **Interage com:** Todos os contextos que geram eventos relevantes.

### 🔌 Integração Financeira
- **Tipo:** Generic / ACL.
- **Responsável por:** Traduzir "saldo vigente do contrato" para o módulo Financeiro (Contas a Pagar) sem expor a complexidade contratual interna.

## 5. Relacionamentos entre Contextos

| De | Para | Relação | Descrição |
| :--- | :--- | :--- | :--- |
| Aditivos | Contratos | Customer/Supplier | Contratos (Customer) depende dos Aditivos (Supplier) para atualizar valor vigente. |
| Contratos | Memória Operacional | Shared Kernel | Compartilham linguagem de "Evento Contratual" para popular a Timeline. |
| Contratos | Financeiro | ACL (Anti-Corruption) | Contrato envia saldo; ACL garante que mudanças no Financeiro não quebrem regras contratuais. |

## 6. Resumo para "Colar na Parede"

- 🛡️ **Integridade** — Ninguém altera o valor do contrato diretamente em Gestão de Contratos; apenas o contexto de Aditivos tem essa "permissão" via homologação.
- 📜 **Imutabilidade** — A Memória Operacional não permite apagar o passado; apenas registrar novos eventos que corrigem ou encerram os anteriores.
- 🏗️ **Independência** — O Módulo de Contratos não "sabe" como o Contas a Pagar funciona; apenas disponibiliza o saldo vigente.

---

## 7. Relação com o Módulo Financeiro

O módulo Contratos **não conhece** as regras de retenção fiscal, CNAB, FITID ou qualquer detalhe do módulo Financeiro. A integração se dá por evento (`EstadoContratualAtualizado`) consumido pelo Financeiro como fonte do **saldo disponível para empenho** quando um documento fiscal é vinculado a um contrato.

> Para detalhes do módulo Financeiro, ver [`../README.md`](../README.md) e [`../DOCUMENTO_MESTRE.md`](../DOCUMENTO_MESTRE.md).
> Para detalhes da fronteira, ver [07-external-context.md](./07-external-context.md).
