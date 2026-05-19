# 📘 Especificação Mestra: Módulo Financeiro (Core Financeiro)

> Este documento estabelece a estrutura de domínio para o novo sistema financeiro, fundamentado no paradigma **Document-Driven Finance**. O foco reside na integridade do fato gerador, na automação via OCR e no controle rigoroso do fluxo bancário (**Bradesco**).
>
> Reflete a transição do modelo "CRUD de títulos" para o modelo centrado no **Fato Gerador**, com foco absoluto em governança, integridade fiscal e controle bancário.

---

## 1. 🧭 Visão Estratégica

### 1.1. Objetivo de Negócio
Transicionar de um modelo de "títulos avulsos" para um modelo centrado no **Fato Gerador**. O sistema garante que nenhuma obrigação financeira exista sem um documento de origem validado, assegurando transparência fiscal e conformidade bancária para entidades de governança rigorosa.

### 1.2. Atores e Responsabilidades

| Ator | Responsabilidade |
| :--- | :--- |
| **Operador de Contas a Pagar** | Realiza ingestão (OCR), enriquecimento de dados e geração de remessas CNAB. |
| **Aprovador (Perfil de Governança)** | Valida lançamentos e "Sela" o documento, autorizando a existência da dívida. Único ator que aprova títulos. |
| **Gestor Financeiro** | Crivo final de liquidação (baixa) na conciliação. |
| **Perfil de Auditoria/Governança** | Acesso à trilha e "Time Travel" das alterações. |
| **Sistema (Vigilante Fiscal)** | Motor de regras que **sinaliza** desvios de alíquotas e garante a integridade dos dados lidos via OCR. |

### 1.3. Métricas de Sucesso (KPIs)
* ⏱️ **Tempo de Ciclo** — Lead time da leitura do OCR até o agendamento bancário.
* ✅ **Acurácia de Retenção** — % de documentos processados sem ajuste manual nos impostos.
* 🔁 **Taxa de Liquidação Automática** — % de transações do extrato "casadas" sem intervenção.
* 🚫 **Taxa de Rejeição Bancária** — Volume de títulos retornados com erro pelo Bradesco.

### 1.4. Escopo MVP
* ✅ Ingestão de documentos via OCR e extração de dados.
* ✅ Motor de vigilância de retenções (ISS, IRRF, INSS, CSRF).
* ✅ Geração de arquivos CNAB 240 (Bradesco) e leitura de retorno.
* ✅ Importação de extratos OFX (primário) com fallback para PDF e XLSX.
* ✅ Gestão de Status (`Aberto`, `Aprovado`, `Transmitido`, `Recusado`, `Atrasado`, `Pago`, `Liquidado`).
* ✅ Trilha de Auditoria com Time Travel.
* ✅ Conciliação com crivo humano de liquidação.

---

## 2. 📍 Mapa de Contextos (Strategic Design)

### 2.1. Diagrama de Fronteiras

```plaintext
[ Portal do Usuário / UI ]
          |
          ▼
[ BC Ingestão & OCR ] ──(ACL)──► [ BC Gestão de Documentos (CORE ⭐) ]
                                            |
                                            | (Gera obrigações)
                                            ▼
[ BC Integração Bancária (ACL) ] ◄── [ BC Títulos e Liquidação (CORE ⭐) ]
          |
          ▼
[ VAN Bancária: BRADESCO (Externo) ]
```

### 2.2. Tabela de Bounded Contexts

| Bounded Context | Responsabilidade | Tipo |
| :--- | :--- | :--- |
| **Gestão de Documentos** | Controle do Fato Gerador e Selagem Fiscal. | **Core ⭐** |
| **Títulos e Liquidação** | Ciclo de vida financeiro e carteira de pagamentos. | **Core ⭐** |
| **Integração Bancária** | Tradutor de Layouts (Bradesco) e Proteção (ACL). | Generic |
| **Ingestão & OCR** | Transformação de arquivos brutos em dados estruturados. | Supporting |

### 2.3. Relacionamento Chave: Fato Gerador
O contexto de **Títulos** é dependente do contexto de **Documentos**. Se um documento é "Reaberto", seus títulos derivados tornam-se inválidos ou bloqueados, garantindo que o financeiro **nunca pague algo diferente do fiscal**.

---

## 3. 🧩 Detalhamento: Gestão de Documentos (O Fato Gerador)

### 3.1. Princípio da Soberania do Documento
O sistema **respeita** o que está impresso no documento fiscal. Atua como vigilante, **sinalizando** desvios sem impedir o fluxo, evitando o *Single Point of Failure* de uma regra automática rígida.

> **Sinalização de Desvio** — Se o Operador alterar um valor lido pelo OCR ou se um imposto divergir da alíquota padrão, o sistema sinaliza o alerta, mas não impede o lançamento (respeitando a soberania do documento real).

### 3.2. Regras de Negócio (Invariantes)

* **R1 (Cálculo do Valor Líquido)** — Campo calculado e bloqueado para edição manual:
  > `Valor Líquido = Valor Bruto − Impostos Retidos − Descontos + Multa + Juros`
* **R2 (Soberania do Documento)** — O OCR é a fonte primária; alterações manuais são **logadas**, não impedidas.
* **R3 (Vigilância de Alíquota)** — Divergências de alíquotas geram **alerta**, não bloqueio.
* **R4 (Imutabilidade pós-Selo)** — Documento `Selado` tem todos os campos de valor imutáveis.
* **R5 (Workflow de Reabertura)** — `ReabrirDocumento` realiza rollback e exige nova aprovação.
* **R6 (Herança de Contrato)** — Fornecedor com contrato ativo: alíquotas sugeridas conforme contrato.

### 3.3. Comandos Principais

| Comando | Quem | Efeito | Evento |
| :--- | :--- | :--- | :--- |
| `RegistrarEntradaOCR` | Sistema | Cria documento `Aberto` | `DocumentoCapturado` |
| `AjustarLancamento` | Operador | Edita Bruto/Impostos/Juros | `LancamentoRefinado` |
| `SolicitarAprovacao` | Operador | Move para `Em_Aprovação` | `AprovacaoSolicitada` |
| `AprovarDocumento` | Aprovador | `Selado` (imutável) | `DocumentoSelado` |
| `ReabrirDocumento` | Aprovador | Rollback para `Aberto` | `DocumentoReaberto` |

---

## 4. 💰 Detalhamento: Títulos e Liquidação

### 4.1. Estrutura de Títulos (Pai e Filhos)
Ao selar um documento, o sistema gera:
1. **Título Principal** — Valor Líquido destinado ao fornecedor.
2. **Títulos de Imposto (Filhos)** — Obrigações para órgãos competentes (ISS, IRRF, INSS, CSRF).

### 4.2. Máquina de Estados do Título

| Status | Significado |
| :--- | :--- |
| **ABERTO** | Criado, aguardando aprovação. |
| **APROVADO** | Liberado para o fluxo bancário. |
| **TRANSMITIDO** | Incluído em remessa CNAB enviada ao Bradesco. |
| **RECUSADO** | Erro retornado pelo banco (permite ajuste e reset para `APROVADO`). |
| **ATRASADO** | Status automático se D+1 passar sem confirmação de saída bancária. |
| **PAGO** | Status atingido após confirmação de **Saída Bancária** real (Extrato). |
| **LIQUIDADO** | Estado final após o **Crivo de Liquidação** (autorização humana do Gestor). |

### 4.3. Pagamentos Extra-Remessa
O sistema permite que o Operador marque um título como `PAGO` manualmente (ex: pagamento via Internet Banking fora do CNAB), mantendo a obrigatoriedade da conciliação futura com o extrato.

### 4.4. Regras Críticas de Liquidação

* **R1 (Soberania da Aprovação)** — Apenas `APROVADO` pode entrar em remessa ou virar `PAGO`.
* **R2 (Imutabilidade de Valor)** — Não se edita o valor de um título; reabre o documento pai.
* **R3 (Diferenciação Retorno vs. Saída)** — Sucesso de retorno CNAB **≠** Saída Bancária. Apenas a saída real muda para `PAGO`.
* **R4 (Crivo de Liquidação)** — `PAGO → LIQUIDADO` **nunca é automático**.
* **R5 (Anti-Duplicidade FITID)** — Mesma transação bancária não pode ser processada duas vezes.

---

## 5. 🔌 Integração Bancária (ACL Bradesco)

### 5.1. Tradutor de Layouts
Componente "intérprete" que isola o sistema das especificidades do Bradesco:
* **CNAB 240** — Geração de remessa e leitura de retorno (Segmentos P, Q, J).
* **Extratos** — Processamento de OFX (primário), PDF e XLSX (fallback).

### 5.2. Regras de Integridade Bancária

* **Anti-Duplicidade (FITID)** — Identificador único impede dupla importação.
* **Hash de Segurança** — Checksum gerado na remessa para detectar manipulações externas.
* **Soberania do Layout** — Core não conhece "Header de Arquivo" ou "Trailer de Lote"; apenas a ACL.
* **Fallback de Extrato** — Falha em OFX → permite XLSX/PDF com mesmas regras de limpeza.

### 5.3. Tratativa de Erros Bradesco
Códigos de erro do Bradesco (ex: Erro 03 — Agência Inválida) são traduzidos para o status `RECUSADO` com mensagem amigável para o Operador.

---

## 6. 📡 Matriz de Eventos de Domínio

| Evento | Origem | Reação do Sistema |
| :--- | :--- | :--- |
| `DocumentoSelado` | Documentos | Gera os Títulos Financeiros vinculados. |
| `DocumentoReaberto` | Documentos | Cancela títulos em aberto. |
| `TituloAprovado` | Títulos | Disponibiliza para remessa ou pagamento manual. |
| `TituloTransmitido` | Títulos | Trava título contra alterações. |
| `RetornoProcessado` | Integração | Atualiza aceitação ou erro do título. |
| `SaidaBancariaIdentificada` | Integração | Localiza título correspondente no Core. |
| `SaidaBancariaConfirmada` | Integração | Move título para `PAGO`. |
| `PagamentoAtrasado` | Sistema | Notifica falta de confirmação em D+1. |
| `TituloRecusado` | Títulos | Aciona alerta para correção. |
| `TituloLiquidado` | Títulos | Marca Fato Gerador como totalmente quitado. |
| `AuditLogGenerated` | Qualquer BC | Registra "Quem, Quando, De, Para" (Time Travel). |

---

## 7. 📖 Glossário Ubíquo (Resumo)

| Termo | Definição |
| :--- | :--- |
| **Fato Gerador** | Documento (NF, Recibo) que dá origem à obrigação financeira. |
| **Selo** | Estado de bloqueio que garante fidelidade entre fiscal e financeiro. |
| **Soberania do Documento** | Sistema reflete o documento, sinaliza desvios sem bloquear. |
| **Crivo de Liquidação** | Autorização humana obrigatória para baixa final. |
| **Saída Bancária** | Débito real na conta — única verdade para status `PAGO`. |
| **FITID** | Identificador transacional do banco; chave de unicidade. |
| **ACL (Anticorruption Layer)** | Camada que isola o domínio de termos bancários. |
| **Time Travel** | Capacidade de auditar cada mudança histórica. |
| **VAN Bancária** | Túnel de comunicação de arquivos com o Bradesco. |
| **Tradutor de Layouts** | "Intérprete de idiomas" para diferentes formatos bancários. |

> Glossário completo em [`08-glossario-ubiquo.md`](./08-glossario-ubiquo.md).

---

## 8. 🎯 Princípios Imutáveis do Projeto

> **Nota do Arquiteto:** Este documento é imutável em seus princípios core. Qualquer alteração tecnológica (banco de dados, linguagens) **não deve afetar** estas regras de domínio.

1. **Nada existe no financeiro sem um Fato Gerador validado.**
2. **O sistema reflete o documento, não o contrário** — soberania documental + sinalização de desvios.
3. **O valor líquido é calculado, jamais digitado.**
4. **Sucesso bancário é a Saída Real, não o retorno do CNAB.**
5. **A Liquidação exige crivo humano** — automação assiste, governança decide.
6. **A trilha de auditoria é transversal e inegociável** em cada mudança de estado.
7. **O Core não conhece formatos bancários** — toda complexidade fica na ACL.
