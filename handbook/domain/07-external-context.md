# 🔌 Integrações e Fronteiras Externas

## 1. Sistemas e Fronteiras

O Core Financeiro **não é uma ilha**. Ele depende de fluxos de dados que vêm de fora, mas deve manter sua integridade caso esses sistemas falhem ou mudem.

## 2. Mapa de Integrações

| Alvo | Sistema | Como o Core Financeiro enxerga | Papel |
| :--- | :--- | :--- | :--- |
| **OCR / Ingestão** | Serviço de Visão | Provedor de Dados Brutos | Transforma PDF em JSON estruturado para o Operador. |
| **Banco (Bradesco)** | VAN Bancária | Destinatário de Ordens / Fonte de Verdade | Recebe arquivos de Remessa e envia Retorno/Extrato. |
| **Segurança** | Algoritmo Hash | Validador de Integridade | Garante que o arquivo gerado não foi alterado. |

## 3. Detalhamento: Integração Bradesco (CNAB / VAN)

O sistema foi desenhado para suportar as especificidades do **Bradesco** através do contexto de integração. O Bradesco possui um dos layouts de CNAB 240 e 400 mais rígidos do mercado, o que justifica perfeitamente a existência da nossa **ACL (Camada de Anticorrupção)** e do **Tradutor de Layouts**.

### Padrão Utilizado
* **CNAB 240** (preferencial para pagamentos estruturados).

### Tratativa de Erros
O sistema mapeia os códigos de erro do Bradesco (ex: Erro 03 — Agência Inválida) e traduz para o status `RECUSADO` com a mensagem amigável para o Operador.

### Segmentos (ACL)
O Tradutor de Layouts converte os Títulos do Core para os **Segmentos P, Q e J** (específicos para pagamentos de títulos e tributos no Bradesco).

### Formatos de Extrato Suportados
| Prioridade | Formato | Observação |
| :--- | :--- | :--- |
| 1ª (Primário) | **OFX** | Padrão internacional, leitura automatizada |
| 2ª (Fallback) | **XLSX** | Útil quando OFX não está disponível |
| 3ª (Fallback) | **PDF** | Último recurso, exige validação reforçada |

## 4. Detalhamento: Serviço de OCR

* **Entrada:** PDF, imagem (JPG/PNG), ou XML de NFSe.
* **Saída esperada:** JSON estruturado com CNPJ, valores, datas e impostos identificados.
* **Tratamento de Falha:** Se o OCR falhar ou ler com baixa confiança, o documento entra em estado `Aberto` e exige preenchimento manual integral pelo Operador.
* **Soberania:** Os dados do OCR são **a fonte primária**. Qualquer alteração manual sobre eles é registrada na trilha de auditoria.

## 5. Estratégia de Isolamento (ACL)

> **Ponto de Atenção:** O Core Financeiro **nunca deve saber** o que é um "Header de Arquivo" ou "Trailer de Lote". Se a empresa decidir abrir uma conta no Itaú amanhã, o Core permanece intacto; apenas um novo "Tradutor" é plugado neste contexto.

### Princípio Geral
1. Toda comunicação externa atravessa um **adaptador**.
2. O adaptador converte para o **modelo canônico interno**.
3. O domínio recebe apenas dados validados e tipados.
4. A reversa é simétrica: o domínio publica intenções, o adaptador traduz para o formato externo.

## 6. Resumo em 3 Frases

1. O sistema consome dados de OCR para acelerar o lançamento, mas exige **crivo humano** para evitar o *Single Point of Failure*.
2. A comunicação com o Bradesco é feita via arquivos, onde a **"Saída Bancária"** é a única verdade absoluta para o status `PAGO`.
3. A integridade é garantida por **assinaturas digitais (Hash)** que vinculam o que o sistema aprovou ao que o banco processou.
