# Optimistic lock no `/api/v2/financial` — guia de consumo (frontend) + prova

**Feature**: `specs/010-fin-listagem-timeline/` (fatia 2) · **Status**: implementado e testado (W1) · **Para**: time de frontend (handoff).

> **TL;DR para o front:** toda resposta de documento traz `version` (inteiro). Guarde-o. Ao chamar `PATCH`/`approve`/
> `undo-approval`, **reenvie o `version` que você leu por último**. Se outro usuário alterou o documento nesse meio-tempo,
> a API responde **`409 document-version-conflict`** — re-busque o documento (pegue o novo `version`) e reapresente/repita.

---

## 1. Por que existe (fundamentação — "estamos certos e por quê")

O documento financeiro pode ser editado/aprovado por mais de um usuário (Operador, Aprovador). Sem controle de
concorrência, a segunda escrita sobrescreveria silenciosamente a primeira (_lost update_). Adotamos **optimistic
concurrency** (não lock pessimista), que é o padrão para borda HTTP _stateless_:

> "Our Aggregate instances employ optimistic concurrency to protect persistent objects from simultaneous overlapping
> modifications by different clients, thus avoiding the use of database locks. [...] objects carry a version number that
> is incremented when changes are made and checked before they are saved to the database. **If the version on the
> persisted object is greater than the version on the client's copy, the client's is considered stale and updates are
> rejected.**"
> — _(Vaughn Vernon, \_Implementing Domain-Driven Design_; `acdg/skills_base/shared-references/ddd/ddd--vernon-livro-vermelho.md:8869`)\_

Consequência lógica (o "porquê" da exposição da `version`): **a checagem compara a versão persistida com a "cópia do
cliente"**. O cliente só tem uma "cópia da versão" se a API a entregou numa leitura. Portanto a API **deve** devolver
`version` nas respostas — caso contrário o front não teria o que reenviar e o lock seria inutilizável. É a mesma mecânica
do par HTTP `ETag`/`If-Match` (concorrência condicional), aqui materializada por um campo `version` explícito.

Decisão registrada em `adr/0002-enforco-optimistic-lock.md` (feature 010) — clarify FR-009; o `version` no banco é
`fin_documents.version` (`int`, incrementado a cada escrita).

---

## 2. Onde a `version` aparece (response)

`version: number` (inteiro ≥ 0) está em **toda** resposta que serializa um documento:

| Rota                                                       | Quando o `version` chega                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `POST /api/v2/financial/documents` (201)                   | documento recém-criado → `version: 0`                                    |
| `GET /api/v2/financial/documents/:id` (200)                | versão atual do documento                                                |
| `GET /api/v2/financial/documents` (200)                    | **cada item** de `items[]` tem seu `version` (para ações inline em grid) |
| `PATCH /api/v2/financial/documents/:id` (200)              | versão **já incrementada** após o ajuste                                 |
| `POST /api/v2/financial/documents/:id/approve` (200)       | versão incrementada após aprovar                                         |
| `POST /api/v2/financial/documents/:id/undo-approval` (200) | versão incrementada após desfazer                                        |

---

## 3. Como consumir (passo a passo)

1. **Leia** o documento (GET detalhe, item da lista, ou a resposta da própria criação/escrita) e **guarde o `version`**.
2. Ao mutar (`PATCH`, `approve`, `undo-approval`), **envie no body o `version` que você leu**:

   ```http
   PATCH /api/v2/financial/documents/{id}
   Authorization: Bearer <token>
   Content-Type: application/json

   { "version": 1, "grossValueCents": "200000" }     // PATCH: version + campos a ajustar
   ```

   ```http
   POST /api/v2/financial/documents/{id}/approve
   { "version": 1 }                                   // approve/undo: só o version
   ```

3. **Sucesso (200):** use o `version` da resposta como o novo valor corrente (não precisa re-buscar).
4. **Conflito (409 `document-version-conflict`):** alguém alterou o documento. **Re-busque** (`GET /:id`), pegue o novo
   `version`, mostre ao usuário o estado atualizado e deixe-o reaplicar a ação. Nunca reenvie cegamente a mesma versão.

### Mapa de respostas relevantes

| HTTP    | `error.code`                    | Significado p/ o front                                                 |
| ------- | ------------------------------- | ---------------------------------------------------------------------- |
| 200/201 | —                               | ok; leia o `version` novo da resposta                                  |
| 400     | (Zod)                           | body/filtro malformado (ex.: `version` ausente/!inteiro, ref não-UUID) |
| 403     | `forbidden`                     | sem permissão (`fiscal-document:*` / `payable:approve`)                |
| 404     | `document-not-found`            | id inexistente                                                         |
| **409** | **`document-version-conflict`** | **versão stale → re-buscar e repetir**                                 |
| 422     | regra de negócio                | ex.: `net-value-not-positive`, `retention-not-allowed-for-type`        |

> O envelope de erro é `{ error: { code, message }, requestId }`. Para o conflito, `code = "document-version-conflict"`.

---

## 4. Prova (testes que garantem o contrato)

O comportamento acima é **coberto por testes automatizados** (não é promessa em prosa):

- **Borda (round-trip do cliente)** — `tests/modules/financial/adapters/http/version-roundtrip.http.test.ts` (CVR-001..008):
  criação retorna `version: 0`; `GET /:id` retorna a versão; `PATCH` com a versão lida → 200 + `version: 1`; `PATCH`/
  `approve` com versão **stale** → **409 `document-version-conflict`**; ciclo `approve`→`undo-approval` incrementa a versão;
  listagem traz `version` em cada item.
- **Borda (enforço do lock)** — `tests/modules/financial/adapters/http/optimistic-lock.http.test.ts` (CT-018..021).
- **Integração (MySQL real)** — `tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts`:
  `UPDATE ... WHERE id = ? AND version = expectedVersion`; `affectedRows = 0` (versão divergiu) → `document-version-conflict`
  (Refman 8.4 §13.2.17). Rodar: `pnpm run test:integration:financial`.

Gate verde no momento do handoff: `typecheck` + `format:check` + `lint` + `pnpm test` + `test:integration:financial`.

---

## 5. Notas

- `version` começa em **0** na criação e sobe **+1** por escrita bem-sucedida (`PATCH`/`approve`/`undo-approval`).
- A geração de títulos (cancelamento via `DELETE` em `Open`) não usa `version` (hard delete; ver contrato).
- A trilha (`GET /:id/timeline`) é independente do `version` — registra o histórico por-campo (ver `domain.md`).
