# W2 — REVIEW — CTR-DOMAIN-STATE-MACHINE-CONTRACT

> **Veredito:** APPROVED
> **Skill:** code-reviewer
> **Data:** 2026-05-20T00:00Z
> **Round:** 1

---

## Sumário

- Arquivos auditados: 9 (6 `src/` + 3 `tests/` sanidade).
- Issues encontradas: 2 (0 críticas, 0 médias, 2 baixas — cosméticas, não bloqueiam).
- Veredito: **APPROVED** — nenhuma violação de regra normativa identificada.

---

## Issues por arquivo

### Baixas (cosmética / clareza — não bloqueiam)

#### `src/modules/contracts/application/use-cases/homologate-amendment.ts:118` + `:127` — step 7 duplicado nos comentários de sequência

**Categoria:** G — Naming/clareza.
**Problema:** Os comentários de passo seguem a numeração `// 1.` … `// 6.` … e depois dois `// 7.` consecutivos (linha 118: "7. Translate to ContractAdjustment" e linha 127: "7. Persist amendment first, then contract"). O segundo deveria ser `// 8.` (colisão: já existe um `// 8.` correto em linha 134).
**Impacto:** Nenhum — puramente cosmético; o código está funcionalmente correto e o lint passa.
**Fix sugerido:** renumerar o comentário da linha 127 para `// 8. Persist amendment first, then contract` e o da linha 134 para `// 9. Publish events in order`.

---

#### `src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts:93–98` — `homologatedIds` como array mutável com `.push()` dentro de adapter

**Categoria:** A (regra de domínio puro) vs D (adapters).
**Esclarecimento:** A regra "zero `.push`" se aplica ao `domain/`. O mapper está em `adapters/persistence/`, portanto `.push()` é permitido pela hierarquia do CLAUDE.md. Registrado apenas para clareza, não é violação.
**Conclusão:** Padrão consistente com `amendment.mapper.ts` (mesmo padrão, aprovado em ticket anterior). Sem necessidade de mudança.

---

## Verificações dos DON'Ts (grep positivos = zero ocorrências)

| Regra | Grep executado | Resultado |
| :--- | :--- | :--- |
| DON'T D§19 — `assertActive` removido | `grep assertActive src/` | 0 ocorrências de código executável (apenas comentários de documentação justificando a remoção) |
| DON'T D§20 — sem shotgun `if (status !== 'Active')` em business code | `grep "status !== 'Active'" src/` | 1 ocorrência apenas em `cli/formatters/contract.ts:22` — legítima (formatter CLI) |
| DON'T D§23 — sem naming imperativo `validateActive`/`assertActive` | `grep -E "validateActive|assertActive" src/` | 0 ocorrências de código executável |
| DON'T C§32 — sem `default: throw` nos switches | `grep "default.*throw" src/modules/contracts/` | 0 ocorrências |
| Regra absoluta — zero `throw` em domain/ | `grep throw src/modules/contracts/domain/` | 0 ocorrências de código executável (apenas comentário "Sem ramo `default` com `throw`") |
| Zero `class` em domain/ | `grep "\bclass\b" src/modules/contracts/domain/` | 0 ocorrências |
| Zero `this` em domain/ | `grep "\bthis\b" src/modules/contracts/domain/contract/` | 0 ocorrências |
| Zero `any` em domain/ | `grep "\bany\b" src/modules/contracts/domain/contract/` | 0 ocorrências |
| Zero `extends Error` em domain/ | `grep "extends Error" src/modules/contracts/domain/` | 0 ocorrências |
| ESM — todos imports com `.ts` | Loop sobre os 6 arquivos auditados | Todos corretos |
| `import type` em imports de tipo | Inspeção de todos os arquivos auditados | Todos usam `import type {X}` ou `import { type X }` corretamente |

---

## Verificações dos DOs

| Regra | Evidência |
| :--- | :--- |
| DO D§20 — tipos refinados por estado | `types.ts` exporta `ActiveContract`, `ExpiredContract`, `TerminatedContract` e `Contract` (union discriminada) |
| DO D§21 — `parseActive` em vez de `assertActive` | `contract.ts:95–100` define `parseActive(contract: ContractEntity): Result<ActiveContract, ContractNotActive>` |
| DO C§29 — `endedAt` ausente em `ActiveContract`, obrigatório em Expired/Terminated | `ActiveContract` = `ContractCore & { status: 'Active' }` sem `endedAt`; `ExpiredContract` e `TerminatedContract` têm `endedAt: Date` obrigatório |
| DO D§20 — transições com assinatura refinada (CA3) | `expire(c: ActiveContract)`, `terminate(c: ActiveContract)`, `applyHomologatedAdjustment(c: ActiveContract)` — todas assinadas sobre subtipo |
| Mapper switch exaustivo sem `default: throw` (DO C§32) | Switch sobre `'Active' | 'Expired' | 'Terminated'` cobre os 3 casos; após fechamento, comentário documenta a exhaustividade; typecheck zero erros confirma |
| Padrão D — variant `contract-mapper-invalid-ended-at` no `ContractMapperError` | `mapper.ts:22–28` exporta a union `ContractMapperError` com o novo variant string literal |
| Use case borda — `parseActive` antes de `applyHomologatedAdjustment` | `homologate-amendment.ts:115–116` chama `Contract.parseActive(contract)` e só passa `activeContract.value` para `applyHomologatedAdjustment` |
| CLI formatter narrow via discriminador | `formatters/contract.ts:22` usa `if (c.status !== 'Active')` antes de acessar `c.endedAt` |
| `isValidContract` em `state.ts` reflete novo shape | `state.ts:140–144` distingue Active (sem `endedAt`) de Expired/Terminated (com `endedAt: Date`); aceita `null` por compatibilidade com state files pré-refactor (comentado) |
| `updateContract` genérico preserva subtipo (D1) | `types.ts:111` — `<T extends Contract>(prev: T, patch: ContractUpdate): T`; `ContractUpdate` exclui `status` e `endedAt` via `Omit<ContractCore, ContractImmutableField>` |
| Gates W1 verdes | `tsc --noEmit` ✅, `pnpm test` 607/594/0 ✅, `pnpm run lint` ✅ (confirmados nesta wave também) |

---

## Cobertura dos CAs (sanidade)

| CA | Atendido? | Evidência observada em W2 |
| :--- | :---: | :--- |
| CA1 — Tipos refinados emitidos (compile-time) | ✅ | `types.ts` exporta os 3 subtipos + union + `ContractStatus` derivado. `endedAt` ausente em `ActiveContract`. typecheck ✅ |
| CA2 — `parseActive` substitui `assertActive` | ✅ | `grep assertActive src/` retorna zero hits executáveis. `Contract.parseActive` definida em `contract.ts:95–100` |
| CA3 — Transições com assinatura refinada | ✅ | `expire`, `terminate`, `applyHomologatedAdjustment` recebem `ActiveContract`. 5 sites `@ts-expect-error` em `contract.test.ts` provam rejeição estática |
| CA4 — Use cases consomem refinement na borda | ✅ | `homologate-amendment.ts:115–116` chama `parseActive` antes de `applyHomologatedAdjustment` |
| CA5 — Mappers retornam union; preservam subtipo no round-trip | ✅ | `contractFromRow` tem switch exaustivo por `row.status`; rejeita `Active+endedAt` e `Expired/Terminated+null` com `contract-mapper-invalid-ended-at`. 8 testes em `contract.mapper.test.ts` cobrem os 3 shapes válidos e 3 impossíveis |
| CA6 — Cobertura ≥ baseline + 3 novos mínimos | ✅ | Baseline 595 → atual 607 (+12 líquido). Mínimo de 3 novos amplamente superado (parseActive ×3, CA1 runtime ×3, CA3 estática ×5, mapper ×8) |
| CA7 — Gates W3 verdes | ✅ (pré-W3) | Confirmados nesta wave: typecheck ✅, lint ✅, test 607/594/0 ✅; format:check tem aviso em `README.md` pré-existente fora do escopo |

---

## O que está bem feito

- **Refinement sem casting manual:** `ok(contract)` dentro de `parseActive` é narrowing automático via guarda `contract.status === 'Active'` — sem `as ActiveContract` forçado. Idiomático e seguro.
- **`updateContract` genérico `<T extends Contract>`:** decisão D1 é elegante — preserva subtipo refinado sem criar overloads ou casts, e o `ContractUpdate = Partial<Omit<ContractCore, ...>>` bloqueia staticamente qualquer tentativa de mudar `status`/`endedAt` pelo helper.
- **Mapper switch sem `default: throw`:** exatamente o padrão DO C§32. O `isStatus()` guard antes do switch estreita o tipo e o typecheck (zero erros) confirma que TS entende a exhaustividade mesmo sem `default`.
- **Documentação JSDoc nos tipos refinados:** os comentários em `types.ts` citam explicitamente os DOs/DON'Ts da entrevista canônica com os números de linha — rastreabilidade total para auditorias futuras.
- **Compatibilidade retroativa no `state.ts`:** aceitar `endedAt: null` (além de ausente) para state files gravados antes do refactor é uma decisão pragmática bem comentada — não compromete a invariante do domínio porque o validador só precisa aceitar o estado histórico de leitura.
- **Testes CA3 estáticos com `@ts-expect-error`:** 5 sites em `contract.test.ts` provam que o compilador rejeita tipos não-Active nas transições — cobertura de correção em compile time, não apenas em runtime.

---

## Próximo passo

W3 QUALITY (`ts-quality-checker`): rodar `pnpm run typecheck`, `pnpm run format:check`, `pnpm test` e `pnpm run lint` formalmente e emitir `005-quality/REPORT.md`.
