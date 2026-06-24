import type { DocumentStatus, DocumentType } from '../document/types.ts';
import type { Page } from '../document/query.ts';
import type { PayableKind } from './types.ts';
import type { RetentionType } from '../shared/retention.ts';

// Read path da listagem de Contas a Pagar orientada a TÍTULO (#201/#221, decisão #220 = opção A).
// Cada título (pai = líquido; filho = retenção) é uma LINHA pagável/conciliável própria, com status
// e vencimento próprios — diferente do grid por-documento (#47).

export type { Page };

export type PayableListFilter = Readonly<{
  status?: DocumentStatus; // status próprio do título
  documentType?: string; // match livre (a borda aceita qualquer texto)
  supplierRef?: string;
  dueFrom?: Date;
  dueTo?: Date; // janela inclusiva
}>;

export type PayableListItem = Readonly<{
  payableId: string;
  documentId: string;
  documentNumber: string | null;
  series: string | null;
  documentType: DocumentType | null;
  kind: PayableKind; // Parent (líquido) | Child (retenção)
  retentionType: RetentionType | null; // preenchido só em Child
  valueCents: number;
  dueDate: Date;
  status: DocumentStatus; // status do TÍTULO (base da baixa/conciliação individual)
  supplierRef: string | null;
  contractRef: string | null;
  // #229: paridade com o grid por documento — todos derivados do documento pai.
  issueDate: Date | null;
  paymentMethod: string | null;
  version: number; // optimistic lock do documento (ações em massa por título)
  grossValueCents: number | null;
  netValueCents: number | null;
}>;
