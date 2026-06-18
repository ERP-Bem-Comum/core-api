import type { Result } from '../../../../shared/primitives/result.ts';

// Read port das sugestões de match (US2): candidatos = títulos `Paid` enriquecidos com os dados crus
// usados para avaliar os critérios (favorecido/valor/data/memo). `supplierOpenCount` é derivado pelo
// use-case a partir da própria lista (títulos por fornecedor). Read-only — R1 (nunca concilia).
export type SuggestionViewError = 'suggestion-view-failure';

export type SuggestionCandidate = Readonly<{
  payableId: string;
  valueCents: number;
  dueDate: Date;
  supplierRef: string | null;
  supplierName: string | null;
  documentNumber: string | null;
}>;

export type SuggestionView = Readonly<{
  listCandidates: () => Promise<Result<readonly SuggestionCandidate[], SuggestionViewError>>;
}>;
