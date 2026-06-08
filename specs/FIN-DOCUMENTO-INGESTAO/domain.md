# Domain — FIN-DOCUMENTO-INGESTAO

> **Referência normativa**: Evans, _Domain-Driven Design_ (Cap. 5–6 — Aggregates, Entities, Value Objects); Vernon, _Implementing Domain-Driven Design_ (Cap. 7 — Domain Services).
>
> Citação canônica (Evans, p. 127): "An aggregate is a cluster of associated objects that we treat as a unit for the purpose of data changes."

---

## 1. Bounded Contexts Envolvidos

| BC                       | Responsabilidade                                                      | Tipo       |
| :----------------------- | :-------------------------------------------------------------------- | :--------- |
| **Gestão de Documentos** | Dono do Fato Gerador. Ingestão, validação fiscal, cálculo do líquido. | Core ⭐    |
| **Títulos e Liquidação** | Ciclo de vida financeiro. Geração de títulos a partir do documento.   | Core ⭐    |
| **Ingestão & OCR**       | Transformação de PDF em dados estruturados.                           | Supporting |

---

## 2. Agregados

### 2.1. Documento (Aggregate Root)

O `Documento` é o **Aggregate Root** do Fato Gerador. Ele controla a consistência de todos os dados fiscais e financeiros que dão origem aos títulos.

```ts
type Documento = {
  id: DocumentoId; // Branded type
  tipo: TipoDocumento;
  fornecedor: FornecedorId;
  contrato?: ContratoId;
  identificacao: Identificacao;
  dadosFinanceiros: DadosFinanceiros;
  pagamento: Pagamento;
  categorizacao: Categorizacao;
  metadados: Metadados;
};

type TipoDocumento =
  | 'NFS-e' // Fiscal, gera filhos: ISS, IRRF, INSS, CSRF
  | 'DANFE' // Fiscal, registra ICMS/IPI/PIS/COFINS, sem filhos
  | 'RPA' // Fiscal, gera filhos: IRRF, INSS, CSRF
  | 'Fatura' // Fiscal, apenas pai
  | 'Boleto' // Não-fiscal, apenas pai
  | 'Recibo' // Não-fiscal, apenas pai
  | 'Imposto'; // Não-fiscal, apenas pai
```

### 2.2. Identificação (Value Object)

```ts
type Identificacao = {
  numero: string;
  serie?: string;
  competencia: string; // MM/AAAA
  dataEmissao: Date;
  dataVencimento: Date;
  descricao: string;
};
```

### 2.3. Dados Financeiros (Value Object)

```ts
type DadosFinanceiros = {
  valorBruto: Money;
  descontosNaFonte: Money;
  retencoes: Retencao[];
  impostosRegistrados: ImpostoRegistrado[];
  descontos: Money;
  multa: Money;
  juros: Money;
  valorLiquido: Money; // Calculado, readonly
};
```

> **Regra de cálculo (invariante)**:
>
> ```
> Líquido = Bruto − DescontosNaFonte − Soma(Retenções) − Descontos + Multa + Juros
> ```
>
> Impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) **não entram** no cálculo.

### 2.4. Retenção (Value Object)

```ts
type Retencao = {
  tipo: 'ISS' | 'IRRF' | 'INSS' | 'CSRF'; // CSRF = PIS + COFINS + CSLL
  aliquota: Percentage;
  valor: Money;
  baseCalculo: Money;
};
```

### 2.5. Imposto Registrado (Value Object)

```ts
type ImpostoRegistrado = {
  tipo: 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'CBS' | 'IBS_Municipal' | 'IBS_Estadual';
  aliquota: Percentage;
  valor: Money;
  baseCalculo: Money;
};
```

> **Regra**: `geraTituloFilho: false` sempre. Apenas registrado para auditoria fiscal.

### 2.6. Pagamento (Value Object)

```ts
type Pagamento = {
  forma: FormaPagamento;
  contaBancariaDebito: ContaBancariaId;
  contaBancariaFornecedor: DadosBancariosFornecedor;
  aprovadorPreferencial?: AprovadorId;
};

type FormaPagamento =
  | 'TED'
  | 'Transferencia_Bancaria'
  | 'PIX'
  | 'Boleto'
  | 'Cartao_Corporativo'
  | 'Cambio'
  | 'Guia_Recolhimento'
  | 'Outro';
```

> **Regra**: Somente `TED` e `Transferencia_Bancaria` geram remessa CNAB. Demais seguem fluxo manual (`Aprovado` → `Pago`).

### 2.7. Categorização (Value Object)

```ts
type Categorizacao = {
  centroCusto: CentroCustoId;
  categoria: CategoriaId;
  subcategoria?: SubcategoriaId; // Campo opcional (visto no mock, pendente validação)
  programa: ProgramaId;
  planoOrcamentario: PlanoOrcamentarioId;
};
```

### 2.8. Metadados (Value Object)

```ts
type Metadados = {
  pdfUrl: string; // URL no S3/MinIO
  lidoPorOcr: boolean;
  valorOriginalOcr?: Money;
  divergenciaDetectada: boolean;
  divergencias: Divergencia[];
  trilhaAuditoria: AlteracaoAuditoria[];
};

type Divergencia = {
  campo: string;
  valorOcr: string;
  valorCorrigido: string;
  tipo: 'Alíquota' | 'Valor' | 'Data';
  decisao: 'Aceito' | 'Corrigido' | 'Pendente';
  usuario: UsuarioId;
  data: Date;
};
```

---

## 3. Entidade: Título (Aggregado Separado)

O `Título` é um **Aggregate Root** separado no BC Títulos e Liquidação. Ele é gerado a partir do Documento, mas tem ciclo de vida próprio.

```ts
type Titulo = {
  id: TituloId;
  documentoOrigem: DocumentoId;
  tipo: 'Pai' | 'Filho';
  tipoRetencao?: 'ISS' | 'IRRF' | 'INSS' | 'CSRF'; // apenas para filhos
  status: StatusTitulo;
  valor: Money;
  vencimento: Date;
  fornecedor: FornecedorId;
  formaPagamento: FormaPagamento;
};

type StatusTitulo =
  | 'Rascunho'
  | 'Aberto'
  | 'Aprovado'
  | 'Transmitido'
  | 'Recusado'
  | 'Pago'
  | 'Conciliado';
```

> **Regra de Geração**:
>
> - Documento `NFS-e` → 1 Pai (líquido) + 4 Filhos (ISS, IRRF, INSS, CSRF).
> - Documento `RPA` → 1 Pai (líquido) + 3 Filhos (IRRF, INSS, CSRF).
> - Documentos `DANFE`, `Fatura`, `Boleto`, `Recibo`, `Imposto` → 1 Pai apenas.

---

## 4. Domain Services

### 4.1. CalculadoraLiquido (Domain Service)

Responsável pelo cálculo imutável do valor líquido.

```ts
function calcularLiquido(
  bruto: Money,
  descontosNaFonte: Money,
  retencoes: Retencao[],
  descontos: Money,
  multa: Money,
  juros: Money,
): Money {
  const totalRetencoes = retencoes.reduce((sum, r) => sum + r.valor, 0);
  return bruto - descontosNaFonte - totalRetencoes - descontos + multa + juros;
}
```

> **Invariante**: O resultado nunca pode ser negativo. Se for, lança `liquido-negativo`.

### 4.2. MotorRetencoes (Domain Service)

Responsável por comparar retenções com alíquotas padrão e detectar divergências.

```ts
function detectarDivergencias(
  retencoes: Retencao[],
  tabelaAliquotas: TabelaAliquotas,
  municipio: string,
  codigoServico: string,
): Divergencia[] {
  // Compara cada retenção com a alíquota padrão do município/código serviço
  // Retorna lista de divergências com tipo e valores esperado vs atual
}
```

### 4.3. GeradorTitulos (Domain Service)

Responsável por instanciar títulos a partir de um documento salvo (clique em "Salvar Documento").

```ts
function gerarTitulos(documento: Documento): Titulo[] {
  const pai = criarTituloPai(documento);
  const filhos = criarTitulosFilhos(documento);
  return [pai, ...filhos];
}
```

---

## 5. Eventos de Domínio

| Evento                 | Origem         | Descrição                                                                 |
| :--------------------- | :------------- | :------------------------------------------------------------------------ |
| `DocumentoCriado`      | Documento      | Novo documento inserido (manual ou via OCR).                              |
| `DocumentoAtualizado`  | Documento      | Campos alterados (auto-save ou edição manual).                            |
| `DivergenciaDetectada` | MotorRetencoes | Alíquota divergente identificada.                                         |
| `DivergenciaResolvida` | Documento      | Operador tomou decisão (aceitar/corrigir/solicitar).                      |
| `TituloAprovado`       | Titulo         | Título aprovado → status muda de `Aberto` para `Aprovado` (pai e filhos). |
| `TitulosGerados`       | GeradorTitulos | Lista de títulos (pai + filhos) instanciada.                              |
| `RascunhoSalvo`        | Documento      | Auto-save persistido com sucesso.                                         |

---

## 6. Regras de Negócio (Invariantes do Domínio)

1. **R1 (Cálculo do Líquido)**: `Líquido = Bruto − DescontosNaFonte − Retenções − Descontos + Multa + Juros`. Impostos registrados não entram.
2. **R2 (Soberania do Documento)**: O sistema reflete o valor do documento. Alterações manuais são permitidas, mas logadas.
3. **R3 (Vigilância de Alíquota)**: Divergência > X% da alíquota padrão exige decisão explícita do operador.
4. **R4 (Geração de Filhos por Tipo)**: Apenas NFS-e e RPA geram filhos. DANFE registra impostos sem filhos.
5. **R5 (Impostos da Reforma)**: CBS, IBS Municipal, IBS Estadual são apenas registrados. Não geram filhos, não abatem do líquido.
6. **R6 (Forma de Pagamento e CNAB)**: Só TED e Transferência Bancária entram em remessa.
7. **R7 (Descontos na Fonte)**: Abatidos do bruto, reduzem o valor do título pai.
8. **R8 (CSRF como agregado)**: PIS + COFINS + CSLL são agrupados em um único título filho "CSRF" para simplificação.
9. **R9 (Título = Documento)**: O documento e o título pai compartilham o mesmo ciclo de vida. Não há status separado para o documento.
10. **R10 (Cancelamento)**: Só permitido em status `Aberto`. Títulos transmitidos, pagos ou conciliados não podem ser cancelados.
11. **R11 (Independência do Ciclo de Vida)**: O pagamento, a baixa e a conciliação do título pai **não** se propagam para os filhos. Cada título (pai e filhos) é uma obrigação a pagar independente.

---

## 7. Context Map (Relacionamentos)

```
[ Ingestão & OCR ] ──(ACL)──► [ Gestão de Documentos ] ──(Customer/Supplier)──► [ Títulos e Liquidação ]
                                      │                                               │
                                      │                                               │
                                      ▼                                               ▼
                              [ StoragePort ]                                  [ Integração Bancária ]
                              [ OcrPort ]                                      [ Conciliação ]
```

- **Ingestão → Documentos (ACL)**: O OCR pode errar. Os dados só entram no domínio após validação do operador.
- **Documentos → Títulos (Supplier/Customer)**: O Documento é o "fornecedor" das regras fiscais. O Título é "cliente" dessas regras.
- **Títulos → Conciliação (Published Language)**: Eventos `TituloConciliado` e `ConciliacaoDesfeita`.

---

## 8. Decisões de Modelagem

### 8.1. Por que Documento e Título são agregados separados?

> Evans, p. 128: "Choose one entity to be the root of each aggregate."

O `Documento` é o Aggregate Root do Fato Gerador (dados fiscais, retenções, PDF). O `Titulo` é o Aggregate Root do ciclo de vida financeiro (status, pagamento, conciliação). Eles estão em **Bounded Contexts diferentes** (Gestão de Documentos vs Títulos e Liquidação), justificando a separação.

### 8.2. Por que CSRF é um único título filho?

Simplificação operacional. PIS (0,65%), COFINS (3%) e CSLL (1%) são todos recolhidos à Receita Federal. Agrupá-los em um único título filho "CSRF" reduz a complexidade do grid e da remessa sem perder a rastreabilidade (os valores individuais permanecem no documento).

### 8.3. Por que Impostos Registrados não são Value Objects do cálculo?

Separação de responsabilidades. Retenções (ISS, IRRF, INSS, CSRF) impactam o valor líquido e geram obrigações financeiras (títulos filhos). Impostos registrados (ICMS, IPI, PIS, COFINS, CBS, IBS) são apenas informativos/fiscais e não alteram o fluxo de caixa.
