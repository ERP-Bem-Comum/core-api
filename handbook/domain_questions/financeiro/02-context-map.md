# 📍 Mapa de Contextos (Context Map)

## 1. Objetivo
Este documento descreve a fronteira de responsabilidades do Módulo Financeiro e como ele se relaciona com sistemas externos (VAN e OCR). O foco é garantir que o **Core Financeiro** esteja protegido de variações técnicas de terceiros.

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
[ BC Integração Bancária (ACL) ] ◄── [ BC Títulos e Liquidação ]
          |
          ▼
[ VAN Bancária (Externo) ]
```

## 3. Tabela de Bounded Contexts (BCs)

| Bounded Context | Responsabilidade Principal | Tipo de Domínio |
| :--- | :--- | :--- |
| **Gestão de Documentos** | Dono do "Fato Gerador". Controla a entrada, impostos e a imutabilidade fiscal. | **Core ⭐** |
| **Títulos e Liquidação** | Gere o ciclo de vida financeiro (Aberto, Pago, Liquidado) e a carteira de pagamentos. | **Core ⭐** |
| **Ingestão & OCR** | Transforma arquivos não estruturados em dados de domínio. | Supporting |
| **Integração Bancária** | Camada de isolamento (ACL) para processar arquivos CNAB e comunicação com a VAN. | Generic |

## 4. Detalhes dos Relacionamentos

### 4.1. Documentos ➔ Títulos (Customer/Supplier)
* **Descrição**: O contexto de Documentos é o "Fornecedor". Se uma regra de imposto muda no Documento, o contexto de Títulos deve reagir.
* **Regra de Ouro**: Um Título não pode ser alterado se o seu Documento de origem estiver "Selado".

### 4.2. Títulos ➔ Integração Bancária (Open Host Service)
* **Descrição**: O BC de Títulos solicita o envio de remessa. O BC de Integração traduz as necessidades financeiras para o formato rigoroso do banco (CNAB).

### 4.3. Ingestão ➔ Documentos (Anticorruption Layer - ACL)
* **Descrição**: Protege o sistema de erros de leitura do OCR. Os dados só entram no domínio de "Documentos" após a validação de esquema e contrato de integridade.

## 5. Tabela de Relacionamentos (De → Para)

| De | Para | Relação | Descrição |
| :--- | :--- | :--- | :--- |
| Ingestão | Documentos | ACL | Garante que o lixo de uma leitura errada de OCR não suje o financeiro. |
| Documentos | Títulos | Supplier/Customer | O Título é um "cliente" das definições fiscais do Documento. |
| Títulos | Int. Bancária | ACL | Isola o Core Financeiro das variações de layout de diferentes bancos. |
| Títulos | Governança | Shared Kernel | Todos os contextos compartilham a estrutura de Logs/Auditoria. |

## 6. Resumo para "Colar na Parede"
* ⭐ **O Coração é o Documento**: Nada acontece no financeiro sem um fato gerador validado.
* 🛡️ **Proteção de Dados**: A camada de Integração Bancária garante que, se o banco mudar o layout do arquivo, o Core do sistema não sofre impacto.
* 🔍 **Rastreabilidade Total**: A Trilha de Auditoria é transversal e obrigatória em cada mudança de estado.
