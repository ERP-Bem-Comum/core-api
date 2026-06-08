# TDD — improvements / consistency-edit-atomicity

> **Dimensão:** Consistência da informação.
> **Fundamento canônico — Ramakrishnan & Gehrke (3ª ed., p.443), §16.1:** "Os usuários devem ser
> capazes de enxergar a execução de cada transação como atômica: ou todas as ações são executadas
> ou nenhuma delas é executada." (atribuição: Ramakrishnan & Gehrke, 3ª ed., p.443, §16.1)
> **Reforço (tdd-strategist / Kent Beck):** caso de borda com verificação de estado por leitura
> subsequente — não basta o 409; prova-se que o patch foi integralmente descartado (all-or-nothing).

Status: MELHORIA (há 409 de update por email em conflito em `tdd/auth/2-users § 41`; falta a
verificação de que NENHUM campo do patch foi aplicado). Requisito coberto: **FR-009**.

### ATOM-1 — PUT que falha por email duplicado não deixa estado parcial (FR-009)

Cadeia de passos com captura de IDs e snapshot do estado original:

1. **POST `{{baseUrl}}/api/v1/users`** (usuário A) — header `Authorization: Bearer {{adminToken}}`; body com `email: "a@x"` + CPF único.
   - Asserções: `res.getStatus()` ∈ {200, 201}.
   - **Captura:** `idA` = `res.getBody().id`.

2. **POST `{{baseUrl}}/api/v1/users`** (usuário B) — body com `email: "b@x"` + CPF único; `name` e `telephone` conhecidos.
   - Asserções: `res.getStatus()` ∈ {200, 201}.
   - **Captura:** `idB` = `res.getBody().id`; `originalNameB`, `originalPhoneB`, `originalEmailB = "b@x"`.

3. **PUT `{{baseUrl}}/api/v1/users/{{idB}}`** — body do patch: `{ email: "a@x", name: <novo>, telephone: <novo> }` (tenta colidir email + alterar outros campos no mesmo patch).
   - Asserções: `res.getStatus()` === 409 (email-conflict).

4. **GET `{{baseUrl}}/api/v1/users/{{idB}}`** — confirma estado pós-falha.
   - Asserções (all-or-nothing — patch integralmente descartado):
     - `res.getStatus()` === 200
     - `res.getBody().email` === `"b@x"` (igual a `originalEmailB`; não virou `a@x`)
     - `res.getBody().name` === `originalNameB` (campo do patch NÃO aplicado)
     - `res.getBody().telephone` === `originalPhoneB` (campo do patch NÃO aplicado)

> Variação opcional (ATOM-2): repetir a falha com CPF inválido (422) no meio do patch e reasseverar,
> via GET, que nenhum campo válido do patch foi persistido — mesma disciplina all-or-nothing.
