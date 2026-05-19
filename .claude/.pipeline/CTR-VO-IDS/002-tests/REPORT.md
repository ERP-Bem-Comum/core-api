# W0 — RED — Ticket CTR-VO-IDS

**Skill:** ts-domain-modeler (modo teste)
**Data:** 2026-05-14
**Status:** ✅ RED confirmado

---

## Arquivos criados

- `tests/modules/contracts/domain/shared/ids.test.ts` (84 linhas, 24 testes em 6 suítes — 3 IDs × 2 suítes cada)

---

## Estratégia: helper compartilhado `runIdNamespaceSuite`

Os 3 IDs têm regra **idêntica**. Em vez de copiar 3 vezes o mesmo bloco de testes, criei um helper genérico que recebe o namespace + código de erro:

```ts
runIdNamespaceSuite('ContractId',  ContractId,  'contract-id-invalid');
runIdNamespaceSuite('AmendmentId', AmendmentId, 'amendment-id-invalid');
runIdNamespaceSuite('DocumentId',  DocumentId,  'document-id-invalid');
```

Vantagens:

- **24 testes com 1 implementação**, sem copy-paste.
- Quando alguma regra mudar (ex.: adicionar suporte a ULID), basta editar o helper.
- Cada chamada produz suítes nomeadas pelo nome real (`ContractId — generate`, etc.) — output do `node --test` continua legível.

Limitação: o helper aceita `string` e narrows via `as unknown as string` em alguns asserts. Isso é por causa do branded type — em runtime o valor é string, mas em compile-time é `ContractId`. Não é code smell em arquivo de teste.

---

## Inventário dos testes (por ID, replicado 3 vezes)

### Suíte 1 — `<Id> — generate` (2 testes)
1. returns a v4 UUID string (regex match)
2. returns distinct values on consecutive calls

### Suíte 2 — `<Id> — rehydrate` (6 testes)
1. accepts a valid v4 UUID
2. accepts uppercase hex digits (case-insensitive)
3. rejects empty string → `'<xxx>-id-invalid'`
4. rejects non-UUID string → `'<xxx>-id-invalid'`
5. rejects UUID v1 (wrong version) → `'<xxx>-id-invalid'`
6. rejects UUID with trailing whitespace → `'<xxx>-id-invalid'`

**Total: 8 testes × 3 IDs = 24 testes.**

(Acrescido aos 20 do `money.test.ts` = 44 testes no total esperados após W1.)

---

## Fixtures usadas

```ts
const VALID_V4       = '7f3a1234-5678-4abc-9def-fedcba987654';
const VALID_V4_UPPER = '7F3A1234-5678-4ABC-9DEF-FEDCBA987654';
const V1_UUID        = '123e4567-e89b-12d3-a456-426614174000'; // versão 1 (não 4)
```

- `VALID_V4` tem `4` no início do 3º bloco (versão) e `9` no início do 4º bloco (variant `8/9/a/b`). Valida.
- `V1_UUID` tem `1` no início do 3º bloco — versão 1, rejeitado pela regex `4[0-9a-f]{3}` em `isUuidV4`.

---

## Confirmação de RED

```
pnpm typecheck
→ tests/modules/contracts/domain/shared/ids.test.ts(9,8): error TS2307:
  Cannot find module '#src/modules/contracts/domain/shared/ids.ts'

pnpm test
→ tests 21, pass 20, fail 1
  (os 20 são do money.test.ts — continuam verdes; o 1 fail é ids.test.ts não carregando)
```

✅ **W0 RED confirmado.** Os testes do CTR-VO-MONEY anterior continuam passando (não regredimos).

---

## Decisões pré-W1 (registradas para o implementador)

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D1 | Cada ID é `Brand<string, '<Name>'>` | Tipos nominais distintos compile-time. |
| D2 | API uniforme: `<Id> = { generate, rehydrate }` | Bate com pattern do `Money` (smart constructor + namespace de funções). |
| D3 | `generate(): <Id>` usa `newUuid()` do `src/shared/id.ts` e faz cast direto | `newUuid` retorna UUID v4 sintaticamente válido por construção. |
| D4 | `rehydrate(raw): Result<<Id>, '<xxx>-id-invalid'>` valida via `isUuidV4` | Erro tipado individual por tipo (não union compartilhada). |
| D5 | Sem factory `createIdNamespace` no código de produção | Repetição de 3 namespaces (~22 linhas) é mais clara que abstração genérica. (Diferente dos testes, onde DRY ganha.) |

---

## Próximo passo

W1 — implementar `src/modules/contracts/domain/shared/ids.ts` aplicando D1–D5. Todos os 24 testes devem passar (e os 20 do Money continuar verdes).
