# 🧩 Bounded Context: Gestão de Documentos

## 1. Papel no Mapa

Este é o **Core Context** (Coração do Negócio). Ele garante que o **"Fato Gerador"** seja registrado com fidelidade ao documento físico/digital, gerenciando as travas de aprovação e a composição financeira inicial.

Ele transforma a entrada bruta (OCR/Manual) em um objeto de domínio válido, calcula as obrigações fiscais e trava o valor para o financeiro.

## 2. Atores

* **Operador de Contas a Pagar** — Realiza a ingestão e o ajuste fino dos dados lidos pelo OCR.
* **Aprovador (Perfil)** — Usuário com autoridade para validar o lançamento e autorizar a geração financeira.
* **Motor de Vigilância Fiscal** — Componente interno que **sinaliza** discrepâncias entre o valor lido e as alíquotas padrão (sem impedir o fluxo).

## 3. Agregados e Entidades

```ts
DocumentoFiscal {
  id: DocumentoID;
  numero: string;
  tipo: TipoDocumento; // NFSe, DANFE, Recibo, Fatura
  status: StatusDocumento; // Aberto, Em_Aprovação, Selado (Aprovado)
  fornecedor: FornecedorSnapshot;
  datas: { emissao: Date; recepcao: Date; competencia: Date };
  dadosFinanceiros: {
    valorBruto: Money;
    impostosRetidos: Retencao[];   // Lidos do documento
    descontos: Money;
    multa: Money;
    juros: Money;
    valorLiquido: Money;            // Campo calculado (somente leitura)
  };
  itens: ItemDocumento[];
  evidencias: { arquivoOriginal: URI; hashOriginal: string };
  metadados: {
    lidoPorOCR: boolean;
    valorOriginalOCR: Money;
    divergenciaDetectada: boolean;
  };
}

Retencao {
  tipo: TipoImposto;   // ISS, IRRF, INSS, CSRF
  aliquota: percentage;
  valor: Money;
  baseCalculo: Money;
}
```

## 4. Comandos / Casos de Uso Principais

| Comando | Quem chama | Pré-condições | Efeito | Evento Publicado |
| :--- | :--- | :--- | :--- | :--- |
| **RegistrarEntradaOCR** | Sistema (OCR) | Arquivo disponível | Cria o Documento com status `Aberto`. | `DocumentoCapturado` |
| **AjustarLancamento** | Operador | Documento em `Aberto` | Permite editar Bruto, Impostos, Juros/Multa. Atualiza Líquido. | `LancamentoRefinado` |
| **EnriquecerDados** | Operador | `DocumentoCapturado` | Vincula Fornecedor, Centro de Custo e Plano de Contas. | `DocumentoEnriquecido` |
| **SolicitarAprovacao** | Operador | Dados conferidos | Move status para `Em_Aprovação`. | `AprovacaoSolicitada` |
| **AprovarDocumento** | Aprovador | Status `Em_Aprovação` | Muda status para `Selado`. Bloqueia edições. | `DocumentoSelado` |
| **ReabrirDocumento** | Gestor/Aprovador | Documento `Selado` | Realiza "rollback" para `Aberto` para correções. | `DocumentoReaberto` |

## 5. Eventos de Domínio

| Evento | Gatilho | Descrição |
| :--- | :--- | :--- |
| **DocumentoCapturado** | Finalização do OCR | O documento existe no sistema, mas é apenas um rastro digital. |
| **DocumentoEnriquecido** | Vinculação manual | Fornecedor, Centro de Custo e Plano de Contas anexados. |
| **LancamentoRefinado** | Ajuste do Operador | Valores ajustados; sinalizações de divergência atualizadas. |
| **AprovacaoSolicitada** | Conferência concluída | Documento entra no funil do Aprovador. |
| **DocumentoSelado** | Aprovação Final | O "Fato Gerador" está pronto para gerar títulos financeiros. |
| **DocumentoReaberto** | Rollback do Aprovador | Cancela títulos em aberto e exige nova aprovação. |

## 6. Invariantes (Regras de Negócio Inegociáveis)

* **R1 (Cálculo do Líquido)** — O valor líquido é uma função estrita:
  > `Líquido = Bruto − Retenções − Descontos + Multa + Juros`
  >
  > O usuário **nunca** digita este campo.
* **R2 (Soberania do Documento)** — O sistema registra o valor que **consta no documento fiscal**. O OCR é a fonte primária; alterações manuais em relação ao OCR devem ser logadas na trilha de auditoria.
* **R3 (Vigilância de Alíquota)** — Se o valor de um imposto inserido divergir em mais de X% da alíquota padrão parametrizada, o sistema deve exibir um **Alerta de Inconsistência**, mas **permite o prosseguimento** caso o usuário confirme.
* **R4 (Bloqueio de Selo)** — Uma vez `Selado`, nenhuma informação de valor pode ser alterada. Para corrigir, é obrigatório o comando `ReabrirDocumento`, que reinicia o ciclo de aprovação.
* **R5 (Herança de Contrato)** — Se o Fornecedor possuir um contrato ativo, as alíquotas de retenção devem ser obrigatoriamente sugeridas conforme o contrato.

## 7. Fluxo Exemplar ("Filminho")

1. O PDF é lido pelo **OCR**, que identifica R$ 100,00 de ISS.
2. O **Operador** percebe que o OCR leu errado (era R$ 10,00) e ajusta manualmente.
3. O sistema **Sinaliza** que houve alteração humana sobre o dado original do OCR.
4. O Operador insere R$ 5,00 de juros por atraso na recepção.
5. O sistema calcula automaticamente o **Valor Líquido** final.
6. O Operador envia para aprovação; o **Aprovador** revisa a trilha e "Sela" o documento.
7. O evento `DocumentoSelado` dispara a criação dos títulos no financeiro.

## 8. Glossário Específico

* **Fato Gerador** — O documento que origina a dívida.
* **Selo** — Estado de bloqueio que garante que o financeiro não pagará algo diferente do fiscal.
* **Soberania do Documento** — Princípio de que o sistema deve refletir o que está escrito no papel/XML, mesmo que a regra fiscal pareça incorreta.
* **Sinalização de Desvio** — Alertas visuais para evitar que erros de digitação ou leitura passem despercebidos pelo aprovador.
* **Retenção na Fonte** — Impostos descontados do prestador e pagos pelo tomador (a entidade).
* **Reabertura** — Procedimento de estorno do estado de bloqueio para permitir correções retroativas.
