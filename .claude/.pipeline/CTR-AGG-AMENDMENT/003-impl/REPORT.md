# W1 — GREEN — Ticket CTR-AGG-AMENDMENT

**Skill:** ts-domain-modeler (modo implementação)
**Data:** 2026-05-14
**Status:** ✅ GREEN — 127/127 testes passando, `tsc --noEmit` zero erros

---

## Arquivos criados / editados

| Arquivo | Linhas | Conteúdo |
| :--- | ---: | :--- |
| `src/modules/contracts/domain/shared/ids.ts` | +9 | **Editado** — adicionado `UserRef` (branded + `rehydrate`-only) |
| `src/modules/contracts/domain/amendment/types.ts` | 50 | `Amendment` (base + variant intersection), `AmendmentStatus`, `AmendmentKind`, `CreateAmendmentInput` |
| `src/modules/contracts/domain/amendment/events.ts` | 27 | `AmendmentEvent` (DU 3 variantes) |
| `src/modules/contracts/domain/amendment/errors.ts` | 11 | `AmendmentError` (string literal union, 9 codes) |
| `src/modules/contracts/domain/amendment/amendment.ts` | 187 | 4 comandos + helpers privados + `toContractAdjustment` |
| **Total novo** | **275** | |

---

## Decisões aplicadas

| # | Decisão | Implementação |
| :-- | :--- | :--- |
| D1 | `Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>` | `types.ts:33` — intersection limpa, campos compartilhados top-level |
| D2 | `AmendmentKind: 'Addition' \| 'Suppression' \| 'TermChange' \| 'Misc'` | `types.ts:11` |
| D3 | `AmendmentStatus: 'Pending' \| 'Homologated'` | `types.ts:9` |
| D4 | 4 comandos + `toContractAdjustment` | `amendment.ts` — todos via factory functions puras |
| D5 | `UserRef` em `ids.ts` com só `rehydrate` | `ids.ts:30-33` |
| D6 | `signedDocumentRef` top-level (não no DU) | `types.ts:21` no base |
| D7 | `homologatedAt`/`homologatedBy` `null` até homologar | `types.ts:22-23` no base |
| D8 | `impactValue: Money` sempre positivo | Garantido pelo VO `Money` |
| D9 | Zero rejeitado em Addition/Suppression | `amendment.ts:50-52` |
| D10 | `{ amendment, event }` retornado | `CommandOutput` em `amendment.ts:15` |
| D11 | `toContractAdjustment` puro (sem Result) | `amendment.ts:148-167` |

---

## Padrões emergentes

### Helper de validação composta (refinamento do CTR-AGG-CONTRACT)

```ts
const validateCommonInput = (input): Result<true, AmendmentError> => { ... };
const validateVariantInput = (input): Result<true, AmendmentError> => {
  switch (input.kind) { ... }  // discriminated switch sobre o input
};

const create = (input) => {
  const common = validateCommonInput(input);
  if (!common.ok) return common;
  const variant = validateVariantInput(input);
  if (!variant.ok) return variant;
  // ... construção
};
```

**Por que dois helpers?** Validações comuns (number, description, createdAt) vivem em uma função; validações de variante (impactValue zero, newEndDate invalid) em outra. Cada uma testável isoladamente; `create` orquestra.

### Construção de Amendment com switch sobre input

```ts
const amendment = (
  input.kind === 'Addition'
    ? { ...base, kind: 'Addition' as const, impactValue: input.impactValue }
    : input.kind === 'Suppression'
      ? { ...base, kind: 'Suppression' as const, impactValue: input.impactValue }
      : input.kind === 'TermChange'
        ? { ...base, kind: 'TermChange' as const, newEndDate: input.newEndDate }
        : { ...base, kind: 'Misc' as const }
) as unknown as AmendmentEntity;
```

**Por que ternários encadeados em vez de switch?** TS infere literal types corretamente em ternários encadeados. Switch + return precisaria de função separada (overkill aqui). Trade-off: 4 ternários encadeados leem como `if/else if/else if/else`, aceitável para 4 variantes.

### `toContractAdjustment` como API pública do Amendment

```ts
const toContractAdjustment = (amendment): ContractAdjustment => {
  switch (amendment.kind) {
    case 'Addition':    return { kind: 'ValueIncrease',    amount: amendment.impactValue, amendmentId };
    case 'Suppression': return { kind: 'ValueDecrease',    amount: amendment.impactValue, amendmentId };
    case 'TermChange':  return { kind: 'PeriodExtension',  newEnd: amendment.newEndDate,  amendmentId };
    case 'Misc':        return { kind: 'Acknowledgment',   amendmentId };
    default: { const _: never = amendment; throw new Error(`unreachable: ${_}`); }
  }
};
```

Função pura — **não pode falhar**. Pré-condição implícita (cliente deve garantir Amendment homologado antes de chamar) — não enforçada em TS, mas o use case (próximo ticket) garantirá em runtime.

---

## Verificação de saída

### `pnpm typecheck`
```
> tsc --noEmit
(silencioso — zero erros)
```

### `pnpm test`
```
ℹ tests 127
ℹ suites 39
ℹ pass 127
ℹ fail 0
ℹ duration_ms 181.074375
```

✅ **127/127** — sem regressão dos 99 anteriores, 28 novos verdes (24 Amendment + 4 UserRef).

**Breakdown do Amendment:**
- create — Addition (2/2)
- create — Suppression (2/2)
- create — TermChange (2/2)
- create — Misc (1/1)
- create — common validations (4/4)
- attachSignedDocument (3/3)
- homologate (4/4)
- toContractAdjustment (4/4)
- invariants (2/2)

**Breakdown do UserRef:** 4/4.

---

## Aderência às regras transversais

- ✅ **2 `throw`s no domínio Amendment** (exhaustive switch em `validateVariantInput` e `toContractAdjustment`) — justificados.
- ✅ Zero `class`, `this`, `extends`.
- ✅ Zero `any`. Casts `as unknown as AmendmentEntity` justificados (TS 6 + base+variant intersection separada).
- ✅ `Readonly<>` em base + variant.
- ✅ `import type` em imports puramente de tipo.
- ✅ Imports terminam em `.ts`.
- ✅ Identificadores EN.

---

## Total `throw`s no domínio agora

```
period.ts:40                       — assertNever em Period.contains
contract.ts:200                    — assertNever em applyHomologatedAdjustment
amendment.ts:63 (validateVariantInput)  — assertNever em validateVariantInput
amendment.ts:165 (toContractAdjustment) — assertNever em toContractAdjustment
```

**4 ocorrências total, todas em default de exhaustive switch.** Política seguida estritamente.

---

## Próximo passo

W2 — `code-reviewer` audita os 5 arquivos novos. Atenção:
- Padrão **base + variant intersection** novo (não vimos no Contract — lá foi entity simples).
- Ternários encadeados em `create` (vs. switch alternativo).
- Pré-condição implícita em `toContractAdjustment` (Amendment Homologated).
