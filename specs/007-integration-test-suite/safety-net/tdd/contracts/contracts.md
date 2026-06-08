# TDD — contracts / pasta contracts

> Rede de segurança 1:1 (spec 007 / US1 / T005). Um caso por request `.bru`. Asserções **literais** do bloco `tests {}`. Sem `tests {}` → `**smoke-only**`.
> Fonte read-only: `api-collections/contracts/contracts/*.bru`. Não modificar os `.bru`.

---

## Caso 1 — criar contrato com contratado (US1-1)

- **bru:** `contracts/01-create-contract.bru` (seq 10)
- **Método + rota:** `POST {{baseUrl}}/api/v2/contracts`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** `{ title, objective, originalValue: { cents: 100000 }, startDate, endDate, contractor: { type: "supplier", id: {{contractorSupplierId}} } }`
- **Pré-condições:** `operatorToken` válido (Caso 7 de auth).
- **Efeito colateral:** `script:post-response` extrai o id do header `Location` para `contractCreatedId`.
- **Asserções literais:**
  - `test("US1-1 — POST /contracts com contractor retorna 201")`: `expect(res.getStatus()).to.equal(201)`
  - `test("US1-1 — header Location presente apos criacao")`:
    - `expect(res.getHeader("location")).to.be.a("string")`
    - `expect(res.getHeader("location")).to.contain("/api/v2/contracts/")`

---

## Caso 2 — criar contrato sem contractor (US1-2 / FR-001)

- **bru:** `contracts/02-create-sem-contractor-400.bru` (seq 11)
- **Método + rota:** `POST {{baseUrl}}/api/v2/contracts`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** contrato sem bloco `contractor`.
- **Pré-condições:** `operatorToken` válido.
- **Asserções literais:**
  - `test("US1-2 — POST /contracts sem contractor retorna 400")`: `expect(res.getStatus()).to.equal(400)`
  - `test("US1-2 — envelope de erro tem campo error")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("code")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 3 — criar contrato com contractor.id não-UUID (US1-2)

- **bru:** `contracts/03-create-contractor-id-invalido-400.bru` (seq 12)
- **Método + rota:** `POST {{baseUrl}}/api/v2/contracts`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** contrato com `contractor.id: "nao-e-um-uuid-valido"`.
- **Pré-condições:** `operatorToken` válido.
- **Asserções literais:**
  - `test("US1-2 — POST /contracts com contractor.id nao-uuid retorna 400")`: `expect(res.getStatus()).to.equal(400)`
  - `test("US1-2 — envelope de erro tem campo error.code")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("code")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 4 — get contrato por id (US1-3)

- **bru:** `contracts/04-get-contract-by-id.bru` (seq 13)
- **Método + rota:** `GET {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** `contractCreatedId` populado (Caso 1) e `operatorToken` válido.
- **Asserções literais:**
  - `test("US1-3 — GET /contracts/:id retorna 200")`: `expect(res.getStatus()).to.equal(200)`
  - `test("US1-3 — id bate com o criado")`: `expect(res.getBody().id).to.equal(bru.getVar("contractCreatedId"))`
  - `test("US1-3 — bloco contractor presente com type e id")`:
    - `expect(body).to.have.property("contractor")`
    - `expect(body.contractor).to.have.property("type")`
    - `expect(body.contractor).to.have.property("id")`
    - `expect(body.contractor.type).to.equal("supplier")`
    - `expect(body.contractor.id).to.equal(bru.getVar("contractorSupplierId"))`
  - `test("US1-3 — bloco contractor tem campo snapshot (pode ser null ...)")`:
    - `expect(body.contractor).to.have.property("snapshot")`
    - `expect(snapshot === null || typeof snapshot === "object").to.be.true`
  - `test("US1-3 — header Sunset presente (rota gorda transitoria ADR-0032)")`:
    - `expect(sunset !== undefined || deprecation !== undefined).to.be.true` (`sunset = res.getHeader("sunset")`, `deprecation = res.getHeader("deprecation")`)

---

## Caso 5 — patch metadados do contrato (US2-1)

- **bru:** `contracts/05-patch-metadata.bru` (seq 14)
- **Método + rota:** `PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** `{ title: "Contrato E2E Bruno Atualizado", observations: "Observacao adicionada pelo smoke test" }`
- **Pré-condições:** `contractCreatedId` populado e `operatorToken` válido.
- **Asserções literais:**
  - `test("US2-1 — PATCH /contracts/:id com metadados validos retorna 200")`: `expect(res.getStatus()).to.equal(200)`
  - `test("US2-1 — title atualizado na resposta")`: `expect(res.getBody().title).to.equal("Contrato E2E Bruno Atualizado")`
  - `test("US2-1 — observations atualizado na resposta")`: `expect(res.getBody().observations).to.equal("Observacao adicionada pelo smoke test")`

---

## Caso 6 — patch campo imutável originalValue (US2-2)

- **bru:** `contracts/06-patch-campo-imutavel-400.bru` (seq 15)
- **Método + rota:** `PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** `{ originalValue: { cents: 1 } }`
- **Pré-condições:** `contractCreatedId` populado e `operatorToken` válido.
- **Asserções literais:**
  - `test("US2-2 — PATCH com campo imutavel retorna 400 (Zod strict)")`: `expect(res.getStatus()).to.equal(400)`
  - `test("US2-2 — envelope de erro tem campo error.code")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("code")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 7 — patch corpo vazio (US2-3)

- **bru:** `contracts/07-patch-corpo-vazio-400.bru` (seq 16)
- **Método + rota:** `PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{operatorToken}}`
- **Body:** `{}`
- **Pré-condições:** `contractCreatedId` populado e `operatorToken` válido.
- **Asserções literais:**
  - `test("US2-3 — PATCH com corpo vazio {} retorna 400 (refine exige >= 1 campo)")`: `expect(res.getStatus()).to.equal(400)`
  - `test("US2-3 — envelope de erro tem campo error.code e requestId")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("code")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 8 — delete recusado 405 (US2-4)

- **bru:** `contracts/08-delete-recusado-405.bru` (seq 17)
- **Método + rota:** `DELETE {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{operatorToken}}` · body: none
- **Pré-condições:** `contractCreatedId` populado e `operatorToken` válido.
- **Asserções literais:**
  - `test("US2-4 — DELETE /contracts/:id retorna 405")`: `expect(res.getStatus()).to.equal(405)`
  - `test("US2-4 — error.code eh contract-delete-forbidden")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error.code).to.equal("contract-delete-forbidden")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 9 — get sem Authorization 401 (US1-7)

- **bru:** `contracts/09-get-sem-auth-401.bru` (seq 18)
- **Método + rota:** `GET {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** none
- **Pré-condições:** `contractCreatedId` populado.
- **Asserções literais:**
  - `test("US1-7 — GET /contracts/:id sem token retorna 401")`: `expect(res.getStatus()).to.equal(401)`
  - `test("US1-7 — envelope de erro tem requestId")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("requestId")`

---

## Caso 10 — patch com token só-leitura 403 (US2-6)

- **bru:** `contracts/10-patch-reader-403.bru` (seq 19)
- **Método + rota:** `PATCH {{baseUrl}}/api/v2/contracts/{{contractCreatedId}}`
- **Auth:** bearer `{{readerToken}}`
- **Body:** `{ title: "Tentativa sem permissao de escrita" }`
- **Pré-condições:** `contractCreatedId` populado e `readerToken` válido (Caso 6 de auth).
- **Asserções literais:**
  - `test("US2-6 — PATCH com token contract:read retorna 403")`: `expect(res.getStatus()).to.equal(403)`
  - `test("US2-6 — envelope de erro tem requestId (nunca vazar detalhe interno)")`:
    - `expect(res.getBody()).to.have.property("error")`
    - `expect(res.getBody().error).to.have.property("requestId")`
