# 🧩 Bounded Context: Gestão de Documentos

## 1. Papel no Mapa

Este é o **Core Context**. Ele garante que o "Fato Gerador" seja registrado com fidelidade ao documento físico/digital, gerenciando as travas de aprovação e a composição financeira inicial. O documento é o **trigger único** que origina todos os títulos a pagar no Contas a Pagar.

**Regra de Origem:**
* **Documento Fiscal** → origina **N títulos** (1 pai + filhos de retenção).
* **Documento Não-Fiscal** → origina **1 título** (somente o pai).

## 2. Atores

* **Operador de Contas a Pagar**: Realiza a ingestão (OCR ou inclusão manual), o ajuste fino dos dados e solicita aprovação. Não aprova.
* **Aprovador (Perfil)**: Usuário com autoridade para validar o lançamento e aprovar o título, permitindo o prosseguimento do ciclo financeiro.
* **Motor de Vigilância Fiscal**: Componente que sinaliza discrepâncias entre o valor lido e as alíquotas padrão (sem impedir o fluxo).

## 3. Agregados e Entidades

```ts
DocumentoFiscal {
  id: DocumentoID;
  tipoDocumento: 'NFS-e' | 'DANFE' | 'RPA' | 'Fatura' | 'Boleto' | 'Recibo' | 'Imposto';
  // O documento é o fato gerador. O ciclo de vida financeiro (status) é do Título.
  // Na prática, o documento e o título pai compartilham o mesmo status.
  fornecedor: FornecedorID;
  contratoId?: ContratoID; // Vínculo contratual do fornecedor
  orcamento: {
    planoOrcamentario: PlanoOrcamentarioID;
    categoria: CategoriaOrcamentariaID;
  };
  formaPagamento: 'TED' | 'Transferencia_Bancaria' | 'PIX' | 'Boleto' | 'Cartao_Corporativo' | 'Cambio' | 'Guia_Recolhimento' | 'Outro';
  dadosFinanceiros: {
    valorBruto: Money;
    descontosNaFonte: Money; // Descontos lidos do documento, abatidos do bruto
    retencoes: Retencao[]; // Impostos que GERAM títulos filhos (por tipo de documento)
    impostosRegistrados: ImpostoRegistrado[]; // Impostos apenas lidos/registrados, NÃO abatidos do líquido
    descontos: Money; // Descontos comerciais/negociados
    multa: Money;
    juros: Money;
    valorLiquido: Money; // Campo calculado (somente leitura)
  };
  metadados: {
    lidoPorOCR: boolean;
    valorOriginalOCR: Money;
    divergenciaDetectada: boolean;
  };
}

Retencao {
  tipo: TipoImpostoRetido; // ISS, IRRF, INSS, CSRF
  aliquota: percentage;
  valor: Money;
  baseCalculo: Money;
}

ImpostoRegistrado {
  tipo: TipoImpostoRegistrado; // ICMS, IPI, PIS, COFINS, CBS, IBS_Municipal, IBS_Estadual
  aliquota: percentage;
  valor: Money;
  baseCalculo: Money;
  geraTituloFilho: false; // Sempre false. Apenas registrado.
}
```

## 4. Comandos / Casos de Uso Principais

| Comando | Quem chama | Pré-condições | Efeito | Evento Publicado |
| :--- | :--- | :--- | :--- | :--- |
| **SalvarDocumento** | Operador / Sistema (OCR) | — | Cria ou atualiza documento fiscal ou não-fiscal. Gera **título pai + títulos filhos** (quando aplicável) com status `Aberto`. | `DocumentoSalvo` |
| **AutosaveRascunho** | Sistema | — | Persiste estado temporário automaticamente enquanto o operador preenche o formulário. Sem ação manual do usuário. | `RascunhoPersistido` |
| **AjustarLancamento** | Operador | Título em `Aberto` | Permite editar Bruto, Impostos, Juros/Multa, Fornecedor, Contrato, Plano Orçamentário, Categoria. Atualiza Líquido. | `LancamentoRefinado` |
| **AprovarDocumento** | Aprovador | Título em `Aberto` | Muda status do título pai e filhos para `Aprovado`. Bloqueia edições de campos vitais. | `TituloAprovado` |
| **ReabrirDocumento** | Gestor/Aprovador | Título `Aprovado` e **não transmitido** | Realiza "rollback" para `Aberto` para correções. Títulos vinculados perdem aprovação ou são cancelados conforme regra. | `AprovacaoDesfeita` |
| **CancelarDocumento** | Operador/Aprovador | Título em `Aberto` | Cancela/exclui o documento pai e todos os títulos vinculados (hard delete nos filhos). | `DocumentoCancelado` |

## 5. Invariantes e Regras de Negócio

* **R1 (Cálculo do Líquido)**: O valor líquido é uma função estrita:
  > `Líquido = Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros`
  > **Os impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) NÃO entram no cálculo do valor líquido.**
  O usuário nunca digita este campo.
* **R2 (Soberania do Documento)**: O sistema registra o valor que consta no documento fiscal. O OCR é a fonte primária; alterações manuais em relação ao OCR devem ser logadas na trilha de auditoria.
* **R3 (Vigilância de Alíquota)**: Se o valor de um imposto inserido divergir em mais de X% da alíquota padrão parametrizada, o sistema deve exibir um **Alerta de Inconsistência**, mas permite o prosseguimento caso o usuário confirme.
* **R4 (Bloqueio Pós-Aprovação)**: Uma vez `Aprovado`, nenhuma informação de valor, fornecedor, contrato, plano orçamentário ou categoria pode ser alterada. Para corrigir, é obrigatório o comando `Desfazer Aprovação`, que retorna o título para `Aberto` e reinicia o ciclo de aprovação.
* **R5 (Edição Pós-Aprovação vs. Reabertura)**: Após `Aprovado`, apenas os campos **Descrição** e **Data de Vencimento** permanecem editáveis sem necessidade de reabertura. Qualquer alteração em campo vital exige `Desfazer Aprovação` → `Aberto` → nova aprovação.
* **R6 (Cancelamento Permitido)**: O comando `CancelarDocumento` só está habilitado para títulos em status `Aberto`. Títulos `Aprovado` com status já `Transmitido`, `Recusado`, `Pago` ou `Conciliado` **não podem ser cancelados**.
* **R7 (Impacto do Cancelamento)**: Ao cancelar um documento em `Aberto`, todos os títulos vinculados (pai e filhos) são **excluídos fisicamente (hard delete)**.
* **R8 (Regra de Origem dos Títulos por Tipo de Documento)**:
  * **NFS-e**: Fiscal. Gera 1 título pai + N títulos filhos (retenções: ISS, IRRF, INSS, CSRF).
  * **RPA**: Fiscal. Gera 1 título pai + N títulos filhos (retenções: IRRF, INSS, CSRF).
  * **DANFE**: Fiscal. Gera apenas 1 título pai. Impostos (ICMS, IPI, PIS, COFINS) são **apenas registrados**.
  * **Fatura**: Fiscal. Gera **apenas 1 título pai** (sem filhos).
  * **Boleto, Recibo, Imposto**: Não-fiscais. Geram **apenas 1 título pai** cada.
* **R9 (Impostos da Reforma Tributária)**: CBS, IBS Municipal e IBS Estadual são campos de leitura/registro apenas. Não geram títulos filhos, não são abatidos do valor líquido e não fazem parte da composição do valor da nota. Futuramente, conforme o calendário da reforma, essa regra poderá ser revisada.
* **R10 (Descontos na Fonte)**: Descontos identificados no documento (ex: desconto de adiantamento, bonificação) são lidos pelo OCR e abatidos do valor bruto no cálculo do líquido. Geram redução no valor do título pai.
* **R11 (Forma de Pagamento e CNAB)**: Somente títulos com forma de pagamento **TED** ou **Transferência Bancária** podem ser incluídos em arquivos de remessa CNAB. As demais formas (PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro) são tratadas como **pagamento manual** e não geram remessa.

## 6. Fluxo Exemplar (Documento Fiscal — NFS-e)

1. O Operador clica **"Novo Documento"**, seleciona tipo **NFS-e** e salva como **Rascunho** (autosave disponível).
2. O Operador finaliza o preenchimento e **submete** → título em status `Aberto`.
3. O PDF é lido pelo **OCR**, que identifica:
   * Valor Bruto: R$ 1.000,00
   * Desconto na Fonte: R$ 50,00
   * Retenções: ISS R$ 50,00, IRRF R$ 15,00, INSS R$ 110,00
   * Impostos Registrados (Reforma): CBS R$ 90,00, IBS Municipal R$ 30,00
4. O sistema calcula:
   > `Líquido = 1.000 − 50 (desconto fonte) − 175 (retenções) = R$ 775,00`
   > **CBS e IBS não entram no cálculo do líquido.**
5. O **Operador** ajusta manualmente o ISS para R$ 40,00. O sistema sinaliza divergência.
6. O Operador insere R$ 5,00 de juros por atraso.
7. O sistema recalcula: `Líquido = 1.000 − 50 − 165 + 5 = R$ 790,00`.
8. O Operador clica **"Salvar Documento"**. O sistema gera automaticamente:
   * 1 título pai: R$ 790,00 (fornecedor) — status `Aberto`
   * 3 títulos filhos: ISS R$ 40,00, IRRF R$ 15,00, INSS R$ 110,00 — status `Aberto`
   * CBS e IBS ficam apenas registrados no documento.
9. O **Aprovador** revisa a trilha e aprova o título → status muda para `Aprovado` (pai e filhos).

## 6.1. Fluxo Exemplar (Documento Fiscal — DANFE)

1. O Operador inclui um documento tipo **DANFE**.
2. O OCR lê:
   * Valor Bruto: R$ 5.000,00
   * ICMS R$ 900,00, IPI R$ 250,00, PIS R$ 82,50, COFINS R$ 380,00
3. O sistema **registra** os impostos (campos de leitura), mas **não gera títulos filhos**.
4. O cálculo do líquido considera apenas retenções (se houver) e descontos:
   > `Líquido = 5.000 − 0 = R$ 5.000,00` (sem retenções no DANFE)
5. Ao aprovar, gera apenas **1 título pai** de R$ 5.000,00.

## 7. Fluxo Exemplar (Desfazer Aprovação / Reabertura)

1. Título está `Aprovado` (ainda não transmitido).
2. Aprovador clica **"Desfazer Aprovação"**.
3. Sistema alerta: "Aprovação será desfeita. Os títulos filhos terão sua aprovação desfeita."
4. Título volta para `Aberto`. Títulos vinculados perdem aprovação ou são deletados conforme alteração de valores.
5. Operador edita campos necessários e reenvia para aprovação.
6. Novo ciclo de aprovação gera novos títulos refletindo os valores atualizados.

---

## 8. Referência de Interface (Mocks)

> **Nota**: Os trechos a seguir descrevem a interface visual dos mocks analisados. Em caso de divergência entre o mock e as regras de negócio validadas nas seções anteriores, **prevalecem as regras validadas**.

### 8.1. Tela de Listagem — Grid de Contas a Pagar

**Acesso**: Sidebar → Financeiro → Contas a Pagar

**Elementos da tela**:
* **Topbar**: Título "Contas a Pagar" + contador de documentos.
* **Filter Bar**:
  * Busca livre: fornecedor, número do documento, CNPJ (atalho ⌘K).
  * **Chips de status rápidos**: Todos, Rascunho, Em Aberto, Aprovado, Pago.
  * **Filtros avançados**: botão "Adicionar" com menu de filtros dinâmicos.
  * **Visões salvas**: presets de filtros salvos pelo usuário.
  * **Ordenação**: Vencimento (crescente/decrescente), Líquido (maior/menor), Fornecedor (A→Z / Z→A), **Mais recente** (padrão ao redirecionar após salvar documento).
* **Grid**:
  * Colunas: Tipo | Documento | Fornecedor | Contrato | Forma Pag. | Emissão | Vencimento | Bruto | Líquido | Status
  * Checkbox para seleção múltipla.
  * **Busca por documento fiscal**: Quando o operador busca pelo número de um documento fiscal que possui filhos (ex: NFS-e, RPA), o grid exibe **o título pai e todos os títulos filhos** vinculados, permitindo visualização completa das obrigações geradas.
  * Rodapé com totalizações de Bruto e Líquido.
* **Paginação**: "1–12 de 47" · 12 por página · navegação ‹ ›.
* **Barra de ações em lote** (quando documentos selecionados):
  * Mudar Status: Rascunho, Em Aberto, Aprovado.
  * **Alterar Vencimento**: Permite alterar a data de vencimento de múltiplos títulos simultaneamente. **Apenas para títulos que ainda não foram transmitidos, pagos ou conciliados.**
  * **Baixar**: Altera status para `Pago` (pagamento manual), habilitando a conciliação.
  * Exportar: PDF, CSV, CNAB 240.
* **Botão primário**: "+ Novo Documento" (atalho ⌘N).
* **Drawer lateral**: Detalhes do pagamento (aberto ao clicar em uma linha), com botões "Editar pagamento" e "Fechar".

> **Nota sobre status**: O documento é o fato gerador; o ciclo de vida financeiro é do **Título**. Na prática, o grid de Contas a Pagar exibe o status do título pai vinculado ao documento (Rascunho, Aberto, Aprovado, Transmitido, Recusado, Pago, Conciliado), pois o documento e o título compartilham o mesmo ciclo de vida.

### 8.2. Tela de Lançar Documento

**Acesso**: Grid de Contas a Pagar → "+ Novo Documento"

**Layout dividido em 3 colunas**:
* **Esquerda — Preview do PDF**: Visualização do documento original com dados extraídos (Prestador, Tomador, Discriminação, Retenções, Totais).
* **Centro — Formulário de lançamento**:
  * **Identificação**: Tipo, Nº/Série, Competência, Emissão, Vencimento, Valor Bruto, Descrição.
  * **Retenções**: ISS, IRRF, INSS, PIS, COFINS, CSLL. Campos editáveis com sinalização OCR (`ocr-ok` / `ocr-divergent`).
    * **Impostos Registrados (Reforma)**: CBS, IBS Municipal, IBS Estadual — campos **readonly**.
  * **Pagamento**: Forma (PIX, Boleto, TED, Transferência bancária, Cartão corporativo, Outro), Conta bancária de débito, Dados bancários do fornecedor, Aprovador.
  * **Categorização**: Centro de Custo, Categoria, Subcategoria, Programa, Plano Orçamentário.
* **Direita — Sidebar de composição e validação**:
  * **Composição**: Valor Bruto, lista de retenções, Descontos, Juros/Multa, **Líquido a pagar** (calculado automaticamente).
  * **Títulos Previstos**: Preview do título pai (valor líquido) + títulos filhos (ISS, IRRF, INSS, CSRF) com seus destinatários.
  * **Validação**: Checks visuais — Fornecedor identificado, Cálculo íntegro, Dados bancários válidos, Alerta de divergência de alíquota, Aguarda aprovação.
* **Bottombar**:
  * Status: "Auto-salvo · há um instante" + stage pill (Rascunho).
  * Ações: "+ Adicionar fornecedor", "Descartar", "Salvar rascunho" (⌘S), "Salvar Documento" (⌘↵).
  * **Após "Salvar Documento"**: O sistema redireciona o operador para o **Grid de Contas a Pagar**, com a ordenação definida como **"Mais recente"**, exibindo os documentos/títulos adicionados no topo da lista.

### 8.3. Modais e Fluxos de Decisão

#### Modal — Buscar Fornecedor
* Campo de busca por nome, CNPJ ou apelido.
* Resultados com avatar, razão social, CNPJ e cidade/UF.
* Opção "Cadastrar novo fornecedor" para inclusão rápida.

#### Modal — Alíquota Divergente
Disparado quando o valor de imposto diverge da alíquota padrão parametrizada:
* Exibe comparação lado a lado: **Padrão SEFIN** vs **No documento**.
* Calcula e exibe a diferença de valor.
* **Três opções de decisão**:
  1. **Aceitar o documento**: Respeita o valor lido. Divergência registrada na trilha de auditoria.
  2. **Corrigir para o padrão**: Sobrescreve o valor. Requer confirmação explícita.
  3. **Solicitar nota corrigida**: Bloqueia o lançamento, envia notificação ao fornecedor.

> **Alinhamento com regras validadas**: Confirma a **R3 (Vigilância de Alíquota)** e o princípio da **Soberania do Documento**.

#### Modal — Forma de Pagamento
* Grid com cards para cada forma: PIX, Boleto, TED, Transferência bancária, Cartão corporativo, Outro.
* Cada card exibe ícone, nome e descrição curta.

#### Modal — Selecionar Aprovador
* Lista de aprovadores com nome, cargo e **alçada de aprovação**.
* Sinalização visual quando o valor líquido excede a alçada do aprovador (ex: "· Acima da alçada" em vermelho).
* Regra de negócio exibida: "O aprovador escolhido precisa ter alçada ≥ valor líquido. Caso contrário, o título será encaminhado em cascata para o nível imediatamente superior."

> **Divergência a validar**: O mock sugere seleção do aprovador no momento do lançamento. Na modelagem validada, o documento é submetido para aprovação e **qualquer aprovador com alçada suficiente** pode aprovar. A seleção de aprovador específico pode ser um campo informativo/vinculado ou uma preferência, não uma obrigação de roteamento fixo.

#### Modal — Adicionar Fornecedor (Cadastro Rápido)
* Tipo (PJ/PF), CNPJ/CPF, Razão Social/Nome, Email, Telefone.
* Nota: "Cadastrar o fornecedor aqui não cria título — apenas registra a entidade no cadastro mestre."

#### Modal — Tipo de Documento
* Grid com todos os tipos. Tipos fiscais habilitam a seção de retenções e o motor de regras tributárias.

---

## 9. Glossário Específico

* **Fato Gerador**: O documento (Nota Fiscal, Recibo, etc.) que dá origem à obrigação financeira.
* **NFS-e**: Nota Fiscal de Serviços Eletrônica. Documento fiscal que gera títulos filhos (ISS, IRRF, INSS, CSRF).
* **DANFE**: Documento Auxiliar da Nota Fiscal Eletrônica. Documento fiscal onde impostos (ICMS, IPI, PIS, COFINS) são apenas registrados, não geram filhos.
* **RPA**: Recibo de Pagamento Autônomo. Documento fiscal que gera títulos filhos (IRRF, INSS, CSRF).
* **Fatura**: Documento fiscal que gera **apenas 1 título pai** (sem filhos).
* **Boleto**: Documento não-fiscal. Gera 1 título pai.
* **Recibo**: Documento não-fiscal. Gera 1 título pai.
* **Imposto**: Documento não-fiscal para guias de recolhimento/impostos. Gera 1 título pai.
* **Impostos Registrados (Reforma Tributária)**: CBS, IBS Municipal e IBS Estadual. Campos de leitura apenas. Não geram filhos, não abatem do líquido.
* **Descontos na Fonte**: Descontos lidos do documento (adiantamento, bonificação) que reduzem o valor bruto no cálculo do líquido.
* **Forma de Pagamento**: Define se o título entra em remessa CNAB (TED, Transferência Bancária) ou é pago manualmente (PIX, Boleto, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro).
* **Soberania do Documento**: Princípio de que o sistema deve refletir o que está escrito no papel/XML, mesmo que a regra fiscal pareça incorreta.
* **Single Point of Failure (Sinalização)**: Alertas visuais para evitar que erros de digitação ou leitura passem despercebidos pelo aprovador.
* **Reabertura**: Procedimento de estorno do estado de bloqueio para permitir correções retroativas.
* **Aprovação**: Ato que torna campos vitais imutáveis e muda o status do título (pai e filhos) de `Aberto` para `Aprovado`. O título pai e seus filhos (quando aplicável) são aprovados em conjunto.
