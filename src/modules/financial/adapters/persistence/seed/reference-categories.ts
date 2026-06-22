// Seed determinístico das categorias de referência (020 · Decisão A / research.md D5).
// UUIDs FIXOS → SC-002: o MESMO `id` em todos os ambientes/sessões. Espelhado na migration
// `0012_*` (INSERT ... ON DUPLICATE KEY UPDATE — idempotente). Conjunto inicial = exemplos do
// protótipo §9.4.5, refinável pela P.O. sem quebrar ids já gravados em lançamentos.

// `parentId` (#147 F3) opcional: quando a P.O. fornecer a taxonomia de subcategorias, basta
// apontar para o `id` da categoria-pai aqui (sem mudança de código). Ausente = top-level.
export type ReferenceCategorySeed = Readonly<{
  id: string;
  name: string;
  group: string;
  parentId?: string;
}>;

export const REFERENCE_CATEGORY_SEED: readonly ReferenceCategorySeed[] = [
  // despesa
  { id: 'f1ca7e90-0000-4000-8000-000000000001', name: 'Aluguel', group: 'despesa' },
  { id: 'f1ca7e90-0000-4000-8000-000000000002', name: 'Folha de pagamento', group: 'despesa' },
  { id: 'f1ca7e90-0000-4000-8000-000000000003', name: 'Tarifas bancárias', group: 'despesa' },
  { id: 'f1ca7e90-0000-4000-8000-000000000004', name: 'Materiais e insumos', group: 'despesa' },
  { id: 'f1ca7e90-0000-4000-8000-000000000005', name: 'Serviços de terceiros', group: 'despesa' },
  // receita
  { id: 'f1ca7e90-0000-4000-8000-000000000006', name: 'Doações', group: 'receita' },
  { id: 'f1ca7e90-0000-4000-8000-000000000007', name: 'Captação de recursos', group: 'receita' },
  { id: 'f1ca7e90-0000-4000-8000-000000000008', name: 'Convênios e subvenções', group: 'receita' },
  { id: 'f1ca7e90-0000-4000-8000-000000000009', name: 'Rendimentos financeiros', group: 'receita' },
  // ajuste
  { id: 'f1ca7e90-0000-4000-8000-000000000010', name: 'Ajuste de conciliação', group: 'ajuste' },
  { id: 'f1ca7e90-0000-4000-8000-000000000011', name: 'Estorno', group: 'ajuste' },
];
