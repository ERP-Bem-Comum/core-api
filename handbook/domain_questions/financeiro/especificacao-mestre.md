# 📘 Especificação Mestra: Módulo Financeiro (Core Financeiro)

Este documento estabelece a estrutura de domínio para o novo sistema financeiro, fundamentado no paradigma **Document-Driven Finance**. O foco reside na integridade do fato gerador, na automação via OCR e no controle rigoroso do fluxo bancário (Bradesco).

---

## 1. 🧭 Visão Estratégica

### 1.1. Objetivo de Negócio

Transicionar de um modelo de "títulos avulsos" para um modelo centrado no **Fato Gerador**. O sistema garante que nenhuma obrigação financeira exista sem um documento de origem validado, assegurando transparência fiscal e conformidade bancária para entidades de governança rigorosa.

### 1.2. Atores e Responsabilidades

* **Operador de Contas a Pagar / Analista**: Realiza a ingestão (OCR ou inclusão manual), o enriquecimento de dados, a geração de remessas CNAB e registra pagamentos manuais. **Não aprova**.
* **Aprovador (Perfil de Governança)**: Valida os lançamentos e aprova o título, autorizando o prosseguimento do ciclo financeiro. Pode desfazer aprovação. Pode ser o Gestor Financeiro ou outro perfil com poder de aprovação. **Analistas/Operadores nunca aprovam**.
* **Operador do Submódulo Conciliação**: Executa o processo de conciliação (casamento título/extrato), autoriza `Unreconcile` e desfazimento de conciliação. Pode ser o Gestor Financeiro.
* **Sistema (Vigilante Fiscal)**: Motor de regras que sinaliza desvios de alíquotas e garante a integridade dos dados lidos via OCR.
* **Sistema (Processador Retorno)**: Lê arquivos de retorno do banco e identifica acatamentos e erros automaticamente.

### 1.3. Métricas de Sucesso (KPIs)

* ⏱️ **Tempo de Ciclo**: Lead time da leitura do OCR até o agendamento bancário.
* ✅ **Acurácia de Retenção**: % de documentos processados sem ajuste manual nos impostos.
* 🔁 **Taxa de Conciliação Automática**: % de transações do extrato "casadas" sem intervenção.
* 🚫 **Taxa de Rejeição Bancária (VAN)**: Volume de títulos que retornam com erro (ajuda a identificar problemas de cadastro de fornecedores).

---

## 2. 📍 Mapa de Contextos (Strategic Design)

O sistema é segmentado em fronteiras lógicas para proteger as regras de negócio:

### 2.1. Tabela de Bounded Contexts

| Bounded Context | Responsabilidade | Tipo |
| :--- | :--- | :--- |
| **Gestão de Documentos** | Controle do Fato Gerador e Aprovação Fiscal. | **Core ⭐** |
| **Títulos e Liquidação** | Ciclo de vida financeiro e carteira de pagamentos. | **Core ⭐** |
| **Integração Bancária** | Tradutor de Layouts (Bradesco) e Proteção (ACL). | Generic |
| **Ingestão & OCR** | Transformação de arquivos brutos em dados estruturados. | Supporting |

### 2.2. Contextos Integrados (Cross-Módulo)

| Contexto | Relação | Descrição |
| :--- | :--- | :--- |
| **Execução Contratual** | Consumidor de Eventos | Recebe `TituloConciliado` para atualizar histórico de pagamentos vinculado ao contrato (valor bruto do documento). |
| **Orçamento** | Consumidor de Eventos | Recebe `TituloConciliado` para consolidar gasto no plano orçamentário e categoria definidos no documento. |

### 2.3. Relacionamento Chave: Fato Gerador

O contexto de **Títulos** é dependente do contexto de **Documentos**. Se um documento é "Reaberto", seus títulos derivados perdem a aprovação ou são cancelados para garantir que o financeiro nunca pague algo diferente do fiscal.

---

## 3. 🧩 Detalhamento do Domínio: Gestão de Documentos

### 3.1. Tipos de Documento

| Tipo | Classificação | Impostos Retidos (geram filhos) | Impostos Registrados (apenas leitura) | Gera Filhos? |
| :--- | :--- | :--- | :--- | :--- |
| **NFS-e** | Fiscal | ISS, IRRF, INSS, CSRF | CBS, IBS Municipal, IBS Estadual | ✅ Sim |
| **DANFE** | Fiscal | — | ICMS, IPI, PIS, COFINS, CBS, IBS Municipal, IBS Estadual | ❌ Não |
| **RPA** | Fiscal | IRRF, INSS, CSRF | CBS, IBS Municipal, IBS Estadual | ✅ Sim |
| **Fatura** | Fiscal | — | CBS, IBS Municipal, IBS Estadual | ❌ Não |
| **Boleto** | Não-Fiscal | — | — | ❌ Não |
| **Recibo** | Não-Fiscal | — | — | ❌ Não |
| **Imposto** | Não-Fiscal | — | — | ❌ Não |

* **Retenções**: Impostos que geram títulos filhos e são abatidos do valor líquido.
* **Impostos Registrados**: Impostos lidos pelo OCR e registrados em campos, mas **não geram filhos** e **não entram no cálculo do líquido**.
* **Descontos na Fonte**: Descontos lidos do documento (adiantamento, bonificação) que **são abatidos** do valor bruto.

### 3.2. Formas de Pagamento e CNAB

| Forma de Pagamento | Gera Remessa CNAB? | Fluxo |
| :--- | :--- | :--- |
| **TED** | ✅ Sim | `Aprovado` → `Transmitido` → `Pago` (extrato D+1) |
| **Transferência Bancária** | ✅ Sim | `Aprovado` → `Transmitido` → `Pago` (extrato D+1) |
| **PIX** | ❌ Não | `Aprovado` → `Pago` (manual) |
| **Boleto** | ❌ Não | `Aprovado` → `Pago` (manual) |
| **Cartão Corporativo** | ❌ Não | `Aprovado` → `Pago` (manual) |
| **Câmbio** | ❌ Não | `Aprovado` → `Pago` (manual) |
| **Guia de Recolhimento** | ❌ Não | `Aprovado` → `Pago` (manual) |
| **Outro** | ❌ Não | `Aprovado` → `Pago` (manual) |

> **Regra**: Somente títulos com forma de pagamento **TED** ou **Transferência Bancária** entram na remessa CNAB. As demais formas seguem fluxo de pagamento manual.

### 3.3. Soberania do Documento e OCR

O sistema respeita o que está impresso no documento fiscal.
* **Sinalização de Desvio**: Se o Operador alterar um valor lido pelo OCR ou se um imposto divergir da alíquota padrão, o sistema **sinaliza** o alerta, mas não impede o lançamento (respeitando a soberania do documento real).

### 3.3. Campos de Integração

O documento possui campos de vínculo com outros módulos:
* `fornecedor`: FornecedorID
* `contratoId?`: ContratoID (vínculo contratual do fornecedor)
* `planoOrcamentario`: PlanoOrcamentarioID
* `categoria`: CategoriaOrcamentariaID

### 3.4. Regras de Negócio (Invariantes)

* **R1 (Cálculo do Valor Líquido)**: Campo calculado e bloqueado para edição manual.
    > `Valor Líquido = Valor Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros`
    > **Impostos Registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) NÃO entram no cálculo.**
* **R2 (Imutabilidade pós-Aprovação)**: Uma vez aprovado, campos de valor, fornecedor, contrato, plano orçamentário e categoria tornam-se imutáveis.
* **R3 (Workflow de Reabertura)**: A alteração de campos vitais exige o comando `Desfazer Aprovação` (ou `Reabrir Documento`), que realiza o rollback para `Aberto` e exige nova aprovação.
* **R4 (Edição Pós-Aprovação)**: Após `Aprovado`, apenas os campos **Descrição** e **Data de Vencimento** permanecem editáveis sem necessidade de reabertura.
* **R5 (Cancelamento)**: Documentos só podem ser cancelados em status `Aberto`. Títulos `Aprovado` com títulos já `Transmitidos`, `Recusados`, `Pagos` ou `Conciliados` **não podem ser cancelados**.
* **R5.1 (Descontos na Fonte)**: Descontos identificados no documento (ex: adiantamento, bonificação) são lidos pelo OCR e **abatidos do valor bruto** no cálculo do líquido. Reduzem o valor do título pai.
* **R5.2 (Impostos da Reforma Tributária)**: CBS, IBS Municipal e IBS Estadual são campos de leitura/registro apenas. Não geram títulos filhos, não são abatidos do valor líquido e não fazem parte da composição do valor da nota. Futuramente, conforme o calendário da reforma, essa regra poderá ser revisada.

---

## 4. 💰 Detalhamento do Domínio: Títulos e Liquidação

### 4.1. Estrutura de Títulos (Pai e Filhos)

Ao salvar um documento (clicar em "Salvar Documento"), o sistema gera **automaticamente**:

1. **Título Pai**: Valor Líquido destinado ao fornecedor. Status: `Aberto`.
2. **Títulos de Imposto (Filhos)**: Apenas para documentos **NFS-e** e **RPA**. Status: `Aberto`.
   * **NFS-e**: Filhos para ISS, IRRF, INSS, CSRF.
   * **RPA**: Filhos para IRRF, INSS, CSRF.
   * **DANFE**: **Não gera filhos** (impostos apenas registrados).
   * **Não-Fiscal**: **Não gera filhos**.

**Herança de Aprovação**: A aprovação do Pai dispara aprovação automática de todos os Filhos (todos passam de `Aberto` para `Aprovado`).
**Independência do Ciclo de Vida**: O pagamento, a baixa e a conciliação do Pai **não** se propagam para os Filhos. Cada título (pai e filhos) é uma obrigação a pagar independente e deve ser pago, baixado e conciliado individualmente.
**Hard Delete em Edição**: Ao desfazer aprovação e alterar valores do Pai, os Filhos são deletados e recriados na nova aprovação.

### 4.2. Máquina de Estados do Título (Persistidos)

| Estado | Definição |
| :--- | :--- |
| **RASCUNHO** | Persistência temporária (autosave). CRUD total. |
| **ABERTO** | Pendente de aprovação. Edição total no Pai; parcial no Filho (só vencimento e descrição). |
| **APROVADO** | Aprovado. Bloqueio de campos vitais. Permite alteração de vencimento e descrição. Elegível para remessa ou pagamento manual. |
| **TRANSMITIDO** | Incluído em remessa CNAB enviada ao Bradesco. **Lock total**. |
| **RECUSADO** | Erro retornado pelo banco (arquivo de retorno). Permite reset para `APROVADO`. |
| **PAGO** | Saída bancária confirmada (extrato D+1) ou pagamento manual. Habilita conciliação. |
| **CONCILIADO** | Estado final. Casamento confirmado entre título e extrato. `Unreconcile` retorna para `PAGO`. |

### 4.3. Sub-Estado Lógico (Não Persistido)

* **Acatado pelo Banco**: Flag lógica `acatadoPeloBanco: true` ativada quando o arquivo de retorno confirma o acatamento. O título permanece como `TRANSMITIDO` no banco até o extrato D+1.

### 4.4. Fluxos de Transição

**Padrão (Saída Bancária):**
`RASCUNHO` → `ABERTO` → `APROVADO` → `TRANSMITIDO` (acatado) → `PAGO` (extrato D+1) → `CONCILIADO`

**Manual (Fora da Remessa):**
`RASCUNHO` → `ABERTO` → `APROVADO` → `PAGO` (manual) → `CONCILIADO`

**Recuperação (Erro):**
`TRANSMITIDO` → `RECUSADO` (retorno com erro) → `APROVADO` (reset manual) → ...

**Desfazimentos:**
* `CONCILIADO` → `PAGO` (Unreconcile)
* `PAGO` → `APROVADO` (Desfazer Pagamento)
* `APROVADO` → `ABERTO` (Desfazer Aprovação)

* **R9 (Pré-requisito de Conciliação)**: **Somente títulos com status `Pago` podem ser conciliados.** Títulos em qualquer outro status não entram no submódulo Conciliação. Os fluxos de pagamento manual existem justamente para garantir que títulos com evidência de pagamento possam ser conciliados mesmo quando a confirmação automática falha.

### 4.5. Pagamentos Manuais (Extra-Remessa e Contingência)

O sistema permite que o Operador marque um título como `PAGO` manualmente em dois cenários distintos, ambos habilitando a conciliação:

1. **Pagamento Fora da Remessa**: Título em `APROVADO` nunca é transmitido. O Operador paga via Internet Banking (ou outro meio) e marca como `PAGO` diretamente.
2. **Contingência de Extrato D+1**: Título em `TRANSMITIDO` foi acatado pelo banco, mas o extrato D+1 falhou na leitura. O Operador marca como `PAGO` manualmente para não bloquear o processo de conciliação.

Em ambos os casos, a conciliação futura com o extrato permanece obrigatória.

---

## 5. 🔌 Integração Bancária (ACL Bradesco)

### 5.1. Tradutor de Layouts

Este componente isola o sistema das especificidades do Bradesco:
* **CNAB 240**: Geração de arquivos de remessa e leitura de retorno (Segmentos P, Q, J).
* **Extratos**: Processamento de arquivos **OFX**, PDF ou XLSX.

### 5.2. Regras de Integridade Bancária

* **Anti-Duplicidade (FITID)**: O sistema utiliza o Identificador Único da transação bancária para impedir que o mesmo lançamento de extrato seja importado ou liquidado duas vezes.
* **Hash de Segurança**: No momento da geração da remessa, o sistema gera um *checksum* para garantir que o arquivo enviado ao banco não sofreu manipulações externas.
* **Acatamento vs. Saída**: O arquivo de retorno (acatamento) é apenas uma indicação de que o banco aceitou processar. A saída bancária real (extrato D+1) é a única fonte de verdade para o status `PAGO`.
* **Bifurcação do Retorno**: O `ProcessadorRetornoService` identifica:
  * **Acatado**: Código 00. Ativa flag lógica, não altera status.
  * **Recusado**: Qualquer outro código. Altera status para `RECUSADO` e notifica o operador.

---

## 6. 🏦 Submódulo Conciliação Bancária

O Submódulo Conciliação é o **fechamento do ciclo financeiro**. Ele consome extratos bancários importados e títulos em status `Pago` para executar o casamento (match) entre saídas/entradas reais e obrigações do sistema.

### 6.1. Importação de Extrato

O Operador importa extratos bancários nos formatos **OFX** (recomendado), **PDF** (via OCR), **CSV** ou **XLSX**. O sistema:

1. Lê cada transação e extrai o `FITID` (identificador único do banco).
2. Descarta duplicidades silenciosamente (mesmo `FITID` já processado).
3. Calcula saldo inicial, saldo final e saldo do dia.
4. Classifica transações em: PIX, TED, DOC, TARIFA, BOLETO, DARF, APLICAÇÃO, RESGATE, TRANSFERÊNCIA, OUTRO.

### 6.2. Sugestão de Match (Nunca Automático)

O sistema calcula um **score de confiança** (0–100%) com base em critérios de similaridade:

| Critério | Peso |
| :--- | :--- |
| Favorecido idêntico | Alto |
| Valor exato | Alto |
| Data D0 | Alto |
| Referência no memo (ex: NFS 2024-0537) | Médio |
| Títulos abertos do fornecedor | Baixo |

* **Alta (≥75%)**: Match apresentado em destaque como sugestão principal.
* **Média (50–74%)**: Apresentado como possibilidade alternativa.
* **Baixa (<50%)**: Não apresentado. Operador deve buscar manualmente.

> **Regra Inviolável**: O sistema **sugere**, mas **nunca concilia automaticamente**. A confirmação é sempre manual do Operador.

### 6.3. Confirmação de Conciliação

Ao confirmar um match, o sistema:

1. Cria um registro de `Conciliacao` vinculando `TransacaoExtrato` ↔ `TituloFinanceiro`.
2. Altera o status do título para `CONCILIADO`.
3. Publica o evento `TituloConciliado` para os módulos de Contratos e Orçamento.
4. Registra trilha de auditoria imutável (quem, quando, qual transação/título).

### 6.4. Conciliação Múltipla e Parcial

* **1:N**: Uma saída bancária pode conciliar **vários títulos** (ex: duas parcelas do mesmo documento).
* **Conciliação Parcial**: O sistema permite que parte do valor do extrato seja conciliada com um título e o restante seja classificado como **Juros, Multa, Desconto, Tarifa** ou lançado como **novo título parcial**.
* **Regra de 100%**: Para uma transação ser considerada totalmente conciliada, a soma dos valores dos títulos vinculados **deve igualar** o valor total da saída bancária. Caso contrário, permanece pendente.

### 6.5. Lançamentos Manuais

Transações bancárias sem título correspondente no sistema (ex: **tarifas bancárias**) devem ser lançadas manualmente na ferramenta de conciliação. O Operador seleciona o tipo:

* Pagamento, Recebimento, Transferência, Tarifa/Multa/Juros, Aplicação, Resgate.

Preenche: fornecedor (opcional), categoria, centro de custo, programa, descrição. O sistema cria um `LancamentoManual` e vincula ao extrato.

### 6.6. Conciliação em Lote

O sistema identifica **padrões recorrentes** em múltiplas transações similares (ex: tarifas bancárias de R$ 4,90). Agrupa as transações e sugere **conciliação em lote** com lançamento manual padronizado. O Operador revisa e confirma em uma única ação.

### 6.7. Desfazimento (Unreconcile)

O Operador pode desfazer uma conciliação:

* **Individual**: Clicar na transação conciliada → modal de detalhes → "Desfazer conciliação".
* **Em Lote**: Selecionar múltiplas transações conciliadas e desfazer de uma vez.

Ao desfazer:
1. O título retorna para status `PAGO`.
2. O registro de `Conciliacao` é mantido com status `DESFEITA`.
3. A trilha de auditoria registra quem desfez e quando.
4. Evento `ConciliacaoDesfeita` é publicado.

### 6.8. Título Pago sem Saída Bancária

Títulos em `Pago` sem transação extrato correspondente ficam **pendentes de conciliação** na lista "Títulos sem Match". O Operador deve investigar:

* Se o pagamento ocorreu em outra conta → verificar outras contas bancárias.
* Se o extrato ainda não foi importado → aguardar próxima importação.
* Se erro de lançamento → reverter para `Aprovado` (Desfazer Pagamento).

### 6.9. Fechamento de Período

Após conciliar todas as transações de um período (ou justificar as pendentes), o Operador pode **fechar o período**. Uma vez fechado:

* Não aceita novas importações de extrato.
* Não permite alterações de conciliação.
* Requer reabertura com justificativa para correções.

### 6.10. Exportação

O Operador pode exportar a conciliação do período em:

* **OFX**: Retorno bancário.
* **CSV/XLSX**: Planilha com totalizações.
* **PDF**: Relatório com totalizações.

---

## 7. 📡 Matriz de Eventos de Domínio

| Evento | Origem | Reação do Sistema |
| :--- | :--- | :--- |
| `DocumentoRascunhoSalvo` | Documentos | Persiste estado temporário (autosave). |
| `DocumentoSalvo` | Documentos | Cria documento e gera títulos (Pai + Filhos) com status `Aberto`. |
| `TituloAprovado` | Títulos | Muda status do título (pai e filhos) de `Aberto` para `Aprovado`. Bloqueia campos vitais. |
| `DocumentoReaberto` | Documentos | Títulos vinculados perdem aprovação ou são cancelados. |
| `DocumentoCancelado` | Documentos | Hard delete nos títulos vinculados. |
| `RascunhoSalvo` | Títulos | Persiste título em estado temporário (autosave). |
| `TituloSubmetido` | Títulos | Título sai de `Rascunho` para `Aberto`. |
| `TituloAprovado` | Títulos | Disponibiliza para remessa ou pagamento manual. Filhos aprovados automaticamente. |
| `TituloTransmitido` | Títulos | Trava o título contra qualquer alteração manual. |
| `RetornoProcessado` | Integração | Se acatado: flag lógica. Se erro: status `Recusado`. |
| `SaidaBancariaConfirmada` | Integração | Altera status do título para `PAGO` (extrato D+1). |
| `TituloPagoManualmente` | Títulos | Registra pagamento fora da remessa. |
| `PagamentoDesfeito` | Títulos | Retorna título de `Pago` para `Aprovado`. |
| `TituloConciliado` | **Conciliação** | Muda status para `CONCILIADO`. Notifica Contratos e Orçamento. |
| `ConciliacaoDesfeita` | **Conciliação** | Retorna título de `Conciliado` para `Pago` (Unreconcile). Mantém histórico. |
| `ExtratoImportado` | **Conciliação** | Novo extrato processado com transações bancárias. |
| `MatchSugerido` | **Conciliação** | Sistema identificou possível casamento entre extrato e título. |
| `MatchRejeitado` | **Conciliação** | Operador rejeitou sugestão de match. |
| `LancamentoManualCriado` | **Conciliação** | Criado lançamento manual para tarifa, juros, multa, etc. |
| `LoteSugerido` | **Conciliação** | Sistema identificou padrão recorrente para conciliação em lote. |
| `PeriodoConciliacaoFechado` | **Conciliação** | Período fechado. Não aceita mais alterações. |
| `AprovacaoDesfeita` | Títulos | Título pai volta para `Aberto`. Filhos perdem aprovação. |
| `TituloResetado` | Títulos | Título `Recusado` volta para `Aprovado` para nova tentativa. |

---

## 8. 📖 Glossário Ubíquo

* **Fato Gerador**: O documento (Nota Fiscal, Recibo, etc.) que dá origem à obrigação financeira.
* **Documento Fiscal**: Documento com retenções de impostos. Origina N títulos.
* **Documento Não-Fiscal**: Documento sem retenções. Origina 1 título.
* **Selo**: Estado de bloqueio administrativo que garante que o financeiro é fiel ao fiscal.
* **FITID**: Identificador transacional do banco, usado como chave de unicidade na conciliação.
* **Acatamento**: Confirmação do banco de que aceitou processar o título. **Não significa pagamento efetuado**.
* **Saída Bancária**: Evento real de débito na conta, confirmado pelo extrato D+1.
* **ACL (Anticorruption Layer)**: Camada técnica que impede que termos bancários "sujem" o domínio de negócio.
* **Conciliação**: Casamento entre título e extrato, confirmado pelo Gestor.
* **Unreconcile**: Comando que desfaz a conciliação, retornando o título de `Conciliado` para `Pago`.
* **Time Travel (Trilha)**: Capacidade de auditar cada mudança de valor, desde a leitura do OCR até a baixa final.

---

> **Nota do Arquiteto**: Este documento é imutável em seus princípios core. Qualquer alteração tecnológica (banco de dados, linguagens) não deve afetar estas regras de domínio aqui descritas.
