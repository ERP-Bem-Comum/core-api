# Code Review - Ticket CTR-STORAGE-INMEMORY - Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer (skill `.claude/skills/code-reviewer/SKILL.md`)
**Data:** 2026-05-22T11:42Z
**Escopo revisado:**

- `src/modules/contracts/adapters/storage/in-memory.ts` (criado em W1)
- `src/modules/notifications/adapters/email/nodemailer.ts` (fix colateral de formatacao em W1)
- `handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md` (registro complementar - decisao de manter `eslint-disable`)
- Referencias para contexto (nao modificadas em W1):
  - `src/modules/contracts/application/ports/document-storage.ts` (port)
  - `src/modules/contracts/application/ports/document-storage.types.ts` (BucketName/StorageKey/StorageRef + smart constructors)
  - `src/shared/result.ts`
  - `tests/modules/contracts/adapters/storage/in-memory.test.ts` (escrito em W0)

---

## Issues encontradas

### Critica (bloqueia approval)

Nenhuma.

### Importante (nao-bloqueia, mas registrar)

Nenhuma.

### Sugestao (estilo / clareza)

#### S1 - `src/modules/contracts/adapters/storage/in-memory.ts:140` (`getAllBlobs`)

**Categoria:** D (clareza de contrato do helper de teste)
**Problema:** `getAllBlobs: () => Array.from(store.values())` cria nova array (snapshot) — bom — mas **NAO** clona os `bytes` internos de cada blob. Se um test fizer `storage.getAllBlobs()[0].bytes[0] = 99`, o blob original seria mutado.

**Impacto:** Baixo. `getAllBlobs` e helper de inspecao para asserts de tests. Nenhum dos tests CA-T11/T12 muta os bytes via `getAllBlobs`. O contrato observable test double e "ler para asserts", nao "obter handle mutavel". Mas o invariante de defensive copy nao se estende a esse path.

**Fix sugerido (opcional, ticket de hardening):** clonar bytes ao retornar:

```ts
getAllBlobs: () =>
  Array.from(store.values()).map((b) => ({
    ...b,
    bytes: Uint8Array.from(b.bytes),
  })),
```

Custo: O(n_blobs * size) por chamada. Aceitavel pois `getAllBlobs` so e chamado em asserts de tests (volume baixo).

**Severidade:** baixa. Considerar incluir no proximo ticket de hardening (`CTR-STORAGE-HARDENING-INMEMORY`) junto com tests CA-T14 que validem a propriedade.

---

#### S2 - Decisao do `eslint-disable` em `sha256hex` ja auditada

**Categoria:** F (ESM/TS moderno)

Nao e issue — registro positivo. A decisao foi auditada por **dois** mecanismos independentes durante o W1:

1. **Audit pelo agente `nodejs-runtime-expert`** (registrado em [REPORT W1 §Fix colateral] e cross-link em inquiry 0011). Veredito: APPROVED. Citacao literal de `handbook/reference/nodejs/Crypto.md` linha 2050.
2. **Inquiry-0011** ([handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md](../../../../handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md)) — documenta 4 alternativas exploradas (branded, wrapper objeto, omit-readonly mapping, Proxy) e por que cada uma falha. Critério de revisita registrado (Immutable ArrayBuffer Stage 3 + V8 ship).

O reviewer chancela a decisao.

---

#### S3 - Fix colateral em `nodemailer.ts` validado

**Categoria:** F (formatacao)

Confirmado: 3 fixes triviais aplicados via `pnpm exec prettier --write`:
- linha 23-24: remoção de linha em branco extra pós-imports
- linha 47: `}` → `};` em arrow function expression (faltava ponto-e-virgula)
- linha 87: remocao de linha em branco final extra

Diff e cosmetico, **zero impacto semantico**. Provavelmente herdado de hook que rodou parcial apos o close de `CTR-EMAIL-ADAPTER-NODEMAILER`. `pnpm test` em modulo notifications continua 16/16 GREEN apos o fix.

Aceitavel como fix colateral neste ticket - alternativa seria abrir micro-ticket `CTR-NODEMAILER-FORMAT-FIX` (size XS) so para isso, o que seria overhead burocratico para 3 mudancas de whitespace.

---

## O que esta bom

1. **Defensive copy em entrada e saida** - `Uint8Array.from(input.bytes)` no upload (linha 73), `Uint8Array.from(blob.bytes)` no download (linha 97). Tests CA-T9 e CA-T10 cobrem ambos os paths. (categoria D)

2. **Hash calculado sobre a copy, nao sobre `input.bytes`** - elimina TOCTOU: caller nao consegue mutar entre check e store. Detalhe sutil mas correto. (linha 73-74)

3. **`expectedSha256` comparison antes do store.set** - mismatch retorna `err` SEM armazenar. CA-T3 valida `storage.size() === 0` apos mismatch. (linha 76-78)

4. **`signedUrl` valida TTL ANTES de construir URL** - falha rapida, sem alocacao desnecessaria. Faixa `(0, 604800]` corretamente implementada (`<= 0 || > TTL_MAX_INCLUSIVE`). (linha 110-112)

5. **`composeKey` helper para chave do Map** - separa concerns. Usa `String(bucket)` e `String(key)` para desempacotar branded types explicitamente, sem `.toString()` implicito. (linha 53-54)

6. **Factory pura, sem efeito top-level** - `const store = new Map<...>()` dentro do closure de `createInMemoryDocumentStorage`. Cada instancia tem seu proprio Map - testes nao precisam reset entre instancias. (linha 60-61)

7. **`InMemoryDocumentStorage` extends `DocumentStorage` via intersection** - smoke type-level (CA-T13) garante que e assignable ao port. Padrao alinhado com `InMemoryEmailSender` e `InMemoryEventBus`. (linha 42-47)

8. **Constantes nomeadas** - `SIGNED_URL_HOST`, `TTL_MAX_INCLUSIVE = 604_800` com numeric separator e comentario citando origem (AWS V4 signing, 7 dias). (linha 49-51)

9. **Imports usam `.ts` extension** + **`import type` em tipos puros** - `DocumentStorage`, `DocumentStorageError`, `UploadInput`, `BucketName`, `StorageKey`, `StorageRef`. (categoria F)

10. **Zero `try/catch`** - adapter InMemory nao tem boundary com infra real, apenas validacoes logicas retornando `Result`. (categoria D)

11. **Public-api do modulo contracts NAO foi tocado** - adapter de teste permanece detalhe interno (CA12). Decisao I2 herdada do notifications continua respeitada. (categoria E)

12. **ASCII puro** em ambos os arquivos novos. Consistente com lição da serie Pipeline Tooling.

13. **Comentario do header documenta as 3 decisoes principais** (defensive copy, URL fake, TTL cap) + cita ADR-0019. Boa pratica - facilita leitura por quem chegar depois sem contexto de W0/W1.

---

## CAs do request - verificacao final

| CA | Onde | Status |
| :--- | :--- | :--- |
| CA1 | `in-memory.ts` exporta `createInMemoryDocumentStorage(): InMemoryDocumentStorage` factory pura | OK |
| CA2 | `InMemoryDocumentStorage = DocumentStorage & Readonly<{ size, clear, getAllBlobs }>` + smoke type-level | OK (CA-T13) |
| CA3 | Hash via `node:crypto`, lowercase 64 chars | OK (CA-T1, conferido contra `sha256hex` do proprio teste) |
| CA4 | `expectedSha256` mismatch retorna `'storage-integrity-mismatch'` sem armazenar | OK (CA-T3) |
| CA5 | `signedUrl` formato + faixa `(0, 604800]` | OK (CA-T6/T7/T8) |
| CA6 | Defensive copy entrada e saida | OK (CA-T9/T10) |
| CA7 | Helpers observable test double (`size`, `clear`, `getAllBlobs`) | OK (CA-T11/T12); S1 sugestao opcional sobre clone profundo em `getAllBlobs` |
| CA8 | 13 tests verdes em `pnpm test` (sem rede, sem Docker) | OK |
| CA9 | Zero `try/catch` | OK |
| CA10 | Gates verdes | OK (typecheck/format/lint/test) |
| CA11 | ASCII puro nos 2 arquivos novos | OK |
| CA12 | Public-api nao exporta o adapter | OK |
| CA13 | Nao toca port nem types do port | OK |

13/13 satisfeitos.

---

## Cross-link

- [REPORT W1](../003-impl/REPORT.md) §"Fix colateral" — detalhe das 3 mudancas em `nodemailer.ts`
- [REPORT W0](../002-tests/REPORT.md) §"Intencao de cada teste" — mapa CA-T1..CA-T13
- [Inquiry-0011](../../../../handbook/inquiries/0011-typedarrays-immutability-tc39-watchlist.md) — decisao registrada sobre `eslint-disable` em `Uint8Array`, com criterio de revisita
- [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md) — habilita esta serie de tickets

---

## Proximo passo

**APPROVED** -> pipeline avanca para **W3 (`ts-quality-checker`)**.

W3 deve rodar:
- `pnpm run typecheck` (esperado: OK; ja verificado em W1)
- `pnpm run format:check` (esperado: OK; corrigido em W1 incluindo fix colateral em `nodemailer.ts`)
- `pnpm run lint` (esperado: OK; ja verificado em W1)
- `pnpm test` (esperado: 0 fail no escopo do ticket; 18 fail pre-existente em `tests/infra/mysql-compose.test.ts` por Docker daemon offline - nao regressao deste ticket)

Pontos de atencao para o W3 reviewer:
1. Confirmar que `nodemailer.ts` apos o fix colateral nao regrediu nos 16 tests do modulo notifications.
2. Confirmar que o numero de tests do projeto subiu em +13 vs baseline anterior (CTR-EMAIL-ADAPTER-NODEMAILER fechado com 673 pass excluindo infra; agora deve ser 686 pass).
