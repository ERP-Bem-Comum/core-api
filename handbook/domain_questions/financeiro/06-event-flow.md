# 📡 Matriz de Fluxo de Eventos

## 1. Objetivo

Esta matriz é o "mapa de fofocas" do sistema. Ela mostra como um evento disparado em um canto faz o outro lado reagir, garantindo a integridade descrita nos contextos.

## 2. Matriz de Eventos (Fluxo Interno)

| Evento | Produzido por (Origem) | Consumido por (Reação) | Impacto no Negócio |
| :--- | :--- | :--- | :--- |
| `TituloAprovado` | **Títulos** | **Integração Bancária** | Aprova título pai e filhos (status `Aberto` → `Aprovado`). Habilita remessa ou pagamento manual. |
| `RascunhoSalvo` | **Títulos** | — | Persiste título em estado temporário (autosave). |
| `TituloSubmetido` | **Títulos** | — | Título sai de `Rascunho` e entra no workflow como `Aberto`. |
| `TituloAprovado` | **Títulos** | **Integração Bancária** | Habilita o título para ser listado na próxima Remessa. Filhos são aprovados automaticamente. |
| `TituloTransmitido` | **Títulos** | **Governança (Logs)** | Trava o título contra qualquer alteração manual. |
| `RetornoProcessado` | **Integração Bancária** | **Títulos** | Se acatado: ativa flag lógica `acatadoPeloBanco` (status permanece `Transmitido`). Se erro: status `Recusado`. |
| `TituloPagoManualmente` | **Títulos** | — | Registra pagamento fora da remessa (ex: Internet Banking). |
| `SaidaBancariaConfirmada` | **Integração Bancária** | **Títulos** | Move o status para `PAGO` (confirmação do extrato D+1). |
| `PagamentoDesfeito` | **Títulos** | — | Retorna título de `Pago` para `Aprovado` por erro ou estorno. |
| `TituloConciliado` | **Submódulo Conciliação** | **Execução Contratual** + **Orçamento** | Marca título como quitado. Atualiza histórico de pagamento no contrato (valor bruto do documento) e consolida gasto no plano orçamentário/categoria. |
| `ConciliacaoDesfeita` | **Submódulo Conciliação** | — | Retorna título de `Conciliado` para `Pago` (Unreconcile). Mantém histórico da conciliação desfeita. |
| `ExtratoImportado` | **Submódulo Conciliação** | — | Novo extrato bancário processado. Dispara motor de match. |
| `MatchSugerido` | **Submódulo Conciliação** | — | Sistema calculou score de similaridade entre extrato e título. Aguarda confirmação manual. |
| `MatchRejeitado` | **Submódulo Conciliação** | — | Operador rejeitou sugestão de match. Remove da lista de pendentes. |
| `LancamentoManualCriado` | **Submódulo Conciliação** | — | Criado lançamento manual (tarifa, juros, multa) vinculado ao extrato. |
| `LoteSugerido` | **Submódulo Conciliação** | — | Sistema identificou padrão recorrente (ex: tarifas bancárias) para conciliação em lote. |
| `PeriodoConciliacaoFechado` | **Submódulo Conciliação** | — | Período de conciliação fechado. Bloqueia novas importações e alterações. |
| `AprovacaoDesfeita` | **Títulos** | — | Título pai volta para `Aberto`. Filhos perdem aprovação automaticamente. Se houver alteração de valores, filhos sofrem hard delete. |
| `TituloResetado` | **Títulos** | — | Título `Recusado` volta para `Aprovado` para nova tentativa de remessa. |
| `DocumentoReaberto` | **Documentos** | **Títulos** | Cancela títulos em aberto que ainda não foram transmitidos. |

## 3. Categorias de Fluxo

### A. Fluxo de Ingestão (Entrada)

* `DocumentoCapturado` → `DocumentoEnriquecido` → `AprovacaoSolicitada` → `TituloAprovado`.

### B. Fluxo de Rascunho e Submissão

* `RascunhoSalvo` (autosave) → `TituloSubmetido` → `Aberto` → `TituloAprovado`.

### C. Fluxo de Execução Bancária (Padrão)

* `TituloAprovado` → `ArquivoRemessaGerado` → `TituloTransmitido` → `RetornoProcessado` (acatamento, flag lógica) → `SaidaBancariaConfirmada` (extrato D+1) → `Pago`.

### D. Fluxo de Execução Manual (Fora da Remessa)

* `TituloAprovado` → `TituloPagoManualmente` → `Pago`.

### E. Fluxo de Recuperação (Erro Bancário)

* `TituloTransmitido` → `RetornoProcessado` (erro) → `Recusado` → `TituloResetado` → `Aprovado`.

### F. Fluxo de Fechamento (Conciliação)

* `TituloPago` → `AutorizarConciliacao` → `TituloConciliado` → notifica Contratos + Orçamento.

### G. Fluxo de Desfazimento

* `Conciliado` → `ConciliacaoDesfeita` → `Pago`.
* `Pago` → `PagamentoDesfeito` → `Aprovado`.
* `Aprovado` → `AprovacaoDesfeita` → `Aberto`.

### H. Fluxo do Submódulo Conciliação (Detalhado)

* **Importação**: `ExtratoImportado` → Motor de Match calcula scores.
* **Sugestão**: `MatchSugerido` → Operador visualiza side-by-side → `ConfirmarMatch` → `TituloConciliado`.
* **Rejeição**: `MatchSugerido` → Operador rejeita → `MatchRejeitado` → busca manual.
* **Busca Manual**: Operador filtra → seleciona título(s) → verifica diferença → `TituloConciliado` (ou `LancamentoManualCriado` + `TituloConciliado`).
* **Lançamento Manual**: Tarifa/juros/multa → `LancamentoManualCriado` → `TituloConciliado`.
* **Conciliação em Lote**: Sistema identifica padrão → `LoteSugerido` → Operador confirma → N × `TituloConciliado`.
* **Desfazimento**: Clicar em conciliada → modal detalhes → `ConciliacaoDesfeita` → título volta para `Pago`.

## 4. Integração com Sistemas Externos

| Sistema Externo | Evento Recebido | Evento Enviado |
| :--- | :--- | :--- |
| **Serviço OCR** | `ArquivoSubido` | `DadosExtraidos` |
| **VAN Bancária** | `RemessaGerada` | `ArquivoRetornoDisponivel` |
| **Banco (Extrato)** | `ArquivoExtratoSubido` (OFX/PDF/CSV/XLSX) | `ExtratoImportado` |

## 5. Integração Cross-Módulo

| Evento | Destino | Propósito |
| :--- | :--- | :--- |
| `TituloConciliado` | **Execução Contratual** | Atualiza histórico de pagamentos vinculado ao contrato, utilizando o **valor bruto** do documento lançado. |
| `TituloConciliado` | **Orçamento** | Consolida o gasto no **plano orçamentário** e **categoria** definidos na inclusão do documento/Nota Fiscal. |

## 6. Como usar essa matriz

Esta matriz serve para o gestor entender as **dependências**. Se o evento `SaidaBancariaConfirmada` não acontecer, o título nunca chegará ao estado de `PAGO`, impedindo a `Conciliação`. Ela é a base para as telas de "Tracking" (Rastreabilidade) do sistema.
