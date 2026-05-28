# W2 — REVIEW — CTR-DOMAIN-STATE-MACHINE-AMENDMENT

> **Veredito:** APPROVED
> **Skill:** code-reviewer
> **Data:** 2026-05-20T00:00Z
> **Round:** 1

---

## Sumário

- Arquivos auditados: 10 (7 `src/` + 3 `tests/` sanidade).
- Issues encontradas: 2 (0 críticas, 0 médias, 2 baixas — cosméticas, não bloqueiam).
- Veredito: **APPROVED** — nenhuma violação de regra normativa identificada.

---

## Issues por arquivo

### Baixas (cosmética / clareza — não bloqueiam)

#### `src/modules/contracts/domain/amendment/amendment.ts:179` — `occurredAt` usa `createdAt` do aditivo

**Categoria:** G — Clareza semântica.
**Problema:** O evento `AmendmentDocumentAttached` tem `occurredAt: amendment.createdAt` — usa a data de criação do aditivo como timestamp do evento, não a data em que o documento foi efetivamente anexado. Semanticamente, um documento pode ser anexado dias após a criação.
**Esclarecimento:** Esse padrão era **pré-existente** ao diff deste ticket (confirmado via `git show HEAD:...`). O `000-request.md` não listou nenhuma mudança de assinatura em `attachSignedDocument`. Não é regressão introduzida por esta W1.
**Recomendação futura:** Ticket separado para adicionar parâmetro `at: Date` em `attachSignedDocument` (análogo ao `at` já presente em `homologate`). Fora do escopo de `CTR-DOMAIN-STATE-MACHINE-AMENDMENT`.

---

#### `tests/modules/contracts/domain/amendment/amendment.test.ts:451` — `updateAmendment` com `signedDocumentRef` no patch

**Categoria:** H — Cobertura de teste / clareza.
**Problema:** O teste `'preserva discriminated union — kind e variant não mudam'` passa `{ signedDocumentRef: DocumentId.generate() }` para `updateAmendment`. O tipo `AmendmentUpdate = Readonly<Record<never, never>>` é estruturalmente `{}` em TypeScript — aceita qualquer objeto sem excess property check em atribuições (limitation conhecida do sistema de tipos). O typecheck passa (exit 0), mas o teste demonstra um comportamento que **não deveria existir em produção**: `updateAmendment` só deveria aceitar patch vazio `{}`.
**Impacto:** Baixo — o compilador confirma que o objeto retornado é `PendingWithoutDocumentAmendment` (o cast `as T` preserva o subtipo), o que impede o campo de "vazar" para o tipo público. É uma limitação de `Record<never, never>` não usar excess property check fora de object literals diretos com tipo explícito.
**Recomendação futura:** O test poderia usar `@ts-expect-error` para provar que `{ status: 'Homologated' }` é barrado (já existente no bloco CA3), porém demonstrar que `signedDocumentRef` seria rejeitado exigiria um tipo mais restritivo que `Record<never, never>` — YAGNI para o escopo atual.

---

## Verificações dos DON'Ts (grep positivos = zero ocorrências executáveis)

| Regra | Grep executado | Resultado |
| :--- | :--- | :--- |
| DON'T D§19 — `assertPending` removido | `grep assertPending src/` | 0 ocorrências executáveis (apenas comentários de documentação justificando a remoção) |
| DON'T D§23 — naming imperativo `validatePending`/`assertPending` | `grep -E "validatePending\|assertPending" src/` | 0 ocorrências executáveis |
| DON'T D§20 — shotgun `status !== 'Pending'` em business code | `grep "status !== 'Pending'" src/` | 2 ocorrências — ambas **dentro dos refinement constructors** `parsePendingWithoutDocument` e `parsePendingWithDocument` em `amendment.ts:41,56`; são o mecanismo correto de narrowing centralizado (não shotgun) |
| DON'T C§26 — cross-product 4×3=12 tipos | `grep -E "PendingWithoutDocument(Addition\|Suppression\|TermChange\|Misc)"` | 0 ocorrências |
| DON'T C§32 — `default: throw` nos switches | `grep "default.*throw" src/modules/contracts/` | 0 ocorrências |
| Regra absoluta — zero `throw` em `domain/` | `grep throw src/modules/contracts/domain/` | 0 ocorrências executáveis |
| Zero `class` em `domain/` | `grep "\bclass\b" src/modules/contracts/domain/` | 0 ocorrências |
| Zero `this` em `domain/` | `grep "\bthis\b" src/modules/contracts/domain/` | 0 ocorrências |
| Zero `any` em `domain/` | `grep "\bany\b" src/modules/contracts/domain/` | 0 ocorrências |
| Zero `extends Error` | `grep "extends Error" src/modules/contracts/` | 0 ocorrências |
| Zero `as unknown as` em `domain/` | `grep "as unknown as" src/modules/contracts/domain/` | 0 ocorrências executáveis (apenas comentário em linha 128 de `types.ts` e linha 131 de `amendment.ts` — textos explicativos de por que o cast é estreito, não código) |
| ESM — todos os imports terminam com `.ts` | Inspeção dos 7 arquivos `src/` auditados | Todos corretos |
| `import type` em imports de tipo | Inspeção de todos os arquivos auditados | Todos usam `import type { X }` ou `import { type X }` corretamente |

---

## Verificações dos DOs

| Regra | Evidência |
| :--- | :--- |
| DO D§20 — 3 tipos refinados por estado | `types.ts` exporta `PendingWithoutDocumentAmendment`, `PendingWithDocumentAmendment`, `HomologatedAmendment` e `Amendment` (union discriminada). Sem `T \| null` em nenhum shape final. |
| DO D§21 — `parsePending*` em vez de `assertPending` | `amendment.ts:24–59` define os 3 refinement constructors com naming declarativo. `assertPending` foi **completamente removido** — grep retorna zero hits. |
| DO C§28 — aninhamento status × kind (não cross-product) | `AmendmentVariant` (4 kinds) está em `AmendmentCore` — eixo independente do status. Os 3 subtipos refinados herdam o eixo integralmente via `& AmendmentVariant`. Nenhum tipo `PendingWithoutDocumentAddition` etc. existe. |
| DO C§29 — estados eliminam null-as-state | `PendingWithoutDocumentAmendment` tem `signedDocumentRef: null`, `homologatedAt: null`, `homologatedBy: null` obrigatórios. `PendingWithDocumentAmendment` tem `signedDocumentRef: DocumentId`. `HomologatedAmendment` tem os 3 campos terminais obrigatórios como tipos não-null. |
| DO C§32 — exhaustive switch sem `default: throw` | Switches em `amendment.ts:80–92` (validateVariantInput) e `amendment.mapper.ts:100–118` (variantFromRow) + `154–208` (toDomain) usam `default: { const _exhaustive: never = x; return _exhaustive; }`. Typecheck zero erros confirma exhaustividade. |
| Mapper com erro tagged `amendment-mapper-impossible-shape` | `amendment.mapper.ts:35` exporta `'amendment-mapper-impossible-shape'` em `AmendmentMapperError`. Switch em `status` × `signedDocumentRef` com 3 checks de shape impossível (Pending + homologatedAt/By; Homologated + qualquer campo null). |
| Use cases consomem refinement na borda (CA5) | `attach-signed-document.ts:56` chama `Amendment.parsePendingWithoutDocument(load.value)` antes de `attachSignedDocument`. `homologate-amendment.ts:111` chama `Amendment.parsePendingWithDocument(amendment)` antes de `homologate`. Runtime check `signedDocumentRef === null` **removido** de `homologate-amendment.ts`. |
| `create-amendment.ts` tipa output como `PendingWithoutDocumentAmendment` | `CreateAmendmentOutput.amendment: PendingWithoutDocumentAmendment` (linha 51). |
| `cli/state.ts:isValidAmendment` revalida consistência por status | Linhas 177–191 distinguem `Pending` (signedDocRef pode ser null ou UUID; homologatedAt/By **devem** ser null) de `Homologated` (todos os 3 campos terminais obrigatórios). |
| `AmendmentUpdate = Record<never, never>` (D5) | Tipo vazio estrito exportado em `types.ts:114`. JSDoc documenta a decisão de design com referência ao ticket. |
| Gates W1 verdes (confirmados em W2) | `tsc --noEmit` ✅ exit 0 · `pnpm run lint` ✅ exit 0 · `pnpm test` 630/617/0 ✅ · `pnpm run format:check` ⚠️ apenas `README.md` pré-existente fora do escopo. |

---

## Cobertura dos 8 CAs (sanidade)

| CA | Atendido? | Evidência observada em W2 |
| :--- | :---: | :--- |
| CA1 — 3 tipos refinados emitidos | ✅ | `types.ts` exporta os 3 subtipos + union + `AmendmentStatus`/`AmendmentKind` derivados. Sem `T \| null` em nenhum shape. typecheck ✅ |
| CA2 — `parsePending*` substitui `assertPending` | ✅ | `grep assertPending src/` retorna zero hits executáveis. 3 refinement constructors definidos em `amendment.ts:24–59`. |
| CA3 — Transições com assinatura refinada + rejeição estática | ✅ | `attachSignedDocument(a: PendingWithoutDocumentAmendment)`, `homologate(a: PendingWithDocumentAmendment)`. 2 sites `@ts-expect-error` em `amendment.test.ts:637,643` provam rejeição estática de tipos errados. |
| CA4 — Aninhamento status × kind (não cross-product) | ✅ | `AmendmentVariant` em `AmendmentCore`. 3 subtipos (não 12). `grep -E "PendingWithoutDocument(Addition\|Suppression\|TermChange\|Misc)"` = zero hits. |
| CA5 — Use cases consomem refinement na borda | ✅ | `attach-signed-document.ts:56` + `homologate-amendment.ts:111` chamam `parsePendingWith*` antes das transições. |
| CA6 — Mappers retornam union; shape impossível = erro tagged | ✅ | Switch em `status` × `signedDocumentRef` com 3 guards de shape impossível → `'amendment-mapper-impossible-shape'`. 5 testes em `amendment.mapper.test.ts` cobrem os shapes impossíveis. |
| CA7 — Cobertura ≥ baseline + 5 novos | ✅ | Baseline 607 → atual 630 (+23 líquido). Testes `parsePending*` (9), discriminador composto (3), `@ts-expect-error` (2), mapper (8) = +22 mínimo de novos. |
| CA8 — Gates W3 verdes | ✅ (pré-W3) | Confirmados nesta wave: typecheck ✅, lint ✅, test 630/617/0 ✅; format:check tem aviso em `README.md` pré-existente fora do escopo. |

---

## O que está bem feito

- **Aninhamento sem cross-product:** a decisão de manter `AmendmentVariant` em `AmendmentCore` (e não duplicar em cada subtipo de status) é a implementação canônica de DO C§28. Os 4 kinds fluem transversalmente pelos 3 estados sem precisar de 12 tipos.
- **Refinement constructors sem `assertPending`:** `parsePending`, `parsePendingWithoutDocument` e `parsePendingWithDocument` são naming declarativo que reflete o estilo "parse, don't validate". A remoção de `assertPending` foi completa — zero rastros executáveis.
- **Transições sem runtime checks desnecessários:** `attachSignedDocument` não verifica status nem `signedDocumentRef` em runtime — a assinatura `PendingWithoutDocumentAmendment` garante ambos. `homologate` não verifica `signedDocumentRef === null` — `PendingWithDocumentAmendment` o garante. Seguem exatamente DO D§20.
- **Casts estreitos documentados:** em `amendment.ts` e `types.ts`, os casts `as PendingWithoutDocumentAmendment` / `as PendingWithDocumentAmendment` / `as HomologatedAmendment` têm JSDoc explicando por que o spread sobre discriminated union perde narrowing e por que o cast é estreito (não `as unknown as`). Auditável.
- **Mapper sem cross-product no código:** `variantFromRow` extrai o eixo kind separadamente antes do switch de status — exatamente o cuidado pedido no ponto 3 do "Risco / pontos de atenção" do `000-request.md`.
- **`cli/state.ts:isValidAmendment` reflete state machine:** a validação distingue Pending (terminais null) de Homologated (todos presentes), paralela ao que o mapper faz — consistência cross-layer.
- **Fixtures sem cast inseguro:** `buildPendingAmendmentWithoutDoc`, `buildPendingAmendmentWithDoc` e `buildHomologatedAmendmentRefined` em `fixtures.ts` retornam os subtipos refinados nativamente sem `as unknown as` — os tipos fluem via assinaturas das funções de domínio.
- **`@ts-expect-error` CA3:** 2 sites em `amendment.test.ts:637,643` provam em compile time que `homologate(PendingWithoutDoc)` e `attachSignedDocument(Homologated)` são erros do compilador — cobertura de correção estática, não apenas runtime.

---

## Próximo passo

W3 QUALITY (`ts-quality-checker`): rodar `pnpm run typecheck`, `pnpm run format:check`, `pnpm test` e `pnpm run lint` formalmente e emitir `005-quality/REPORT.md`.
