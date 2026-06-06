# 📦 Handbook de Domínio: Módulo Financeiro

## 🎯 Visão Estratégica
Este sistema é focado em **Governança e Integridade Financeira** para entidades sem fins lucrativos. Ele substitui o lançamento de títulos avulsos pelo conceito de **Fato Gerador**, onde o Documento Fiscal é a raiz de toda obrigação.

## 🗺️ Mapa de Contextos (Resumo)
1. **Gestão de Documentos (Core ⭐)**: Dono do Fato Gerador e das regras de aprovação.
2. **Títulos e Liquidação (Core ⭐)**: Gere o ciclo de vida financeiro e a carteira de pagamentos.
3. **Submódulo Conciliação (Core ⭐)**: Executa o casamento título/extrato e publica eventos para Contratos/Orçamento.
4. **Ingestão & OCR (Suporte)**: Facilita a entrada de dados.
5. **Integração Bancária (Genérico)**: ACL que traduz dados para o layout do **Bradesco**.

## 🧩 Bounded Contexts

| BC / Submódulo | Tipo | Documento |
| :-- | :-- | :-- |
| Gestão de Documentos | Core ⭐ | [bounded-contexts/gestao-documentos.md](./bounded-contexts/gestao-documentos.md) |
| Títulos e Liquidação | Core ⭐ | [bounded-contexts/titulos-liquidacao.md](./bounded-contexts/titulos-liquidacao.md) |
| Conciliação | Core ⭐ | [bounded-contexts/conciliacao.md](./bounded-contexts/conciliacao.md) |
| Integração Bancária | Generic (ACL) | [bounded-contexts/integracao-bancaria.md](./bounded-contexts/integracao-bancaria.md) |

## 📚 Documentos Transversais
* [01-introducao.md](./01-introducao.md) — Visão de produto, atores e MVP
* [02-context-map.md](./02-context-map.md) — Mapa de contextos e relacionamentos
* [06-event-flow.md](./06-event-flow.md) — Matriz de eventos
* [07-external-context.md](./07-external-context.md) — Fronteiras com VAN/OCR/Bradesco
* [especificacao-mestre.md](./especificacao-mestre.md) — Documento mestre consolidado

## 🔄 Status do Título (Fluxo de Vida)
* **RASCUNHO**: Persistência temporária (autosave).
* **ABERTO**: Documento capturado, aguardando aprovação.
* **APROVADO**: Crivo de governança realizado; pronto para o banco.
* **TRANSMITIDO**: Incluído em arquivo de remessa enviado à VAN.
* **RECUSADO**: Banco identificou erro (exige reset manual).
* **PAGO**: Saída confirmada via Extrato D+1 ou pagamento manual.
* **CONCILIADO**: Baixa final autorizada pelo Operador do Submódulo Conciliação.

## 🛡️ Regras de Ouro (Invariantes)
* **R1**: Um título nasce ao salvar um documento (clicar em "Salvar Documento"), com status `Aberto`. A aprovação é uma ação posterior que muda o status para `Aprovado`.
* **R2**: O Valor Líquido é calculado (`Bruto − Descontos na Fonte − Retenções − Descontos + Juros/Multa`). Impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) **não entram** no cálculo.
* **R3**: Alterar valores financeiros exige a reabertura do Documento Pai.
* **R4**: A conciliação exige o `FITID` único para evitar duplicidade de extrato.
* **R5**: Filhos só são gerados para **NFS-e** (ISS, IRRF, INSS, CSRF) e **RPA** (IRRF, INSS, CSRF). DANFE, Fatura, Boleto, Recibo e Imposto não geram filhos.
* **R6**: Somente formas de pagamento **TED** e **Transferência Bancária** geram remessa CNAB. Demais formas (PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro) seguem fluxo manual.

## 📖 Glossário Essencial
* **Fato Gerador**: Documento fiscal que origina a dívida.
* **Soberania do Documento**: O sistema reflete o que o OCR lê, alertando desvios sem impedi-los.
* **Crivo de Conciliação**: Autorização humana obrigatória no submódulo Conciliação para a baixa do título.
* **NFS-e / DANFE / RPA / Fatura**: Tipos de documento fiscal com regras distintas de retenção e geração de filhos.
* **Boleto / Recibo / Imposto**: Tipos de documento não-fiscal. Geram 1 título pai cada.
* **Forma de Pagamento**: Define se o título entra em remessa CNAB (TED, Transferência Bancária) ou pagamento manual.
* **Impostos Registrados (Reforma)**: CBS, IBS Municipal, IBS Estadual. Leitura apenas, sem impacto financeiro.
* **Descontos na Fonte**: Descontos abatidos do valor bruto no cálculo do líquido.
