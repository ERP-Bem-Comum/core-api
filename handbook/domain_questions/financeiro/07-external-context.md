# 🔌 Integrações e Fronteiras Externas

## 1. Sistemas e Fronteiras

O Core Financeiro não é uma ilha. Ele depende de fluxos de dados que vêm de fora, mas deve manter sua integridade caso esses sistemas falhem ou mudem. Além disso, publica eventos para outros módulos internos do ERP.

## 2. Mapa de Integrações

### 2.1. Sistemas Externos

| Alvo | Sistema | Como o Core Financeiro enxerga | Papel |
| :--- | :--- | :--- | :--- |
| **OCR / Ingestão** | Serviço de Visão | Provedor de Dados Brutos | Transforma PDF em JSON estruturado para o Operador. |
| **Banco (Bradesco)** | VAN Bancária | Destinatário de Ordens / Fonte de Verdade | Recebe arquivos de Remessa e envia Retorno/Extrato. |
| **Segurança** | Algoritmo Hash | Validador de Integridade | Garante que o arquivo gerado não foi alterado. |

### 2.2. Integrações Internas (Cross-Módulo)

| Alvo | Módulo | Evento Consumido | Papel |
| :--- | :--- | :--- | :--- |
| **Execução Contratual** | Contratos | `TituloConciliado` | Atualiza histórico de pagamentos vinculado ao contrato (valor bruto do documento). |
| **Orçamento** | Orçamento | `TituloConciliado` | Consolida gasto no plano orçamentário e categoria definidos no documento. |

## 3. Detalhamento: Integração Bradesco (CNAB/VAN)

O sistema foi desenhado para suportar as especificidades do Bradesco através do contexto de integração:

* **Padrão Utilizado**: CNAB 240 (preferencial para pagamentos estruturados).
* **Ciclo de Arquivos**:
  1. **Remessa**: Enviada à VAN com ordens de pagamento (Segmentos P, Q, J).
  2. **Retorno** (alguns minutos depois): Arquivo de confirmação do banco.
     * **Acatado (código 00)**: Título permanece `Transmitido` no Core (flag lógica ativada).
     * **Recusado (qualquer erro)**: Status muda para `Recusado`. Operador é alertado (ex: "03 - Agência Inválida").
  3. **Extrato D+1**: Arquivo bancário do dia seguinte. Única fonte de verdade para confirmação de saída de caixa (`Transmitido` → `Pago`).
* **Segmentos (ACL)**: O Tradutor de Layouts converte os Títulos do Core para os Segmentos P, Q e J (específicos para pagamentos de títulos e tributos no Bradesco).

## 4. Estratégia de Isolamento (ACL)

> **Ponto de Atenção**: O Core Financeiro nunca deve saber o que é um "Header de Arquivo" ou "Trailer de Lote". Se a empresa decidir abrir uma conta no Itaú amanhã, o Core permanece intacto; apenas um novo "Tradutor" é plugado neste contexto.

> **Ponto de Atenção — Cross-Módulo**: O Core Financeiro nunca deve saber a estrutura interna dos módulos de Contratos ou Orçamento. A comunicação ocorre exclusivamente via eventos de domínio (`TituloConciliado`), garantindo que mudanças nos outros módulos não impactem o Financeiro.

## 5. Resumo em 5 Frases

1. O sistema consome dados de OCR para acelerar o lançamento, mas exige crivo humano para evitar o *Single Point of Failure*.
2. A comunicação com o Bradesco é feita via arquivos CNAB, onde o **Retorno** indica acatamento ou erro, mas **não confirma pagamento**.
3. A **Saída Bancária** confirmada pelo extrato D+1 é a única verdade absoluta para o status `PAGO`.
4. A integridade é garantida por assinaturas digitais (Hash) que vinculam o que o sistema aprovou ao que o banco processou.
5. A conciliação final dispara eventos para os módulos de **Contratos** e **Orçamento**, mantendo o Financeiro desacoplado de suas estruturas internas.
