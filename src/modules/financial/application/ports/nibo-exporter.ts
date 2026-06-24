// Port da serialização do export CSV-Nibo (#146). EXPORT-ABSTRACTION-DESIGN: a projeção concreta
// (`NiboExportRow`) é montada pelo use-case (application) e a serialização CSV é um adapter puro.
// O port mantém o use-case independente do adapter (application.md §"Sem importar de adapters/").

export type NiboTransactionType = 'Lançamento' | 'Transferência';

// Linha plana do layout de Importação em Lotes do Nibo (15 colunas). Datas/valor são crus —
// a formatação (dd/MM/aaaa, decimal vírgula, BOM) é responsabilidade do serializador.
export type NiboExportRow = Readonly<{
  transactionType: NiboTransactionType;
  contactName: string;
  description: string;
  category: string;
  /** Centavos com sinal: negativo = pagamento/despesa, positivo = recebimento/receita. */
  valueCents: number;
  dueDate: Date | null;
  forecastDate: Date | null;
  competencia: Date | null;
  costCenter: string;
  favorite: 'Sim' | 'Não';
  contactType: string;
  reference: string;
  /** Apelido da conta; em Transferência = conta destino. */
  account: string;
  paymentDate: Date | null;
  annotation: string;
}>;

export type NiboExporter = Readonly<{
  export: (rows: readonly NiboExportRow[]) => string;
}>;
