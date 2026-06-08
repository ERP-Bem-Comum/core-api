# TDD — improvements / consistency-referential-propagation

> **Dimensão:** Consistência da informação.
> **Fundamento canônico — Ramakrishnan & Gehrke (3ª ed., p.443), §16.1:** "Os usuários devem ser
> capazes de enxergar a execução de cada transação como atômica: ou todas as ações são executadas
> ou nenhuma delas é executada." (atribuição: Ramakrishnan & Gehrke, 3ª ed., p.443, §16.1)
> **Reforço (tdd-strategist / Kent Beck):** teste E2E encadeado (multi-passo) que prova
> propagação por referência — a edição do role muda a leitura derivada do usuário sem re-atribuição.

Status: MELHORIA (há teste de unidade de propagação; falta o E2E encadeado na borda HTTP — FR-007).
Requisito coberto: **FR-007** (editar role reflete nas permissões efetivas de quem o tem).

### PROP-1 — Cadeia create role → assign → baseline → edit → re-read (FR-007)

Cadeia de passos com captura de IDs (ordem obrigatória, estado compartilhado entre passos):

1. **POST `{{baseUrl}}/api/v1/roles`** — header `Authorization: Bearer {{adminToken}}`; body `{ name: <único>, permissions: ["P1"] }`.
   - Asserções: `res.getStatus()` ∈ {200, 201}; `res.getBody().id` string não-vazia.
   - **Captura:** `roleId` = `res.getBody().id`.

2. **(seed)** Garante um usuário alvo: POST `{{baseUrl}}/api/v1/users` (e-mail/CPF únicos) ou reusa um existente.
   - Asserções: `res.getStatus()` ∈ {200, 201}.
   - **Captura:** `userId` = `res.getBody().id`.

3. **POST `{{baseUrl}}/api/v1/users/{{userId}}/roles`** — atribui `roleId` ao `userId`.
   - Asserções: `res.getStatus()` ∈ {200, 201}; `res.getBody().assigned` === true (quando exposto).

4. **GET `{{baseUrl}}/api/v1/users/{{userId}}/permissions`** — baseline.
   - Asserções: `res.getStatus()` === 200; `res.getBody().permissions` é `array`; **inclui `"P1"`**.
   - **Captura:** `baselinePermissions` = `res.getBody().permissions`.

5. **PUT `{{baseUrl}}/api/v1/roles/{{roleId}}`** — body `{ permissions: ["P2"] }` (troca P1→P2).
   - Asserções: `res.getStatus()` === 200; `res.getBody().permissions` inclui `"P2"`.

6. **GET `{{baseUrl}}/api/v1/users/{{userId}}/permissions`** — re-leitura pós-edição.
   - Asserções:
     - `res.getStatus()` === 200
     - `res.getBody().permissions` **inclui `"P2"`** (propagação efetiva)
     - `res.getBody().permissions` **NÃO inclui `"P1"`** (substituição refletida por referência)

> Nota: `P1`/`P2` são duas permissões distintas do catálogo fixo (ex.: `user:read` e `role:read`).
> A prova de consistência é a diferença observável entre o passo 4 (baseline com P1) e o passo 6
> (sem P1, com P2) sem qualquer re-atribuição de role ao usuário.
