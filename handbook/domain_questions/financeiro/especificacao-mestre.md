# 📘 Especificação Mestra: Módulo Financeiro (Core Financeiro)

Este documento estabelece a estrutura de domínio para o novo sistema financeiro, fundamentado no paradigma **Document-Driven Finance**. O foco reside na integridade do fato gerador, na automação via OCR e no controle rigoroso do fluxo bancário (Bradesco).

---

## 1. 🧭 Visão Estratégica

### 1.1. Objetivo de Negócio
Transicionar de um modelo de "títulos avulsos" para um modelo centrado no **Fato Gerador**. O sistema garante que nenhuma obrigação financeira exista sem um documento de origem validado, assegurando transparência fiscal e conformidade bancária para entidades de governança rigorosa.

### 1.2. Atores e Responsabilidades
* **Operador de Contas a Pagar**: Realiza a ingestão (OCR), o enriquecimento de dados e a geração de remessas CNAB.
* **Aprovador (Perfil de Governança)**: Valida os lançamentos e "Sela" o documento, autorizando a existência da dívida.
* **Gestor Financeiro**: Responsável pelo crivo final de liquidação (baixa) na conciliação.
* **Sistema (Vigilante Fiscal)**: Motor de regras que sinaliza desvios de alíquotas e garante a integridade dos dados lidos via OCR.

### 1.3. Métricas de Sucesso (KPIs)
* ⏱️ **Tempo de Ciclo**: Lead time da leitura do OCR até o agendamento bancário.
* ✅ **Acurácia de Retenção**: % de documentos processados sem ajuste manual nos impostos.
* 🔁 **Taxa de Liquidação Automática**: % de transações do extrato "casadas" sem intervenção.

---

## 2. 📍 Mapa de Contextos (Strategic Design)

O sistema é segmentado em fronteiras lógicas para proteger as regras de negócio:

### 2.1. Tabela de Bounded Contexts
| Bounded Context | Responsabilidade | Tipo |
| :--- | :--- | :--- |
| **Gestão de Documentos** | Controle do Fato Gerador e Selagem Fiscal. | **Core ⭐** |
| **Títulos e Liquidação** | Ciclo de vida financeiro e carteira de pagamentos. | **Core ⭐** |
| **Integração Bancária** | Tradutor de Layouts (Bradesco) e Proteção (ACL). | Generic |
| **Ingestão & OCR** | Transformação de arquivos brutos em dados estruturados. | Supporting |

### 2.2. Relacionamento Chave: Fato Gerador
O contexto de **Títulos** é dependente do contexto de **Documentos**. Se um documento é "Reaberto", seus títulos derivados tornam-se inválidos ou bloqueados para garantir que o financeiro nunca pague algo diferente do fiscal.

---

## 3. 🧩 Detalhamento do Domínio: Gestão de Documentos

### 3.1. Soberania do Documento e OCR
O sistema respeita o que está impresso no documento fiscal.
* **Sinalização de Desvio**: Se o Operador alterar um valor lido pelo OCR ou se um imposto divergir da alíquota padrão, o sistema **sinaliza** o alerta, mas não impede o lançamento (respeitando a soberania do documento real).

### 3.2. Regras de Negócio (Invariantes)
* **R1 (Cálculo do Valor Líquido)**: Campo calculado e bloqueado para edição manual.
    > `Valor Líquido = Valor Bruto − Impostos Retidos − Descontos + Multa + Juros`.
* **R2 (Imutabilidade pós-Selo)**: Uma vez que o Aprovador "Sela" o documento, todos os campos de valor tornam-se imutáveis.
* **R3 (Workflow de Reabertura)**: A alteração de valores financeiros exige o comando `Reabrir Documento`, que realiza o rollback do status e exige nova aprovação.

---

## 4. 💰 Detalhamento do Domínio: Títulos e Liquidação

### 4.1. Estrutura de Títulos (Pai e Filhos)
Ao selar um documento, o sistema gera:
1. **Título Principal**: Valor Líquido destinado ao fornecedor.
2. **Títulos de Imposto (Filhos)**: Obrigações para órgãos competentes (ISS, IRRF, INSS, CSRF).

### 4.2. Máquina de Estados do Título
* **ABERTO**: Criado, aguardando aprovação.
* **APROVADO**: Liberado para o fluxo bancário.
* **TRANSMITIDO**: Incluído em remessa CNAB enviada ao Bradesco.
* **RECUSADO**: Erro retornado pelo banco (permite ajuste e reset para `APROVADO`).
* **ATRASADO**: Status automático se D+1 passar sem confirmação de saída bancária.
* **PAGO**: Status atingido após confirmação de **Saída Bancária** real (Extrato).
* **LIQUIDADO**: Estado final após o **Crivo de Liquidação** (autorização humana do Gestor).

### 4.3. Pagamentos Extra-Remessa
O sistema permite que o Operador marque um título como `PAGO` manualmente (ex: pagamento via Internet Banking fora do CNAB), mantendo a obrigatoriedade da conciliação futura com o extrato.

---

## 5. 🔌 Integração Bancária (ACL Bradesco)

### 5.1. Tradutor de Layouts
Este componente isola o sistema das especificidades do Bradesco:
* **CNAB 240**: Geração de arquivos de remessa e leitura de retorno.
* **Extratos**: Processamento de arquivos **OFX**, PDF ou XLSX.

### 5.2. Regras de Integridade Bancária
* **Anti-Duplicidade (FITID)**: O sistema utiliza o Identificador Único da transação bancária para impedir que o mesmo lançamento de extrato seja importado ou liquidado duas vezes.
* **Hash de Segurança**: No momento da geração da remessa, o sistema gera um *checksum* para garantir que o arquivo enviado ao banco não sofreu manipulações externas.

---

## 6. 📡 Matriz de Eventos de Domínio

| Evento | Origem | Reação do Sistema |
| :--- | :--- | :--- |
| `DocumentoSelado` | Documentos | Gera os Títulos Financeiros vinculados. |
| `TituloAprovado` | Títulos | Disponibiliza para remessa ou pagamento manual. |
| `SaidaBancariaIdentificada` | Integração | Altera status do título para `PAGO`. |
| `PagamentoAtrasado` | Sistema | Notifica o Operador sobre falta de confirmação em D+1. |
| `ConciliacaoConfirmada` | Liquidação | Muda status para `LIQUIDADO` e encerra o ciclo. |

---

## 7. 📖 Glossário Ubíquo

* **Fato Gerador**: O documento (Nota Fiscal, Recibo) que dá origem à obrigação financeira.
* **Selo**: Estado de bloqueio administrativo que garante que o financeiro é fiel ao fiscal.
* **FITID**: Identificador transacional do banco, usado como chave de unicidade na conciliação.
* **ACL (Anticorruption Layer)**: Camada técnica que impede que termos bancários "sujem" o domínio de negócio.
* **Time Travel (Trilha)**: Capacidade de auditar cada mudança de valor, desde a leitura do OCR até a baixa final.

---
> **Nota do Arquiteto**: Este documento é imutável em seus princípios core. Qualquer alteração tecnológica (banco de dados, linguagens) não deve afetar estas regras de domínio aqui descritas.
