# 📡 Matriz de Eventos (Event Line)

> Esta matriz é o **"mapa de fofocas"** do sistema. Ela mostra como um evento disparado em um canto faz o outro lado reagir, garantindo a integridade entre contextos.

## 1. Matriz de Eventos (Fluxo Interno)

| Evento | Produzido por (Origem) | Consumido por (Reação) | Impacto no Negócio |
| :--- | :--- | :--- | :--- |
| `DocumentoCapturado` | **Documentos** | (UI / Operador) | O documento existe no sistema como rastro digital. |
| `LancamentoRefinado` | **Documentos** | **Governança (Logs)** | Registra ajustes do operador sobre os dados do OCR. |
| `AprovacaoSolicitada` | **Documentos** | (UI do Aprovador) | Documento entra no funil de aprovação. |
| `DocumentoSelado` | **Documentos** | **Títulos** | Gatilha a criação automática do Título Pai e Filhos. |
| `DocumentoReaberto` | **Documentos** | **Títulos** | Cancela títulos em aberto que ainda não foram transmitidos. |
| `TitulosGerados` | **Títulos** | (UI do Aprovador) | Carteira de pagamentos atualizada. |
| `TituloAprovado` | **Títulos** | **Integração Bancária** | Habilita o título para ser listado na próxima Remessa. |
| `ArquivoRemessaGerado` | **Integração Bancária** | **Títulos** | Move títulos para `Transmitido`. |
| `TituloTransmitido` | **Títulos** | **Governança (Logs)** | Trava o título contra qualquer alteração manual. |
| `RetornoProcessado` | **Integração Bancária** | **Títulos** | Atualiza se o banco aceitou o título ou se houve erro. |
| `TituloRecusado` | **Títulos** | (UI do Operador) | Aciona alerta para correção e reset manual. |
| `SaidaBancariaIdentificada` | **Integração Bancária** | **Títulos** | Localiza título correspondente no Core. |
| `SaidaBancariaConfirmada` | **Integração Bancária** | **Títulos** | Move o status para `PAGO` (confirmação do extrato). |
| `PagamentoAtrasado` | **Sistema** | (UI do Operador) | Notifica falta de confirmação em D+1. |
| `TituloPagoManualmente` | **Títulos** | **Governança (Logs)** | Registra pagamento extra-remessa para conciliação futura. |
| `TituloLiquidado` | **Títulos** | **Documentos** | Marca o Fato Gerador como "Totalmente Quitado". |
| `ConciliacaoConfirmada` | **Liquidação** | **Documentos** | Encerra o ciclo do título. |
| `AuditLogGenerated` | **Qualquer BC** | **Governança** | Registra "Quem, Quando, De, Para" (Time Travel). |

## 2. Categorias de Fluxo

### A. Fluxo de Ingestão (Entrada)
```
DocumentoCapturado → DocumentoEnriquecido → LancamentoRefinado → AprovacaoSolicitada → DocumentoSelado
```

### B. Fluxo de Execução (Bancário)
```
TituloAprovado → ArquivoRemessaGerado → TituloTransmitido → SaidaBancariaConfirmada
```

### C. Fluxo de Fechamento (Conciliação)
```
ExtratoImportado → SaidaBancariaIdentificada → TituloPago → AutorizarLiquidacao → TituloLiquidado
```

### D. Fluxo de Exceção (Recuperação)
```
TituloRecusado → ResetarParaAprovado → TituloAprovado → (volta ao fluxo B)
```

## 3. Integração com Sistemas Externos

| Sistema Externo | Evento Recebido | Evento Enviado |
| :--- | :--- | :--- |
| **Serviço OCR** | `ArquivoSubido` | `DadosExtraidos` |
| **VAN Bancária (Bradesco)** | `RemessaGerada` | `ArquivoRetornoDisponivel` |
| **Banco (Extrato)** | (N/A) | `TransacoesExtratoBancario` |

## 4. Como usar essa matriz

Esta matriz serve para o gestor entender as **dependências** entre contextos.

> Se o evento `SaidaBancariaConfirmada` não acontecer, o título nunca chegará ao estado de `PAGO`, impedindo a `Liquidação`.

Ela é a base para as telas de **Tracking (Rastreabilidade)** do sistema e para o desenho dos relatórios de governança.
