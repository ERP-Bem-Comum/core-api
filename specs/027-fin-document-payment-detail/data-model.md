# Data Model — Complemento da forma de pagamento (feature 027)

Fase 1 do `/speckit-plan`. Não há entidade nova — a feature adiciona **um atributo** ao agregado existente `Document`.

## Agregado afetado: `Document` (módulo `financial`)

### Atributo novo

| Campo | Tipo (domínio) | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `paymentDetail` | `string \| null` | não | `null` | Complemento da forma de pagamento (texto livre opaco) |

- Adicionado a **`DocumentCore`** (documento Open/Approved) e a **`DraftDocument`** (rascunho) em `domain/document/types.ts`, na mesma posição/estilo de `accessKey`/`competencia`/`debitAccountRef`.
- Sem identidade, sem comportamento, sem relação com outros atributos → atributo primitivo (ver `research.md` D1).

### Regras de validação (por camada)

| Regra | Onde | Comportamento |
|---|---|---|
| ausência = "não informado" | borda + domínio | `undefined` no input → `null` no agregado |
| vazio / whitespace-only inválido | borda (`.trim().min(1)`) | 400, não persiste |
| ≤ 255 caracteres | borda (`.max(255)`) + DB (`varchar(255)`) | 400 se exceder |
| sem caracteres de controle | borda (`.regex(/^[^\x00-\x1F\x7F]*$/)`) | 400 se contiver CR/LF/NUL/etc. |
| conteúdo preservado | borda | só `.trim()` nas pontas; sem sanitização interna |
| leitura sempre válida | mapper | qualquer string do banco é aceita; **nenhum** novo `DocumentMapperError` |

### Persistência (`fin_documents`)

| Coluna | Tipo | Null | Index | Notas |
|---|---|---|---|---|
| `payment_detail` | `varchar(255)` | sim | não | herda `utf8mb4_unicode_ci`; sem CHECK; migration `0026` (`ALTER ADD COLUMN`, INSTANT) |

Mapeamento `domain ↔ row` (`document.mapper.ts`) — propagar em 4 pontos com `?? null`:
- `mapRowToDocument` branch **Draft**: `paymentDetail: row.paymentDetail ?? null`
- `mapRowToDocument` branch **core** (Open/Approved): `paymentDetail: row.paymentDetail ?? null`
- `mapDocumentToRow` branch **Draft**: `paymentDetail: document.paymentDetail ?? null`
- `mapDocumentToRow` branch **Open/Approved**: `paymentDetail: core.paymentDetail ?? null`

### Fluxo na aplicação

- `SaveDocumentCommand` (`save-document.ts`) ganha `paymentDetail?: string | null`.
- `Document.create(...)` recebe `paymentDetail: cmd.paymentDetail ?? null` e o coloca no Draft/Core.
- Sem novo use-case; sem novo evento de domínio; sem outbox.

### Transições de estado

Nenhuma transição nova. `paymentDetail` acompanha o documento por todo o ciclo (Draft → Open → Approved → …) como dado de exibição/operacional. É editável enquanto o documento aceitar ajuste (PATCH), e a alteração é auditada (timeline before/after).
