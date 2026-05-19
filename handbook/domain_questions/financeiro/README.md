# 📦 Handbook de Domínio: Módulo Financeiro

## 🎯 Visão Estratégica
Este sistema é focado em **Governança e Integridade Financeira** para entidades sem fins lucrativos. Ele substitui o lançamento de títulos avulsos pelo conceito de **Fato Gerador**, onde o Documento Fiscal é a raiz de toda obrigação.

## 🗺️ Mapa de Contextos (Resumo)
1. **Gestão de Documentos (Core ⭐)**: Dono do Fato Gerador e das regras de aprovação.
2. **Títulos e Liquidação (Core ⭐)**: Gere o ciclo de vida financeiro e a carteira de pagamentos.
3. **Ingestão & OCR (Suporte)**: Facilita a entrada de dados.
4. **Integração Bancária (Genérico)**: ACL que traduz dados para o layout do **Bradesco**.

## 🧩 Bounded Contexts

| BC | Tipo | Documento |
| :-- | :-- | :-- |
| Gestão de Documentos | Core ⭐ | [bounded-contexts/gestao-documentos.md](./bounded-contexts/gestao-documentos.md) |
| Títulos e Liquidação | Core ⭐ | [bounded-contexts/titulos-liquidacao.md](./bounded-contexts/titulos-liquidacao.md) |
| Integração Bancária | Generic (ACL) | [bounded-contexts/integracao-bancaria.md](./bounded-contexts/integracao-bancaria.md) |

## 📚 Documentos Transversais
* [01-introducao.md](./01-introducao.md) — Visão de produto, atores e MVP
* [02-context-map.md](./02-context-map.md) — Mapa de contextos e relacionamentos
* [06-event-flow.md](./06-event-flow.md) — Matriz de eventos
* [07-external-context.md](./07-external-context.md) — Fronteiras com VAN/OCR/Bradesco
* [especificacao-mestre.md](./especificacao-mestre.md) — Documento mestre consolidado

## 🔄 Status do Título (Fluxo de Vida)
* **ABERTO**: Documento capturado, aguardando aprovação.
* **APROVADO**: Crivo de governança realizado; pronto para o banco.
* **TRANSMITIDO**: Incluído em arquivo de remessa enviado à VAN.
* **RECUSADO**: Banco identificou erro (exige reset manual).
* **ATRASADO**: Passou o dia previsto sem confirmação de saída bancária.
* **PAGO**: Saída confirmada via Extrato/Retorno.
* **LIQUIDADO**: Baixa final autorizada pelo Gestor (Conciliado).

## 🛡️ Regras de Ouro (Invariantes)
* **R1**: Um título só nasce de um documento "Selado".
* **R2**: O Valor Líquido é calculado (`Bruto − Impostos − Descontos + Juros/Multa`) e imutável pelo usuário.
* **R3**: Alterar valores financeiros exige a reabertura do Documento Pai.
* **R4**: A conciliação exige o `FITID` único para evitar duplicidade de extrato.

## 📖 Glossário Essencial
* **Fato Gerador**: Documento fiscal que origina a dívida.
* **Soberania do Documento**: O sistema reflete o que o OCR lê, alertando desvios sem impedi-los.
* **Crivo de Liquidação**: Autorização humana obrigatória para a baixa do título.
