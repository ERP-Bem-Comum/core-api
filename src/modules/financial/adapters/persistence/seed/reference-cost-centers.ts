// Seed determinístico dos centros de custo de referência (020 · US2 / research.md D5).
// UUIDs FIXOS → SC-002: o MESMO `id` em todos os ambientes/sessões. Espelhado na migration
// `0013_*` (INSERT ... ON DUPLICATE KEY UPDATE — idempotente). Conjunto inicial = exemplos do
// protótipo, refinável pela P.O. sem quebrar ids já gravados em lançamentos.

export type ReferenceCostCenterSeed = Readonly<{ id: string; code: string; name: string }>;

export const REFERENCE_COST_CENTER_SEED: readonly ReferenceCostCenterSeed[] = [
  { id: 'f1cce570-0000-4000-8000-000000000001', code: 'CC-001', name: 'Administrativo' },
  { id: 'f1cce570-0000-4000-8000-000000000002', code: 'CC-002', name: 'Programa Saúde' },
  { id: 'f1cce570-0000-4000-8000-000000000003', code: 'CC-003', name: 'Programa Educação' },
  { id: 'f1cce570-0000-4000-8000-000000000004', code: 'CC-004', name: 'Captação de recursos' },
  { id: 'f1cce570-0000-4000-8000-000000000005', code: 'CC-005', name: 'Projetos sociais' },
];
