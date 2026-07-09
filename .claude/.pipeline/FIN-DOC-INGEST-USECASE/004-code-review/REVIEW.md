# Code Review — Ticket FIN-DOC-INGEST-USECASE — Round 1

**Veredito:** REJECTED

**Reviewer:** code-reviewer (contrato) + agente `security-backend-expert` (fluxo de upload, PoC)
**Data:** 2026-07-09

## Parte A — contrato (code-reviewer): sem achado
Mapper puro (spreads condicionais), use case factory→Result, adapters convertem para Result, ADR-0006 (port próprio; só o adapter S3 importa `contracts/public-api`). Já havia antecipado F1 (ordem validação vs write).

## Parte B — segurança (`security-backend-expert`): CHANGES-REQUESTED

Achados ancorados no **precedente correto do próprio repo** (`contracts/upload-document.ts` + `document-storage.s3.ts`).

### 🔴 F1 (Blocker) — write no S3 ANTES da validação anti-traversal (CWE-22) — `source-file-storage.s3.ts:38-53`
`key = ${prefix}/${documentId}/${fileName}` com `fileName` cru → `PutObjectCommand` executa **antes** de `SourceFileRef.create` (que rejeita `../`). Objeto com key hostil já gravado. `contracts` valida `createStorageKey` **antes** do upload. **Fix:** inverter — `SourceFileRef.create` → abortar se inválido → só então PutObject.

### 🟠 F2 — mesmo defeito no in-memory (`source-file-storage.in-memory.ts:15`). **Fix:** mesma inversão.
### 🟠 F3 — sem `ChecksumSHA256` no PutObject (CWE-354; `contracts` faz) — `source-file-storage.s3.ts:42-49`. **Fix:** passar `ChecksumSHA256` (hash já calculado).
### 🟠 F4 — PDF órfão (PII sem documento) se `saveDraft` falha após upload — `ingest-document.ts:57-77`. **Fix:** compensação best-effort (`storage.delete` no rollback).
### 🟡 F5 — CNPJ/CPF na `description` livre (minimização LGPD) — `document-reader-to-draft.ts:27-31`. **Decisão P.O.** (supplierRef nulo → info na description); mantido, nota registrada — reconfirmar com o dono se o `taxId` (pode ser CPF) deve mesmo ir no texto livre (propaga p/ timeline/exports).
### 🟡 F6 — `RESOURCE_ERRORS` não-exaustivo → fail-open futuro — `ingest-document.ts:39-43`. **Fix:** `Record<DocumentReaderError, 'resource'|'read'>` (exaustivo por construção).
### 🔵 F7/F8 — pré-condições da **fatia 3** (borda): `bodyLimit`, magic-bytes vs `declaredMime`, sanitização de `fileName` (defesa em profundidade além do F1), `requireAuth`+`authorize(write)`. Registrado para o ticket #3.

## Próximo passo
REJECTED → aplicar F1/F2/F3/F4/F6 + testes de regressão (traversal → não grava; órfão → delete best-effort). F5 mantido (decisão P.O.). F7/F8 → fatia 3. Depois W2 round 2.

---

# Code Review — Round 2

**Veredito:** APPROVED

**Data:** 2026-07-09

| Finding | Correção | Regressão travada |
| :-- | :-- | :-- |
| 🔴 F1 traversal (S3) | `SourceFileRef.create` (valida a key) **antes** do PutObject; aborta se inválida | `F1/F2: fileName com path-traversal → err e NÃO grava` |
| 🟠 F2 traversal (in-memory) | mesma inversão antes do `store.set` | idem (via in-memory real) |
| 🟠 F3 integridade | `ChecksumSHA256` (base64 do hash) no PutObject | (S3; verificado no CA4/deploy) |
| 🟠 F4 órfão | port ganhou `remove`; `ingestDocument` faz `storage.remove` best-effort no rollback do saveDraft | `F4: saveDraft falha → remove o comprovante órfão` |
| 🟡 F6 fail-open | `RESOURCE_ERRORS` → `Record<DocumentReaderError, 'resource'\|'read'>` (exaustivo por construção) | (compilador quebra se novo erro não-classificado) |
| 🟡 F5 CNPJ na description | **mantido** — decisão P.O. (supplierRef nulo → info na description). Nota LGPD registrada; reconfirmar se `taxId`/CPF deve ir no texto livre |
| 🔵 F7/F8 | **pré-condições da fatia 3** (#3): `bodyLimit`, magic-bytes vs `declaredMime`, sanitização de `fileName` (defesa em profundidade além do F1), `requireAuth`+`authorize(write)` |

**Gates pós-fix:** `node --test` ingest 7 pass / 0 fail (2 novos de regressão); `tests/modules/financial` 692 pass / 0 fail; `typecheck` exit 0; `eslint` 0 erros.

**Próximo passo:** APPROVED → **W3** (gate final). F7/F8 viram os requisitos de segurança do ticket #3; F5 aguarda reconfirmação do dono (não bloqueia).
