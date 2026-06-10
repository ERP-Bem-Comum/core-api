# 003 — W1 (impl) — CTR-AMENDMENT-SIGNEDAT-AND-NUMBER

G2 (`signedAt` por aditivo) + G3 (numeração gerada por contrato). Agregado Amendment.

## Mudanças por camada

### Domínio
- `amendment/types.ts`: `signedAt: Date` em `PendingWithDocumentAmendment` + `HomologatedAmendment`
  (ausente em `PendingWithoutDocument` — sem null-as-state).
- `amendment/amendment.ts`: `attachSignedDocument(amendment, docRef, signedAt)` valida e grava `signedAt`;
  `homologate` herda. `amendment-number.ts` (novo): `formatAmendmentNumber(seq, year)` → `NN/AAAA`.

### Persistência
- `schemas/mysql.ts`: coluna `signed_at datetime(3)` + CHECK `signed_at_consistency`
  (`signed_at NOT NULL ⟺ signed_document_ref NOT NULL`); tabela `ctr_amendment_seq(contract_id PK, last_seq)`.
- Migration `0012_concerned_nick_fury.sql`: CREATE `ctr_amendment_seq` (hardening ENGINE/CHARSET +
  `COLLATE utf8mb4_bin` no contract_id) + ALTER `ctr_amendments` ADD `signed_at` + CHECK.
- `mappers/amendment.mapper.ts`: round-trip `signedAt` por estado (defesa em profundidade dos shapes).

### Port + adapters
- `amendment/repository.ts`: `nextAmendmentNumber(contractId, year)`.
- in-memory: contador `Map<contractId, lastSeq>`. drizzle: tx `INSERT…ODKU` → `SELECT FOR UPDATE` →
  `UPDATE +1` → `formatAmendmentNumber` (CHILD_CODES, per-contract).

### Application
- `create-amendment.ts`: `amendmentNumber` sai do command; gerado via `nextAmendmentNumber` (ano do clock).
- `attach-signed-document.ts`: `signedAt: string` no command → domínio.

### Borda HTTP + CLI
- `schemas.ts`: `createAmendmentBodySchema` sem `amendmentNumber`; `amendmentDocumentUploadQuerySchema`
  (= upload + `signedAt`); `amendmentDtoShape` expõe `signedAt` (nullable).
- `plugin.ts`: handler POST sem `amendmentNumber`; rota upload+attach usa a query com `signedAt`.
- `amendment-dto.ts`: expõe `signedAt`. CLI: `criar-aditivo` sem `--numero`; `anexar-documento` com `--assinado-em`.

## Testes ajustados (consequência da mudança de API do Amendment)
- Commands de `createAmendment` sem `amendmentNumber` (create-amendment, attach, reports).
- `Amendment.attachSignedDocument` (domínio) + use case + fixtures + mapper rows ganham `signedAt`.
- Rotas de upload de doc de aditivo + CLI E2E ganham `signedAt`/`--assinado-em`.

## Resultado
- W0 (amendment-number-generation + amendment-signedat): **GREEN**.
- Suíte completa: **2679 pass / 0 fail / 19 skipped** (2698 total).
- typecheck ✓ · format:check ✓ · lint ✓.
- **`pnpm run test:integration`: 91/91 pass** (MySQL real) — inclui o novo `nextAmendmentNumber`
  per-contract, round-trip de `signedAt`, e a suíte de Amendment.

Próximo: W2 (drizzle-orm-expert + typescript-language-expert).
