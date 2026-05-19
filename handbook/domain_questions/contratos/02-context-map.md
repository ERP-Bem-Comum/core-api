# 📍 Mapa de Contextos (Context Map)

## 1. Objetivo
Este documento descreve a divisão de responsabilidades do sistema, separando o que é o "coração" do negócio (Core) do que são funções de suporte ou genéricas, garantindo que a lógica de cálculo contratual não seja corrompida por detalhes técnicos ou outros módulos.

## 2. Visão Geral (Simplificada)
```plaintext
[ Interface do Usuário / Gateway ]
          |
          ▼
[ GESTÃO DE CONTRATOS (Core) ] <───> [ ADITIVOS E ALTERAÇÕES (Core) ]
          |                                     |
          └───────────┬─────────────────────────┘
                      ▼
        [ MEMÓRIA OPERACIONAL / TIMELINE (Support) ]
                      |
                      ▼
        [ INTEGRAÇÃO FINANCEIRA (Generic/ACL) ] ───> (Sistema Contas a Pagar)
```

## 3. Tabela de Bounded Contexts

| Bounded Context | Responsabilidade Principal | Tipo de Domínio |
| :---- | :---- | :---- |
| **Gestão de Contratos** | Define a estrutura do Contrato Mãe e mantém o "Estado Vigente" (valor/prazo atual). | **Core ⭐** |
| **Aditivos e Alterações** | Orquestra o ciclo de vida das mutações contratuais e exige a formalização documental. | **Core ⭐** |
| **Memória Operacional** | Gerencia a Timeline imutável, o repositório de arquivos e a trilha de auditoria. | Supporting |
| **Integração Financeira** | Isola o domínio de contratos das regras externas do Contas a Pagar. | Generic |

## 4. Detalhes dos Bounded Contexts

### 🧩 Gestão de Contratos
* **Tipo**: Core Domain.
* **Responsável por**: Cadastro inicial, numeração sequencial, controle de status (Vigente, Encerrado, Distratado) e motor de consolidação de valores.
* **Interage com**: Aditivos (para receber atualizações) e Memória Operacional (para persistir estados).

### 🧩 Aditivos e Alterações
* **Tipo**: Core Domain.
* **Responsável por**: Tipificar alterações (Acréscimo, Supressão, Prazo, Variado), gerir o status de homologação e garantir que nenhum aditivo mude o contrato sem um arquivo assinado.
* **Interage com**: Gestão de Contratos (notifica homologação).

### 🧩 Memória Operacional (Timeline)
* **Tipo**: Supporting Domain.
* **Responsável por**: Armazenamento de arquivos, integridade de logs "append-only" (apenas adição) e visualização cronológica para o Auditor.
* **Interage com**: Todos os contextos que geram eventos relevantes.

## 5. Relacionamentos entre Contextos

| De | Para | Relação | Descrição |
| :---- | :---- | :---- | :---- |
| Aditivos | Contratos | **Customer/Supplier** | O contexto de Contratos (Customer) depende dos Aditivos (Supplier) para atualizar o valor vigente. |
| Contratos | Memória Operacional | **Shared Kernel** | Compartilham a linguagem de "Evento Contratual" para popular a Timeline. |
| Contratos | Financeiro | **ACL (Anti-Corruption)** | O Contrato envia o saldo, mas a ACL garante que mudanças no Financeiro não quebrem as regras contratuais. |

## 6. Resumo para "Colar na Parede"

* 🛡️ **Integridade**: Ninguém altera o valor do contrato diretamente no contexto de Gestão de Contratos; apenas o contexto de Aditivos tem essa "permissão" via homologação.
* 📜 **Imutabilidade**: A Memória Operacional não permite apagar o passado, apenas registrar novos eventos que corrigem ou encerram os anteriores.
* 🏗️ **Independência**: O Módulo de Contratos não "sabe" como o Contas a Pagar funciona, ele apenas disponibiliza o saldo vigente.
