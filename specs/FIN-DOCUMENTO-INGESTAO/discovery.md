# Discovery — FIN-DOCUMENTO-INGESTAO

## 1. Contexto e Motivação

O Módulo Financeiro do ERP Bem Comum substitui o modelo de "títulos avulsos" pelo conceito de **Fato Gerador**. Toda obrigação financeira nasce de um documento validado (NFS-e, DANFE, RPA, Fatura, Boleto, Recibo, Imposto). O operador precisa de uma ferramenta robusta para:

1. **Incluir documentos** via upload de PDF com extração OCR automática.
2. **Lançar documentos manualmente** quando não há PDF.
3. **Visualizar o documento original** (PDF) lado a lado com os dados extraídos.
4. **Corrigir divergências** entre o OCR e as alíquotas padrão sem perder a rastreabilidade.
5. **Gerar títulos** (pai + filhos de retenção) de forma automática e precisa.

Sem essa capacidade, o operador depende de digitação manual de todos os campos, o que aumenta o risco de erro fiscal e retrasa o ciclo de pagamento.

## 2. Stakeholders

| Stakeholder                       | Papel                                                        | Interesse                                                            |
| :-------------------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------- |
| **Operador de Contas a Pagar**    | Usuário primário. Realiza ingestão, ajuste fino e submissão. | Agilidade, precisão fiscal, preview de títulos.                      |
| **Aprovador / Gestor Financeiro** | Valida e aprova os lançamentos.                              | Confiança nos cálculos, trilha de auditoria, alertas de divergência. |
| **Contador / Fiscal**             | Audita retenções e impostos.                                 | Consistência entre documento e títulos gerados.                      |
| **Fornecedor**                    | Emite o documento fiscal.                                    | Receber pagamento correto e em dia.                                  |
| **Sistema (OCR)**                 | Extrai dados do PDF.                                         | Acuidade na leitura de campos fiscais.                               |

## 3. Requisitos Funcionais (Descobertos)

### 3.1. Ingestão de Documento

- **RF1**: O sistema deve permitir upload de PDF do documento fiscal/não-fiscal.
- **RF2**: O OCR deve extrair: tipo de documento, número, série, fornecedor, CNPJ, valor bruto, data de emissão, competência, discriminação do serviço, retenções (ISS, IRRF, INSS, PIS, COFINS, CSLL), impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS).
- **RF3**: O sistema deve exibir o PDF original em preview lado a lado com o formulário de lançamento.
- **RF4**: O operador pode lançar o documento manualmente sem upload de PDF (preenchimento direto).

### 3.2. Cálculo e Validação Fiscal

- **RF5**: O sistema deve calcular automaticamente o **valor líquido**:
  > `Líquido = Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros`
- **RF6**: Impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS Municipal, IBS Estadual) **não entram** no cálculo do líquido.
- **RF7**: O sistema deve sinalizar divergência quando o valor de retenção divergir da alíquota padrão parametrizada.
- **RF8**: Ao detectar divergência, o sistema deve apresentar 3 opções: (1) Aceitar valor do documento, (2) Corrigir para o padrão, (3) Solicitar nota corrigida ao fornecedor.

### 3.3. Geração de Títulos

- **RF9**: Ao salvar o documento, o sistema deve gerar automaticamente:
  - **NFS-e**: 1 título pai (líquido) + filhos (ISS, IRRF, INSS, CSRF).
  - **RPA**: 1 título pai (líquido) + filhos (IRRF, INSS, CSRF).
  - **DANFE, Fatura, Boleto, Recibo, Imposto**: 1 título pai apenas.
- **RF10**: O sistema deve exibir preview dos títulos previstos na sidebar antes do salvamento.

### 3.4. Auto-save e Rascunho

- **RF11**: O sistema deve auto-salvar o estado do formulário a cada alteração de campo.
- **RF12**: O operador pode salvar explicitamente como rascunho (⌘S).
- **RF13**: O operador pode descartar o rascunho.

### 3.5. Grid de Contas a Pagar

- **RF14**: O sistema deve listar todos os documentos/títulos com colunas: Tipo, Documento, Fornecedor, Contrato, Forma Pag., Emissão, Vencimento, Bruto, Líquido, Status.
- **RF15**: O grid deve permitir busca por fornecedor/número/CNPJ, filtros por status, ordenação e paginação.
- **RF15.1**: Quando a busca retornar um documento fiscal que possui filhos (NFS-e, RPA), o grid deve exibir o título pai e todos os títulos filhos vinculados.
- **RF16**: O grid deve permitir ações em lote: mudar status, alterar vencimento, baixar (marcar como Pago manualmente), exportar (PDF, CSV, CNAB 240).
- **RF16.1**: Ao salvar um documento, o sistema deve redirecionar o operador para o grid de Contas a Pagar com a ordenação "Mais recente", exibindo o documento salvo no topo da lista.

### 3.6. Formas de Pagamento

- **RF17**: O sistema deve suportar: PIX, Boleto, TED, Transferência Bancária, Cartão Corporativo, Câmbio, Guia de Recolhimento, Outro.
- **RF18**: Somente TED e Transferência Bancária geram remessa CNAB. As demais são pagamento manual.

### 3.7. Categorização

- **RF19**: O operador deve selecionar: Centro de Custo, Categoria, Programa, Plano Orçamentário.
- **RF20**: O sistema deve vincular o documento a um contrato existente (quando houver).

## 4. Requisitos Não-Funcionais

- **RNF1 (Performance)**: O OCR deve processar um PDF de 1 página em ≤ 3 segundos.
- **RNF2 (Usabilidade)**: O operador deve conseguir lançar um documento fiscal em ≤ 2 minutos após o upload (ajustes mínimos).
- **RNF3 (Confiabilidade)**: O auto-save deve persistir mesmo em caso de perda de conexão (local storage como fallback).
- **RNF4 (Acessibilidade)**: Todos os campos devem ser navegáveis via teclado (atalhos: ⌘K busca, ⌘N novo, ⌘S salvar, ⌘↵ confirmar).
- **RNF5 (Auditabilidade)**: Toda alteração manual em relação ao OCR deve ser registrada na trilha de auditoria.

## 5. Riscos e Mitigações

| Risco                                  | Severidade | Mitigação                                                            |
| :------------------------------------- | :--------- | :------------------------------------------------------------------- |
| OCR extrai dados incorretos            | Alta       | Preview lado a lado + campos editáveis + sinalização de divergência. |
| Alíquota divergente não detectada      | Alta       | Motor de vigilância fiscal compara com tabela parametrizada.         |
| Perda de rascunho por queda de conexão | Média      | Auto-save com local storage + persistência em backend.               |
| Geração incorreta de títulos filhos    | Alta       | Preview de títulos antes do salvamento + cálculo automático.         |
| Performance ruim com PDFs grandes      | Média      | Compressão de imagem + processamento assíncrono.                     |

## 6. Decisões Iniciais

1. **OCR como fonte primária, não soberana**: O OCR preenche os campos, mas o operador sempre pode editar. O sistema respeita o documento (Soberania do Documento).
2. **Preview obrigatório**: O PDF original sempre visível para conferência visual.
3. **Cálculo do líquido imutável via código**: O operador nunca digita o líquido; ele é calculado.
4. **Título = Documento**: O documento e o título pai compartilham o mesmo ciclo de vida. O grid exibe o status do título.
5. **Formas de pagamento manual vs CNAB**: TED/Transferência → remessa; demais → manual (Aprovado → Pago direto).

## 7. Dependências

- **Cadastro de Fornecedores**: O sistema precisa consultar e cadastrar fornecedores.
- **Cadastro de Contratos**: Vinculação opcional a contratos.
- **Plano Orçamentário**: Seleção do plano para consolidação futura.
- **Tabela de Alíquotas**: Parametrização fiscal por município/código de serviço.

## 8. Perguntas em Aberto

1. O OCR será serviço próprio (Tesseract/local) ou SaaS externo (AWS Textract, Google Vision)?
2. Como será o armazenamento dos PDFs? S3 (MinIO dev) ou filesystem?
3. A subcategoria (vista no mock) é um campo novo ou já existe no plano orçamentário?
4. O aprovador é selecionado no lançamento ou qualquer aprovador com alçada pode aprovar depois?
