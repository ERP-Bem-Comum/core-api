# 📍 Mapa de Contextos (Context Map)

## 1. Objetivo

Este documento descreve a fronteira de responsabilidades do Módulo Financeiro e como ele se relaciona com sistemas externos (VAN e OCR) e contextos internos (Contratos e Orçamento). O foco é garantir que o **Core Financeiro** esteja protegido de variações técnicas de terceiros.

## 2. Visão Geral (Diagrama de Fronteiras)

O sistema é desenhado seguindo a relação de "Dependência do Fato Gerador".

```plaintext
[ Portal do Usuário / UI ]
          |
          ▼
[ BC Ingestão & OCR ] ──(Traduz)──► [ BC Gestão de Documentos (CORE ⭐) ]
                                            |
                                            | (Gera obrigações)
                                            ▼
                              [ BC Títulos e Liquidação (CORE ⭐) ]
                                            |
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
[ BC Integração Bancária (ACL) ]    [ Submódulo Conciliação ]    [ Execução Contratual ]
          |                                   |                         (ACL)
          ▼                                   ▼                         ▼
[ VAN Bancária (Externo) ]          [ Orçamento ]              [ Módulo Contratos ]
```

## 3. Estrutura do Módulo Financeiro

O Módulo Financeiro é composto por **Bounded Contexts** e **Submódulos**:

| Contexto / Submódulo | Responsabilidade Principal | Tipo de Domínio |
| :--- | :--- | :--- |
| **Gestão de Documentos** | Dono do "Fato Gerador". Controla a entrada, impostos e a imutabilidade fiscal. | **Core ⭐** |
| **Títulos e Liquidação** | Gere o ciclo de vida financeiro (Rascunho, Aberto, Aprovado, Transmitido, Recusado, Pago, Conciliado) e a carteira de pagamentos. | **Core ⭐** |
| **Ingestão & OCR** | Transforma arquivos não estruturados em dados de domínio. | Supporting |
| **Integração Bancária** | Camada de isolamento (ACL) para processar arquivos CNAB e comunicação com a VAN. | Generic |
| **Conciliação** | Submódulo responsável pelo casamento título/extrato, confirmação de conciliação e `Unreconcile`. | Core ⭐ |

## 4. Contextos Integrados (Cross-Módulo)

| Contexto | Responsabilidade | Relação com Financeiro |
| :--- | :--- | :--- |
| **Execução Contratual** | Histórico de pagamentos vinculado ao contrato. | Consome `TituloConciliado` para refletir pagamentos (valor bruto do documento). |
| **Orçamento** | Plano orçamentário e controle de gastos por categoria. | Consome `TituloConciliado` para consolidar gasto no plano/categoria definidos no documento. |

## 5. Detalhes dos Relacionamentos

### 5.1. Documentos ➔ Títulos (Customer/Supplier)
* **Descrição**: O contexto de Documentos é o "Fornecedor". Se uma regra de imposto muda no Documento, o contexto de Títulos deve reagir.
* **Regra de Ouro**: Um Título não pode ser alterado se o seu Documento de origem estiver "Aprovado" (status do título pai).

### 5.2. Títulos ➔ Integração Bancária (Open Host Service)
* **Descrição**: O BC de Títulos solicita o envio de remessa. O BC de Integração traduz as necessidades financeiras para o formato rigoroso do banco (CNAB).

### 5.3. Ingestão ➔ Documentos (Anticorruption Layer - ACL)
* **Descrição**: Protege o sistema de erros de leitura do OCR. Os dados só entram no domínio de "Documentos" após a validação de esquema e contrato de integridade.

### 5.4. Títulos ➔ Conciliação (Internal Relationship)
* **Descrição**: O Submódulo Conciliação consome títulos em `Pago` e extratos bancários para executar o casamento. Publica `TituloConciliado` ou `ConciliacaoDesfeita`.

### 5.5. Conciliação ➔ Execução Contratual (Published Language)
* **Descrição**: O evento `TituloConciliado` é consumido pelo módulo de Contratos para atualizar o histórico de pagamentos.

### 5.6. Conciliação ➔ Orçamento (Published Language)
* **Descrição**: O evento `TituloConciliado` é consumido pelo módulo de Orçamento para consolidar gastos no plano orçamentário.

## 6. Tabela de Relacionamentos (De → Para)

| De | Para | Relação | Descrição |
| :--- | :--- | :--- | :--- |
| Ingestão | Documentos | ACL | Garante que o lixo de uma leitura errada de OCR não suje o financeiro. |
| Documentos | Títulos | Supplier/Customer | O Título é um "cliente" das definições fiscais do Documento. |
| Títulos | Int. Bancária | ACL | Isola o Core Financeiro das variações de layout de diferentes bancos. |
| Títulos | Conciliação | Internal | Submódulo consome títulos `Pago` e extratos para casamento. |
| Conciliação | Exec. Contratual | Published Language | Evento `TituloConciliado` atualiza histórico de pagamentos no contrato. |
| Conciliação | Orçamento | Published Language | Evento `TituloConciliado` consolida gasto no plano orçamentário. |
| Títulos | Governança | Shared Kernel | Todos os contextos compartilham a estrutura de Logs/Auditoria. |

## 7. Resumo para "Colar na Parede"

* ⭐ **O Coração é o Documento**: Nada acontece no financeiro sem um fato gerador validado.
* 🛡️ **Proteção de Dados**: A camada de Integração Bancária garante que, se o banco mudar o layout do arquivo, o Core do sistema não sofre impacto.
* 🔍 **Rastreabilidade Total**: A Trilha de Auditoria é transversal e obrigatória em cada mudança de estado.
* 🏗️ **Integração Contratual e Orçamentária**: A conciliação final dispara atualizações nos módulos de Contratos e Orçamento, garantindo consistência financeira transversal.
