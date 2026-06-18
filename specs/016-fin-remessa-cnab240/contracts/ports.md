# Contratos — Ports (financial/application/ports)

Todos `type Readonly<{...}>` de funções, retornando `Result<T, E>` (Princípio V; nunca `throw`/classe). Cada port tem adapter `in-memory` (testes) + real.

## CnabRemittanceTranslator (ACL — D-ACL)

```ts
export type CnabRemittanceTranslator = Readonly<{
  // Traduz uma ordem de remessa limpa → conteúdo CNAB 240 Bradesco (bytes/string).
  translate: (order: RemittanceOrder) => Result<RemittanceFileContent, CnabTranslateError>;
}>;
```

- `RemittanceOrder`: `{ cedente: CedenteAccount; nsa: Nsa; payments: readonly RemittancePayment[] }` (linguagem do domínio — sem CNAB).
- `RemittanceFileContent`: `{ bytes: Uint8Array; fileName: string }`.
- `CnabTranslateError`: `'cnab-translation-failed' | 'cnab-unsupported-payment-method' | 'cnab-invalid-cedente'`.
- **Adapters**: `bradesco-cnab240-translator.ts` (real, segmentos P/Q/J — guideline local-only) + `cnab-remittance-translator.fake.ts` (testes: gera conteúdo determinístico verificável).

## RemittanceRepository

```ts
export type RemittanceRepository = Readonly<{
  nextNsa: (account: CedenteAccountId) => Promise<Result<Nsa, RemittanceRepoError>>; // FOR UPDATE + UPDATE (D-NSA)
  save: (remittance: Remittance) => Promise<Result<void, RemittanceRepoError>>;
  findById: (id: RemittanceId) => Promise<Result<Remittance | null, RemittanceRepoError>>;
  list: (filter, page, pageSize) => Promise<Result<Page<RemittanceListItem>, RemittanceRepoError>>;
}>;
```

- `nextNsa` e `save` participam da **mesma transação** da geração (atomicidade D-ATOMICIDADE).

## CedenteAccountStore

```ts
export type CedenteAccountStore = Readonly<{
  getById: (id: CedenteAccountId) => Promise<Result<CedenteAccount | null, CedenteStoreError>>;
  getDefault: () => Promise<Result<CedenteAccount | null, CedenteStoreError>>; // fallback p/ doc sem debitAccountRef
}>;
```

- **Adapters**: Drizzle (`fin_cedente_accounts`) + in-memory (seed em testes/config).

## DocumentStorage (molde copiado do contracts — D-STORAGE)

```ts
export type DocumentStorage = Readonly<{
  upload: (input: UploadInput) => Promise<Result<StorageRef, DocumentStorageError>>; // calcula SHA-256 (D-HASH)
  signedUrl: (ref: StorageRef, ttlSeconds: number) => Promise<Result<URL, DocumentStorageError>>;
  download: (ref: StorageRef) => Promise<Result<Uint8Array, DocumentStorageError>>;
}>;
```

- **Adapters**: `document-storage.s3.ts` (`@aws-sdk/client-s3`, ADR-0019) + `document-storage.in-memory.ts`.

## Use case `generateRemittance` (orquestra)

```ts
generateRemittance(deps: {
  documentRepo: DocumentRepository;   // EXISTE
  remittanceRepo: RemittanceRepository;
  cedenteStore: CedenteAccountStore;
  translator: CnabRemittanceTranslator;
  storage: DocumentStorage;
  outbox: FinancialOutbox;            // EXISTE
  clock: Clock;                       // EXISTE
}) => (cmd: { documentIds: readonly string[] })
   => Promise<Result<{ remittances: RemittanceSummary[] }, GenerateRemittanceError>>
```

**Fluxo**: validar não-vazio → carregar docs → validar cada (`Approved` + forma elegível; senão erro com ofensores) → resolver `debitAccountRef` (ou default) e **agrupar por conta** → por conta: `translate` → `storage.upload` (hash) → numa **tx**: `nextNsa` + `Remittance.create` + `save` + `Document.transmit` (cada doc) + `outbox.append` → retornar resumos.
`GenerateRemittanceError` = união dos erros de domínio + ports.
