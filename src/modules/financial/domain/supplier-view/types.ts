/**
 * Read-model de fornecedor no `financial` (US2 #47 / ADR-0043). Projeção de leitura
 * denormalizada `supplierRef → { name, document }`, mantida por eventos do `partners`
 * via outbox (consistência eventual). NÃO é agregado — é cópia local para a listagem.
 *
 * `document` é o CNPJ alfanumérico (ADR-0044) — texto. `occurredAt` é o instante do
 * evento de origem; serve de guard de recência no upsert (não regride).
 */
export type SupplierView = Readonly<{
  supplierRef: string;
  name: string;
  document: string;
  occurredAt: Date;
}>;
