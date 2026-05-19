# Ticket CTR-VO-IDS: Branded IDs do módulo `contracts`

> **Idioma:** documentação em PT. Identificadores de código (`ContractId`, `AmendmentId`, `DocumentId`, `generate`, `rehydrate`) em EN conforme a regra invariante.

## Contexto

Todo agregado precisa de um identificador único, **tipado de forma a impedir confusão entre IDs** (`ContractId` ≠ `AmendmentId` ≠ `DocumentId`). Sem branded types, TypeScript trata todos como `string` e bugs silenciosos passam:

```ts
function findAmendments(contractId: string) { /* ... */ }
findAmendments(amendmentId);  // 💥 TS aceita silenciosamente
```

Branded IDs resolvem isso compile-time. Este ticket cria a fundação para `Contract`, `Amendment` e `Document`.

## Escopo

- `src/modules/contracts/domain/shared/ids.ts` — 3 branded types + namespaces `generate`/`rehydrate`.
- `tests/modules/contracts/domain/shared/ids.test.ts` — testes para os 3.

## Fora de escopo

- `UserId` (ou `UserRef`) — pertence ao `shared-kernel/` ou ao módulo `identity` futuro, não a `contracts`. Ticket separado.
- Outros formatos de ID (sequencial, snowflake, ULID) — Fase 1 usa UUID v4 universalmente.
- Persistência de UUID como `CHAR(36)` vs. `BINARY(16)` no MySQL — decisão do adapter, ticket futuro.

## Decisões de design

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | UUID v4 sintático (regex em `src/shared/id.ts:isUuidV4`) | Padrão do projeto, baixo acoplamento, gera localmente sem coordenação central. |
| D2 | 3 namespaces idênticos: `ContractId`, `AmendmentId`, `DocumentId` — cada um com `generate` e `rehydrate`. Sem factory genérica. | DRY menos importante que clareza local. ~6 linhas por namespace = 22 linhas total — repetição vale o ganho de tipos nominais cristalinos. |
| D3 | `generate(): XxxId` — usa `newUuid()` do shared, cast direto após geração. | `newUuid` retorna UUID v4 garantido (de `node:crypto.randomUUID()`). Cast seguro por construção. |
| D4 | `rehydrate(raw: string): Result<XxxId, 'xxx-id-invalid'>` — valida via `isUuidV4`, cast só após validação. | Usado quando ID vem de fora (banco, HTTP). Erros tipados, sem `throw`. |
| D5 | Erro **individual por tipo** — `'contract-id-invalid'`, `'amendment-id-invalid'`, `'document-id-invalid'`. | Permite ao caller distinguir qual ID falhou na borda. |
| D6 | Não há `XxxId.parse(string \| undefined)` ou similar permissivo. | Quem chama `rehydrate` sabe que tem `string` — branding entry-point é estrito. Para `undefined`, lida na borda. |

## Critérios de aceite

### `ContractId`, `AmendmentId`, `DocumentId` (mesma regra para cada)

#### `generate()`
- [ ] Retorna string que casa com regex de UUID v4.
- [ ] Duas chamadas consecutivas retornam valores distintos (sanidade).

#### `rehydrate(raw: string)`
- [ ] UUID v4 válido (ex.: `'7f3a1234-5678-4abc-9def-fedcba987654'`) → `Ok(...)`.
- [ ] String vazia → `Err('<xxx>-id-invalid')`.
- [ ] String não-UUID (ex.: `'abc'`, `'12345'`) → `Err`.
- [ ] UUID v1 (versão errada — ex.: `'123e4567-e89b-12d3-a456-426614174000'`) → `Err`.
- [ ] UUID com case maiúsculo aceito (regex é case-insensitive).

### Tipagem (compile-time)

- [ ] `string as ContractId` falha (sem brand).
- [ ] `ContractId` produzido só via `ContractId.generate()` ou `ContractId.rehydrate(...).value` em ramo Ok.
- [ ] `function f(id: ContractId)` rejeita um `AmendmentId` passado direto.

## Referências

- [`src/shared/id.ts`](../../../../src/shared/id.ts) — `newUuid()` (de `node:crypto.randomUUID`), `isUuidV4()` (regex case-insensitive).
- [`.claude/skills/ts-domain-modeler/references/ts-branded-types.md`](../../skills/ts-domain-modeler/references/ts-branded-types.md).
- [`.claude/skills/ts-domain-modeler/references/ts-smart-constructors.md`](../../skills/ts-domain-modeler/references/ts-smart-constructors.md).
- [Ticket anterior — CTR-VO-MONEY](../CTR-VO-MONEY/STATE.md) — padrão de smart constructor já aplicado.
