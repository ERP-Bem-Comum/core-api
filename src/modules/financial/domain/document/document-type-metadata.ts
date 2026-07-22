import { exhaustiveStringUnion } from '../../../../shared/primitives/exhaustive.ts';
import type { DocumentType, PaymentMethod } from './types.ts';
import type { RetentionType } from '../shared/retention.ts';

// Catálogo ESTÁTICO de metadados por tipo de documento (#292): regra de negócio fixa que o front
// consulta para montar o formulário. Não persistido (≠ Category/CostCenter). FONTE ÚNICA das
// retenções permitidas — o agregado `Document` consome `allowedRetentionsFor` (sem duplicar).

// Retenções permitidas por tipo (R8): só NFS-e e RPA geram filhos. Demais → nenhuma.
const ALLOWED_RETENTIONS: Readonly<Partial<Record<DocumentType, readonly RetentionType[]>>> = {
  'NFS-e': ['ISS', 'IRRF', 'INSS', 'CSRF'],
  RPA: ['ISS', 'IRRF', 'INSS', 'CSRF'],
};

export const allowedRetentionsFor = (type: DocumentType): readonly RetentionType[] =>
  ALLOWED_RETENTIONS[type] ?? [];

// Sugestão de forma de pagamento por tipo — só onde é óbvio; null = o front usa o default próprio.
const SUGGESTED_PAYMENT: Readonly<Partial<Record<DocumentType, PaymentMethod>>> = {
  Boleto: 'Boleto',
  Imposto: 'GuiaRecolhimento',
};

export type DocumentTypeMetadata = Readonly<{
  type: DocumentType;
  allowedRetentions: readonly RetentionType[];
  accessKeyRequired: boolean;
  suggestedPaymentMethod: PaymentMethod | null;
}>;

export const metadataFor = (type: DocumentType): DocumentTypeMetadata => ({
  type,
  allowedRetentions: allowedRetentionsFor(type),
  // accessKey obrigatório só para DANFE (espelha a invariante do agregado em document.ts).
  accessKeyRequired: type === 'DANFE',
  suggestedPaymentMethod: SUGGESTED_PAYMENT[type] ?? null,
});

// `exhaustiveStringUnion` força cobertura EXATA dos 7 tipos em compile-time (CA5).
const ALL_TYPES = exhaustiveStringUnion<DocumentType>()([
  'NFS-e',
  'DANFE',
  'RPA',
  'Fatura',
  'Boleto',
  'Recibo',
  'Imposto',
]);

export const allMetadata = (): readonly DocumentTypeMetadata[] => ALL_TYPES.map(metadataFor);
