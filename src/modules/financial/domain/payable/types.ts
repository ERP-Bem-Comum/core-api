import type { Money } from '../../../../shared/kernel/money.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { RetentionType } from '../shared/retention.ts';
import type { DocumentStatus, PaymentMethod } from '../document/types.ts';

// Título financeiro — entidade INTERNA ao agregado Document nesta fatia (ADR-0002).
// Pai = valor líquido; Filho = um imposto retido (geração de filhos na US2).
export type PayableKind = 'Parent' | 'Child';

export type Payable = Readonly<{
  id: PayableId;
  origin: DocumentId;
  kind: PayableKind;
  retentionType: RetentionType | null; // preenchido só em Child
  status: DocumentStatus; // espelha o documento nesta fatia
  value: Money;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  paidAt: Date | null; // #231: data de pagamento (preenchida na baixa); null enquanto não pago
}>;

export type Payables = Readonly<{
  parent: Payable;
  children: readonly Payable[];
}>;
