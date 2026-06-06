# 🏦 Submódulo Conciliação Bancária

## 1. Papel no Mapa

O Submódulo Conciliação é o **fechamento do ciclo financeiro**. Ele consome dois mundos — o **extrato bancário importado** e os **títulos em status `Pago`** — para executar o casamento (match) entre saídas/entradas reais e obrigações do sistema.

Atua como **Core ⭐** do Módulo Financeiro, publicando os eventos finais `TituloConciliado` e `ConciliacaoDesfeita` que alimentam os módulos de **Execução Contratual** e **Orçamento**.

---

## 2. Atores

| Ator | Papel | Permissões |
| :--- | :--- | :--- |
| **Operador do Submódulo Conciliação** | Executa o casamento título/extrato, confirma sugestões, realiza lançamentos manuais e autoriza `Unreconcile`. | Conciliar, Desfazer Conciliação, Lançar Manualmente, Exportar |
| **Sistema (Motor de Match)** | Sugere casamentos automáticos com base em critérios de similaridade (valor, data, FITID, favorecido, referência no memo). Nunca concilia automaticamente. | Sugerir matches, identificar padrões para conciliação em lote |
| **Operador de Contas a Pagar** | Prepara a remessa e registra pagamentos manuais. Não executa conciliação. | Visualizar (somente leitura) |

> **Regra de Separação de Funções**: O Operador de Contas a Pagar (que gera a remessa) **nunca** é o mesmo que concilia. A conciliação exige perfil distinto de governança.

---

## 3. Agregados e Entidades

### 3.1. ExtratoBancario

```ts
ExtratoBancario {
  id: ExtratoID;
  contaBancaria: ContaBancariaID;
  periodo: { dataInicio: Date; dataFim: Date };
  arquivoOrigem: {
    nome: string;
    formato: 'OFX' | 'PDF' | 'CSV' | 'XLSX';
    hash: string;
    dataImportacao: Date;
  };
  saldoInicial: Money;
  saldoFinal: Money;
  transacoes: TransacaoExtrato[];
}
```

### 3.2. TransacaoExtrato

```ts
TransacaoExtrato {
  id: TransacaoExtratoID;
  fitid: string; // Identificador único do banco. Chave anti-duplicidade.
  dataTransacao: Date;
  tipoMovimento: 'Debito' | 'Credito';
  tipoLancamento: 'PIX' | 'TED' | 'DOC' | 'TARIFA' | 'BOLETO' | 'DARF' | 'APLICACAO' | 'RESGATE' | 'TRANSFERENCIA' | 'OUTRO';
  nome: string; // Favorecido ou origem
  descricao: string; // Memo/observação do extrato
  valor: Money;
  saldoAposTransacao: Money;
  statusConciliacao: 'Pendente' | 'Conciliada' | 'LancamentoManual';
  conciliacaoRef?: ConciliacaoID;
  // Campos para match
  criteriosMatch: {
    favorecidoNormalizado: string;
    valorExato: Money;
    dataD0: Date;
    referenciaDocumento?: string; // Ex: NFS 2024-0537
  };
}
```

### 3.3. Conciliacao

```ts
Conciliacao {
  id: ConciliacaoID;
  transacaoExtrato: TransacaoExtratoID;
  titulos: TituloConciliado[]; // 1 ou N títulos
  tipo: 'Individual' | 'Multiplo' | 'Parcial' | 'Lote';
  status: 'Ativa' | 'Desfeita';
  trilhaAuditoria: {
    conciliadoEm: Date;
    conciliadoPor: UsuarioID;
    desfeitoEm?: Date;
    desfeitoPor?: UsuarioID;
    motivoDesfazimento?: string;
  };
  // Quando há diferença de valor
  diferenca?: {
    valor: Money;
    tipoTratamento: 'Juros' | 'Multa' | 'Desconto' | 'Tarifa' | 'Parcial';
    centroCusto?: CentroCustoID;
    observacao?: string;
  };
}

TituloConciliado {
  tituloId: TituloID;
  valorConciliado: Money;
}
```

### 3.4. MatchSuggestion

```ts
MatchSuggestion {
  id: SuggestionID;
  transacaoExtrato: TransacaoExtratoID;
  tituloSugerido: TituloID;
  score: number; // 0–100%
  criterios: {
    favorecidoIdentico: boolean;
    valorExato: boolean;
    dataD0: boolean;
    referenciaNoMemo: boolean;
    titulosAbertosFornecedor: number;
  };
  status: 'Pendente' | 'Rejeitada' | 'Aceita';
}
```

### 3.5. LancamentoManual

```ts
LancamentoManual {
  id: LancamentoManualID;
  transacaoExtrato?: TransacaoExtratoID; // Pode ser criado sem extrato (ex: tarifa bancária)
  tipo: 'Pagamento' | 'Recebimento' | 'Transferencia' | 'TarifaMultaJuros' | 'Aplicacao' | 'Resgate';
  fornecedor?: FornecedorID;
  tipoDocumento?: 'NFS-e' | 'DANFE' | 'RPA' | 'Fatura' | 'Boleto' | 'Recibo' | 'Imposto' | 'Outros';
  dataEmissao?: Date;
  valorDocumento?: Money;
  programa?: ProgramaID;
  categoria?: CategoriaID;
  centroCusto?: CentroCustoID;
  descricao?: string;
  conciliacaoRef?: ConciliacaoID;
}
```

---

## 4. Comandos / Casos de Uso Principais

| Comando | Quem chama | Pré-condições | Efeito | Evento Publicado |
| :--- | :--- | :--- | :--- | :--- |
| **ImportarExtrato** | Operador | Arquivo OFX, PDF, CSV ou XLSX disponível | Lê transações, gera `TransacaoExtrato` com `FITID`. Descarta duplicidades. | `ExtratoImportado` |
| **SugerirMatch** | Sistema | Extrato importado com título `Pago` pendente | Calcula score de similaridade. Nunca concilia automaticamente. | `MatchSugerido` |
| **ConfirmarMatch** | Operador | Sugestão pendente com score ≥ threshold | Cria `Conciliacao` vinculando extrato ↔ título. Move título para `Conciliado`. | `TituloConciliado` |
| **RejeitarSugestao** | Operador | Sugestão pendente | Marca sugestão como rejeitada. Remove da lista de pendentes. | `MatchRejeitado` |
| **BuscarTituloParaMatch** | Operador | Transação extrato selecionada | Permite busca manual com filtros (fornecedor, número, descrição, período, tipo, valor). | — |
| **ConciliarMultiplo** | Operador | Uma transação extrato selecionada + N títulos `Pago` selecionados | Cria `Conciliacao` tipo `Multiplo`. Soma dos títulos deve igualar valor do extrato (ou usar tratamento de diferença). | `TituloConciliado` (N vezes) |
| **ConciliarParcial** | Operador | Transação extrato + título(s) com valor menor que o extrato | Cria `Conciliacao` tipo `Parcial`. Diferença é classificada como Juros, Multa, Desconto, Tarifa ou lançada como novo título parcial. | `TituloConciliado` + `LancamentoManualCriado` |
| **LancarManualmente** | Operador | Transação extrato sem match (ex: tarifa bancária) | Cria `LancamentoManual` e vincula ao extrato. Gera `Conciliacao` tipo `LancamentoManual`. | `LancamentoManualCriado` + `TituloConciliado` |
| **SugerirConciliacaoEmLote** | Sistema | Padrão identificado em múltiplas transações similares (ex: tarifas bancárias recorrentes) | Agrupa transações e sugere lançamento manual padronizado. | `LoteSugerido` |
| **ConfirmarLote** | Operador | Lote sugerido pendente | Cria conciliações em lote para todas as transações do padrão. | `TituloConciliado` (em lote) |
| **DesfazerConciliacao** | Operador | Transação em status `Conciliada` | Retorna título para `Pago`. Mantém `Conciliacao` com status `Desfeita` e trilha de auditoria. | `ConciliacaoDesfeita` |
| **DesfazerConciliacaoEmLote** | Operador | Múltiplas transações `Conciliadas` selecionadas | Desfaz N conciliações em uma única operação. | `ConciliacaoDesfeita` (N vezes) |
| **VisualizarDetalhesConciliacao** | Operador | Clicar em transação `Conciliada` na aba Extrato | Exibe modal com side-by-side (extrato ↔ título), auditoria e botão Desfazer. | — |
| **FecharPeriodo** | Operador | Todas as transações do período conciliadas ou justificadas | Bloqueia novas importações no período fechado. Gera relatório final. | `PeriodoConciliacaoFechado` |
| **ExportarConciliacao** | Operador | Período selecionado | Gera arquivo OFX (retorno bancário), CSV/XLSX ou PDF com totalizações. | — |

---

## 5. Invariantes e Regras de Negócio

### 5.1. Regras Fundamentais

* **R1 (Match Nunca Automático)**: O sistema **sugere** matches com score de confiança, mas a conciliação **nunca ocorre automaticamente**. A confirmação é sempre manual do Operador.
* **R2 (Pré-requisito de Conciliação)**: **Somente títulos com status `Pago` podem ser conciliados.** Títulos em qualquer outro status não aparecem na ferramenta de conciliação.
* **R3 (Soma dos Títulos = Valor do Extrato)**: Para uma conciliação ser considerada **100% completa**, a soma dos valores dos títulos vinculados deve igualar o valor total da transação bancária. Caso contrário, exige tratamento de diferença (parcial).
* **R4 (Conciliação Parcial Permitida)**: O sistema permite conciliar parte do valor de uma saída bancária com um título e lançar o restante manualmente (ex: juros, multa, tarifa). A transação continua pendente até atingir 100%.
* **R5 (FITID Único)**: Nenhuma transação com o mesmo `FITID` pode ser importada duas vezes. Descarte silencioso em caso de reimportação.
* **R6 (Trilha de Auditoria Obrigatória)**: Toda conciliação e desfazimento gera registro de auditoria imutável: quem, quando, e qual transação/título.
* **R7 (Histórico Preservado)**: Ao desfazer uma conciliação (`Unreconcile`), o registro da conciliação anterior **não é deletado**. Ele permanece com status `Desfeita` como histórico.
* **R8 (Título Pago sem Saída)**: Títulos em `Pago` sem transação bancária correspondente ficam **pendentes de conciliação**. O Operador deve investigar. Se identificado erro de pagamento, o título pode ser revertido para `Aprovado`.
* **R9 (Lançamento Manual para Tarifas)**: Transações bancárias que não possuem título a pagar correspondente (ex: tarifas bancárias) devem ser lançadas manualmente na ferramenta de conciliação.
* **R10 (Múltiplas Contas)**: A ferramenta permite navegar entre contas bancárias sem sair da tela. Contas encerradas são exibidas separadamente e não permitem novas conciliações.

### 5.2. Regras de Interface (UX)

* **R11 (Aba Extrato ao Lado)**: A tela possui duas abas principais: **Extrato** (lista de transações importadas) e **Conciliação** (painel de associação). O Operador navega entre elas sem perder contexto.
* **R12 (Filtros de Extrato)**: A aba Extrato permite filtrar por: Todos, Entradas, Saídas, Conciliados, Pendentes.
* **R13 (Filtros de Busca Manual)**: A busca manual de títulos permite filtros por: fornecedor, número do documento, descrição, período, tipo de documento, faixa de valor.
* **R14 (Progresso Visual)**: O sistema exibe o progresso de conciliação do período (ex: "46/128 conciliados") com barra de progresso.
* **R15 (Toggle de Palpites)**: O Operador pode ativar/desativar a exibição de sugestões de match na lista de movimentações.
* **R16 (Modal de Detalhes)**: Ao clicar em uma transação já conciliada na aba Extrato, o sistema exibe modal com:
  * Side-by-side: Extrato Bancário ↔ Título no Sistema
  * Auditoria: quem conciliou e quando
  * Botão "Desfazer Conciliação"
  * Botão "Ver Título Completo"

### 5.3. Regras de Período

* **R17 (Períodos Pré-definidos)**: Hoje, Ontem, Últimos 7 dias, Este mês, Mês passado, Este trimestre, Personalizado.
* **R18 (Fechamento de Período)**: Uma vez fechado, o período não aceita novas importações de extrato nem alterações de conciliação. Requer reabertura com justificativa.

---

## 6. Fluxos de Conciliação

### 6.1. Fluxo Padrão — Sugestão e Confirmação

```
Extrato Importado
    ↓
Sistema calcula score (valor, data, FITID, favorecido, memo)
    ↓
Match Sugerido (ex: 87% match — alta confiança)
    ↓
Operador visualiza side-by-side (extrato ↔ título)
    ↓
Operador confirma manualmente
    ↓
Conciliacao criada → Título muda para CONCILIADO
    ↓
Evento TituloConciliado publicado → Contratos + Orçamento
```

### 6.2. Fluxo — Busca Manual

```
Transação selecionada (sem match ou match rejeitado)
    ↓
Operador abre aba "Buscar / Criar vários"
    ↓
Insere filtros (fornecedor, período, valor, tipo)
    ↓
Sistema lista títulos Pago correspondentes
    ↓
Operador seleciona 1 ou N títulos
    ↓
Sistema verifica: soma selecionados = valor extrato?
    ↓
  SIM → Conciliação completa
  NÃO → Exige tratamento de diferença (parcial)
```

### 6.3. Fluxo — Conciliação Parcial com Diferença

```
Valor do Extrato: R$ 8.450,00
Valor do Título selecionado: R$ 8.000,00
Diferença: R$ 450,00
    ↓
Operador seleciona tipo de tratamento:
  • Juros (despesa financeira)
  • Multa (despesa operacional)
  • Desconto (redução do valor)
  • Tarifa (despesa bancária)
  • Parcial (saldo restante continua aberto)
    ↓
Sistema cria Conciliacao tipo PARCIAL
    ↓
Lançamento Manual gerado para a diferença (se aplicável)
```

### 6.4. Fluxo — Lançamento Manual (ex: Tarifa Bancária)

```
Transação extrato: TARIFA PIX QR CODE — R$ 4,90
Sem título a pagar correspondente
    ↓
Operador seleciona tipo "Tarifa / Multa / Juros"
    ↓
Preenche categoria (Despesa Operacional / Tarifas Bancárias)
    ↓
Preenche centro de custo e descrição
    ↓
Sistema cria LancamentoManual e Conciliacao
    ↓
Transação marcada como Conciliada
```

### 6.5. Fluxo — Conciliação em Lote (Padrão Identificado)

```
Sistema identifica padrão em múltiplas transações similares
  Ex: 5 tarifas bancárias de R$ 4,90 no mesmo período
    ↓
Sistema agrupa e sugere "Conciliação em Lote"
    ↓
Operador revisa o padrão sugerido
    ↓
Operador confirma lote
    ↓
Sistema cria N conciliações do tipo LANCAMENTO_MANUAL
    ↓
Todas as transações marcadas como Conciliadas
```

### 6.6. Fluxo — Desfazimento (Unreconcile)

```
Operador clica em transação Conciliada (aba Extrato ou Conciliação)
    ↓
Modal exibe detalhes + botão "Desfazer Conciliação"
    ↓
Operador confirma desfazimento
    ↓
Título retorna para status PAGO
    ↓
Conciliacao mantida com status DESFEITA
    ↓
Auditoria registrada: quem desfez, quando, motivo (opcional)
    ↓
Evento ConciliacaoDesfeita publicado
```

### 6.7. Fluxo — Título Pago sem Saída Bancária

```
Título em status PAGO
Nenhuma transação extrato corresponde ao FITID/valor/data
    ↓
Título permanece pendente na lista "Títulos sem Match"
    ↓
Operador investiga:
  • Se pagamento foi efetuado fora do sistema → aguarda próximo extrato
  • Se erro de lançamento → reverte para Aprovado (Desfazer Pagamento)
  • Se saída ocorreu em outra conta → verificar outras contas bancárias
```

---

## 7. Estrutura da Tela (Wireframe)

### 7.1. Topbar

* Título: "Conciliação Bancária"
* Breadcrumb: Financeiro · Tesouraria
* Último OFX importado (data/hora)
* Botão "Atalhos" (teclas de atalho)

### 7.2. Header da Conta Bancária

* **Conta selecionada**: Banco, Agência, Conta Corrente
* **Saldo no banco**: Valor atual + timestamp de atualização
* **Seletor de período**: Hoje, Ontem, 7 dias, Este mês, Mês passado, Trimestre, Personalizado
* **Botão Importar**: Dropdown com OFX (recomendado), CSV/XLSX, PDF (via OCR), Histórico de importação
* **Alterar conta**: Modal com lista de contas ativas e encerradas

### 7.3. Tabs Bar

* **Aba Extrato**: Lista todas as transações importadas no período. Badge com total.
* **Aba Conciliação**: Painel de associação. Badge com "N pendentes".
* **Progresso mini**: "Conciliado 46/128" com barra de progresso
* **Toggle "Exibir palpites"**: Liga/desliga sugestões de match na interface

### 7.4. Aba Extrato (Coluna Única)

Grid com colunas:
* Marcador de conciliação (check verde ou vazio)
* Data
* Tipo (PIX, TED, TARIFA, BOLETO, DARF, APLICACAO, etc.)
* Nome (favorecido/origem)
* Descrição (memo)
* Ref · Identificador (número do documento, FITID)
* Entrada (valor)
* Saída (valor)
* Saldo (após transação)

**Filtros rápidos**: Todos, Entradas, Saídas, Conciliados, Pendentes.

**Comportamento ao clicar**:
* Transação **Pendente**: seleciona e abre painel de conciliação
* Transação **Conciliada**: abre modal com detalhes da conciliação + opção de desfazer

### 7.5. Aba Conciliação (Layout Dividido)

#### Coluna Esquerda — Movimentações Importadas

Lista de transações do extrato agrupadas por dia:
* Divider do dia: "18 mai · sexta" + Saldo do dia
* Cards de transação com:
  * Ícone de direção (entrada/saída/tarifa/transferência/aplicação)
  * Data, tipo, nome, descrição, identificador
  * Valor + tag de match (ex: "87% match", "sem match", "conciliado")
* Filtros internos: Pendentes, Conciliadas, Todas

#### Coluna Direita — Painel de Associação

**Header da transação selecionada**:
* Tipo (saída/entrada), nome, raw (PIX 18/05 09:14 · REF NFS 2024-0537)
* Data e valor destacados

**Banner de conciliação ativa** (se transação já conciliada):
* "Esta transação está conciliada com [título]"
* Botão "Desfazer conciliação"

**Tabs do painel**:
1. **Sugestão**: Match card side-by-side (extrato ↔ título) + critérios de match + botão confirmar/rejeitar + outras possibilidades
2. **Nova transação**: Formulário de lançamento manual com:
   * Classificação: Pagamento, Recebimento, Transferência, Tarifa/Multa/Juros, Aplicação, Resgate
   * Campos condicionais: fornecedor, tipo de documento, data emissão, valor, programa, categoria, centro de custo, descrição
3. **Buscar / Criar vários**:
   * Resumo: valor do extrato vs selecionados vs diferença
   * Search bar com filtros (período, tipo, valor)
   * Grid de títulos com checkbox
   * Tratamento da diferença (quando houver)
   * Botão "Criar novo pagamento manualmente"

### 7.6. Bottombar

* **Legenda visual**: Match alto (≥75%), Match parcial, Sem match, Conciliado
* **Status de auditoria**: "Conciliações registradas em trilha de auditoria"
* **Ações**:
  * Exportar conciliação (OFX, CSV/XLSX, PDF)
  * Fechar período

---

## 8. Critérios de Match (Score)

| Critério | Peso | Descrição |
| :--- | :--- | :--- |
| **Favorecido idêntico** | Alto | Nome normalizado do extrato bate com nome do fornecedor no título |
| **Valor exato** | Alto | Valor do extrato = valor líquido do título |
| **Data D0** | Alto | Data da transação bancária = data de vencimento/pagamento do título |
| **Referência no memo** | Médio | Memo do extrato contém número do documento (NFS-e, DANFE, etc.) |
| **Títulos abertos do fornecedor** | Baixo | Quantidade de títulos em aberto para o mesmo fornecedor |

**Score de Confiança**:
* **Alta (≥75%)**: Cor verde. Sugestão apresentada em destaque.
* **Média (50–74%)**: Cor amarela. Sugestão secundária.
* **Baixa (<50%)**: Não apresentada como sugestão. Operador deve buscar manualmente.

---

## 9. Eventos de Domínio

| Evento | Origem | Descrição |
| :--- | :--- | :--- |
| `ExtratoImportado` | Conciliação | Novo extrato bancário processado com N transações |
| `MatchSugerido` | Conciliação | Sistema identificou possível casamento entre extrato e título |
| `MatchRejeitado` | Conciliação | Operador rejeitou sugestão de match |
| `TituloConciliado` | Conciliação | Conciliação efetivada. Publicado para Contratos e Orçamento |
| `ConciliacaoDesfeita` | Conciliação | Unreconcile executado. Título retorna para Pago |
| `LancamentoManualCriado` | Conciliação | Criado lançamento manual para tarifa, juros, multa, etc. |
| `LoteSugerido` | Conciliação | Sistema identificou padrão recorrente para conciliação em lote |
| `PeriodoConciliacaoFechado` | Conciliação | Período fechado. Não aceita mais alterações |

---

## 10. Glossário Específico

* **FITID**: Identificador único da transação bancária (Financial Institution Transaction ID). Garante anti-duplicidade na importação de extratos.
* **Match**: Casamento entre uma transação do extrato bancário e um título no sistema.
* **Score de Confiança**: Percentual (0–100%) que indica a probabilidade de um match estar correto, calculado por critérios de similaridade.
* **Unreconcile**: Ação de desfazer uma conciliação, retornando o título de `Conciliado` para `Pago`. Mantém histórico.
* **Lançamento Manual**: Criação de um registro financeiro diretamente na conciliação, sem documento de origem prévio (usado para tarifas, juros, multas).
* **Conciliação Parcial**: Vínculo de uma saída bancária com parte do seu valor em um título e parte em um lançamento manual (ex: juros).
* **Conciliação em Lote**: Processo de conciliar múltiplas transações similares de uma só vez, após identificação de padrão pelo sistema.
* **Trilha de Auditoria**: Registro imutável de quem conciliou/desfez, quando e qual transação/título foi afetado.
* **Saldo do Dia**: Total acumulado na conta bancária ao final de cada dia, calculado a partir das transações importadas.
* **Fechar Período**: Ação que bloqueia alterações em um intervalo de datas já conciliado, garantindo integridade contábil.
