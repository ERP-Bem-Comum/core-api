// Barrel dos IDs do módulo Financial. Cada ID é module-as-namespace no seu arquivo;
// aqui reexporta-se como namespace nomeado (consumir: `import { DocumentId } from './ids.ts'`
// e usar `DocumentId.generate()` / `DocumentId.rehydrate(raw)`).

export * as DocumentId from './document-id.ts';
export * as PayableId from './payable-id.ts';
