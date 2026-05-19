# 📡 Matriz de Fluxo de Eventos

## 1. Objetivo
Esta matriz é o "mapa de fofocas" do sistema. Ela mostra como um evento disparado em um canto faz o outro lado reagir, garantindo a integridade descrita nos contextos.

## 2. Matriz de Eventos (Fluxo Interno)

| Evento | Produzido por (Origem) | Consumido por (Reação) | Impacto no Negócio |
| :--- | :--- | :--- | :--- |
| `DocumentoSelado` | **Documentos** | **Títulos** | Gatilha a criação automática do Título Pai e Filhos. |
| `TituloAprovado` | **Títulos** | **Integração Bancária** | Habilita o título para ser listado na próxima Remessa. |
| `TituloTransmitido` | **Títulos** | **Governança (Logs)** | Trava o título contra qualquer alteração manual. |
| `RetornoProcessado` | **Integração Bancária** | **Títulos** | Atualiza se o banco aceitou o título ou se houve erro. |
| `SaidaBancariaConfirmada` | **Integração Bancária** | **Títulos** | Move o status para `PAGO` (confirmação do extrato). |
| `TituloLiquidado` | **Títulos** | **Documentos** | Marca o Fato Gerador como "Totalmente Quitado". |
| `DocumentoReaberto` | **Documentos** | **Títulos** | Cancela títulos em aberto que ainda não foram transmitidos. |

## 3. Categorias de Fluxo

### A. Fluxo de Ingestão (Entrada)
* `DocumentoCapturado` → `DocumentoEnriquecido` → `AprovacaoSolicitada`.

### B. Fluxo de Execução (Bancário)
* `TituloAprovado` → `ArquivoRemessaGerado` → `TituloTransmitido`.

### C. Fluxo de Fechamento (Conciliação)
* `ExtratoImportado` → `SaidaBancariaIdentificada` → `TituloPago` → `AutorizarLiquidacao`.

## 4. Integração com Sistemas Externos

| Sistema Externo | Evento Recebido | Evento Enviado |
| :--- | :--- | :--- |
| **Serviço OCR** | `ArquivoSubido` | `DadosExtraidos` |
| **VAN Bancária** | `RemessaGerada` | `ArquivoRetornoDisponivel` |
| **Banco (Extrato)** | (N/A) | `TransacoesExtratoBancario` |

## 5. Como usar essa matriz
Esta matriz serve para o gestor entender as **dependências**. Se o evento `SaidaBancariaConfirmada` não acontecer, o título nunca chegará ao estado de `PAGO`, impedindo a `Liquidação`. Ela é a base para as telas de "Tracking" (Rastreabilidade) do sistema.
