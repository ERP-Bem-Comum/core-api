# Code Review — Ticket CTR-AGG-AMENDMENT — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer
**Data:** 2026-05-14
**Escopo revisado:**
- `src/modules/contracts/domain/shared/ids.ts` (+9 linhas: `UserRef`)
- `src/modules/contracts/domain/amendment/types.ts` (50 linhas)
- `src/modules/contracts/domain/amendment/events.ts` (27 linhas)
- `src/modules/contracts/domain/amendment/errors.ts` (11 linhas)
- `src/modules/contracts/domain/amendment/amendment.ts` (187 linhas)
- Testes: coerência verificada

---

## Resumo executivo

Segundo agregado do módulo. Inova com **base + variant intersection** (vs. `Contract` que era entity flat) e introduz **`toContractAdjustment` como tradutor entre agregados** (sem violar isolamento — vive no Amendment, retorna tipo do Contract). **Aprovado para W3**, zero issues bloqueantes.

---

## Checklist aplicado

### A. Regras absolutas do domínio

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Zero `throw` (exceto exhaustive) | ✅ | 4 `throw`s no domínio inteiro, todos em `default` de exhaustive switch (`period.ts:40`, `contract.ts:200`, `amendment.ts:62` e `:179`) |
| Zero `class`/`this`/`any` | ✅ | grep limpo |
| `Readonly<>` em entity | ✅ | `Amendment = Brand<AmendmentBase & AmendmentVariant, ...>` onde ambos são `Readonly<>` |
| Toda função exportada tem return type | ✅ | confirmado |

### B. Smart constructors e Branded types

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Smart constructor retorna `Result<...>` | ✅ | `create`, `attachSignedDocument`, `homologate` |
| `as unknown as AmendmentEntity` apenas após validação | ✅ | 4 ocorrências (linha 86 create, 113 attach, 138 homologate) — todas pós-validação completa |
| Tradutor `toContractAdjustment` puro (sem Result) | ✅ | linhas 148-167; pré-condição implícita documentada |

### C. Discriminated unions e exhaustiveness

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `AmendmentKind` 4 variantes com `kind` literal | ✅ | `types.ts` |
| `AmendmentEvent` 3 variantes com `type` literal | ✅ | `events.ts` |
| 2 switches sobre union com `default: never + throw` | ✅ | `validateVariantInput` e `toContractAdjustment` |
| Sem optional fields entre variantes | ✅ | `Addition`/`Suppression` têm `impactValue`; `TermChange` tem `newEndDate`; `Misc` só `description` (do base) |

### D. Ports & Adapters

N/A — domínio puro.

### E. Modular Monolith

| Item | Status | Evidência |
| :--- | :---: | :--- |
| `amendment/` importa de `shared/` + `contract/types.ts` (vizinhos do mesmo módulo) | ✅ | `amendment.ts:7` importa `ContractAdjustment` de `../contract/types.ts` — **válido**, é cross-aggregate **dentro do mesmo módulo** |

### F. ESM / NodeNext / TypeScript moderno

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Imports `.ts` | ✅ | todos |
| `import type` em type-only imports | ✅ | `events.ts`, `errors.ts`, `types.ts` ao serem importados |
| Sem `enum`/`namespace`/`require` | ✅ | confirmado |
| `tsc --noEmit` zero erros | ✅ | rodado em W1 |

### G. Naming, EN/PT

| Item | Status | Evidência |
| :--- | :---: | :--- |
| Identificadores EN | ✅ | `Amendment`, `Addition`, `Suppression`, `TermChange`, `Misc`, `Pending`, `Homologated`, `attachSignedDocument`, `homologate`, `toContractAdjustment` |
| Erros EN kebab-case | ✅ | 9 códigos com prefixo `amendment-` |
| Tradução PT/EN explícita no `000-request.md` | ✅ | tabela completa |

### H. Tests (coerência)

| Item | Status | Evidência |
| :--- | :---: | :--- |
| AAA explícito | ✅ | builders em camada (`createAddition` → `createPendingWithDoc` → `createHomologated`) |
| Cobertura proporcional | ✅ | 24 testes para 4 comandos + 4 kinds + 9 caminhos de erro + 2 invariantes |
| Sem matchers vagos | ✅ | `assert.equal` exato |

---

## Pontos positivos (explícitos)

1. **`base + variant intersection`** — campos compartilhados ficam top-level (`id`, `contractId`, `status`, `signedDocumentRef`), variantes carregam o que muda. TS narrowing funciona corretamente:
   ```ts
   if (amendment.kind === 'Addition') {
     amendment.impactValue;  // OK, narrowed
     amendment.id;            // OK, base
     // amendment.newEndDate;  // erro compilação
   }
   ```

2. **`toContractAdjustment`** elegantemente isolado — `Amendment` traduz para a linguagem do `Contract` **sem** o Contract conhecer o Amendment. Padrão "Anticorruption-like" interno, com tradução vivendo no lado que produz o evento.

3. **`UserRef` minimal** — `rehydrate`-only, sem `generate`. Reflete corretamente que identidade de usuário **vem de fora** (auth service). Mantém política do shared `id.ts`.

4. **Helpers de validação compostos** (`validateCommonInput`, `validateVariantInput`) — cada um é testável isolado, `create` orquestra. Padrão refinado vs. `Contract.create` (que tinha validações inline).

5. **Builders de teste em camadas** — `createAddition` → `createPendingWithDoc` → `createHomologated`. Cada fixture reutiliza a anterior, garante coerência. Testes downstream começam de estado válido sem boilerplate.

6. **Cada erro tem prefixo `amendment-`** — consistente com `contract-`. Quando logs/UI filtrarem por origem, prefixo agrupa.

7. **`AmendmentEvent.AmendmentDocumentAttached` carrega o `signedDocumentRef`** — caller que escuta o evento pode ir buscar o documento sem precisar refazer query. Evento auto-suficiente.

---

## Notas (🔵 não-bloqueantes)

### Nota 1 — 4 ternários encadeados em `create`

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

**Alternativas consideradas:**
- A (atual): ternários encadeados. TS infere literals via `as const`.
- B: switch + função separada que retorna o objeto. Mais verbose; exige tipo de retorno explícito.
- C: helper `buildVariantFields(input): Pick<...>` separado.

A é compacto e linear de ler como `if/else if/.../else`. Aceitável para 4 variantes. **Mantém.** Se subir para 7+ variantes, refatorar para B/C.

### Nota 2 — `as unknown as AmendmentEntity` × 4

```ts
// amendment.ts:86, 113, 138 e dentro da expression ternária
const amendment = { ... } as unknown as AmendmentEntity;
```

Mesma justificativa que o `Contract`: TS 6 + `verbatimModuleSyntax` + `Brand` symbol exige `as unknown` quando type vem de arquivo separado. Cada cast é **pós-validação**. Padrão estabelecido — documentar no skill `ts-domain-modeler`.

### Nota 3 — Pré-condição implícita em `toContractAdjustment`

```ts
const toContractAdjustment = (amendment: AmendmentEntity): ContractAdjustment => { ... };
```

A pré-condição "Amendment Homologated" **não é enforçada em TS** — `Amendment` em `Pending` também é aceito. O caller (use case `homologateAmendment` em próximo ticket) garantirá em runtime que só chama após homologação bem-sucedida.

**Alternativas consideradas:**
- A (atual): pré-condição implícita, tipo único `Amendment`.
- B: tipo refinado `HomologatedAmendment = Amendment & { status: 'Homologated' }` exigido como parâmetro. Caller faz narrow via `if (a.status === 'Homologated')`.

B é mais "typeful" mas adiciona complexidade. Para um VO de tradução, A é proporcional. Reabrir se virmos bugs de chamada errada.

### Nota 4 — `attachSignedDocument` reutiliza `amendment.createdAt` no event

```ts
const event: AmendmentEvent = {
  type: 'AmendmentDocumentAttached',
  amendmentId: amendment.id,
  signedDocumentRef,
  occurredAt: amendment.createdAt,  // ← reusa
};
```

**Observação:** `occurredAt` no evento de "documento anexado" não é "quando foi anexado", mas sim `createdAt` do amendment. Para auditoria precisa, faria sentido aceitar um `at: Date` parâmetro também (como `homologate`).

**Trade-off:** "quando o documento foi anexado" é informação útil; "createdAt" é só registro do amendment. Padrão atual perde temporalidade fina.

**Sugestão para v2:** `attachSignedDocument(amendment, docId, at: Date): Result<...>` com validação `isValidDate(at)`. Não bloquear este ticket — registrar como melhoria.

### Nota 5 — `AmendmentError` não inclui erros do `Money` ou `Period`

`create` valida `impactValue.cents === 0` mas não revalida `Money` (já vem construído). Se um teste futuro passar Money construído via cast unsafe, falha de runtime. Defendido por:
- `Money` smart constructor é único produtor.
- `as Money` direto é proibido por convenção (visto no review do Money).

Aceito. **Sem ação.**

---

## O que ficou particularmente bom

- **`AmendmentEvent.AmendmentHomologated` carrega `homologatedBy`** — auditoria preserva quem homologou. R2 do handbook fortalecida no evento.
- **Builders de teste em pirâmide** — modelo replicável para próximos agregados (estado inicial → transição → estado final, cada um construível independentemente).
- **`toContractAdjustment` retorna `ContractAdjustment`** (importado de `../contract/types.ts`) — primeiro cross-aggregate import. Validado: **mesmo módulo**, **tipos públicos do agregado vizinho**. Cumpre regra de Modular Monolith (importar de outro **módulo** seria proibido; mesmo módulo é OK).

---

## Próximo passo

W3 — `ts-quality-checker`. Esperado: ALL GREEN com 127 testes.
