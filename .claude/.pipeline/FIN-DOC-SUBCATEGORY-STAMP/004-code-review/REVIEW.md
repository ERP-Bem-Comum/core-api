# FIN-DOC-SUBCATEGORY-STAMP — W2 (REVIEW, read-only)

> S1 do épico Taxonomia Planejável Unificada (#502) · skill `code-reviewer` · 2026-07-21 · Round 1.
> Auditoria read-only do W1 (GREEN). `src/`/`tests/` **não** tocados nesta wave.

## Veredicto: **APPROVED**

Nenhum achado **Blocker** ou **Major**. O espelhamento do `subcategoryRef` está **completo** em todos
os pontos exigidos; a migration é estritamente aditiva; o VO respeita ADR-0014 (ref opaco); back-compat
preservada. Uma observação informativa (não-bloqueante, fora de escopo confirmado) registrada abaixo.

### Gates reconferidos no fio principal (não só reportados)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ zero erros |
| Lint | `pnpm run lint` | ✅ zero erros |
| Test | `pnpm test` | ✅ **4258 tests · 4239 pass · 0 fail · 19 skipped** |

Bate com o W1 (4258/4239/0/19). Regressão zero (CA8): 4239 − 12 alvos = 4227 = baseline W0.

---

## Foco 1 — As edições de teste do W1 (armadilha: W1 mexeu em teste)

Três edições de teste, **todas legítimas** (manutenção de contrato / correção de fixture impossível),
nenhuma enfraquece asserção:

**(a) Typo de UUID no fixture — GENUÍNO.** `subcategory-ref-stamp.http.test.ts:43`: `5ubca7e9-…`
tinha um **`u` não-hexadecimal**. Com ele, `z.uuid()`/`isUuidV4` rejeitavam → o POST devolvia 400 →
CA2/CA3 eram **insatisfazíveis por qualquer implementação** (nunca chegava ao 201/round-trip). Corrigido
para `5abca7e9-0000-4000-8000-000000000001`, UUID v4 válido (3º grupo `4xxx`, 4º grupo `8xxx`). As
asserções de round-trip (`detail.subcategoryRef === SUBCATEGORY`) permanecem **idênticas** — só o fixture
passou a ser um valor que o contrato de ref opaco (validação de formato v4, CA5/CA7) aceita. Correção de
dado de teste, não afrouxamento.

**(b) Lint `array-type` — MECÂNICO.** No bloco de integração do novo `*.drizzle-mysql.test.ts`
(`Array<{…}>` → `{…}[]`). Introduzido no W0 (gate era só `pnpm test`), pego agora no `lint`. Sem efeito
sobre asserção.

**(c) `strict-response-schemas.test.ts:99` (`subcategoryRef: null` no fixture) — MANUTENÇÃO DE CONTRATO,
não afrouxamento.** O `documentResponseSchema` é `.strict()` (#384) e ganhou `subcategoryRef:
z.string().nullable()` — chave **obrigatória** (nullable ≠ optional). Sem incluí-la no fixture, o teste
`.strict()` **falharia** (o objeto validado exige a chave presente). O `null` no fixture apenas mantém o
fixture em dia com o schema que passou a ter mais um campo. É o comportamento correto: o teste continua
provando que o schema rejeita chaves extras e exige as declaradas. **Reforço**, não enfraquecimento.

---

## Foco 2 — Completude do espelhamento (armadilha central do W0) — COMPLETO

`subcategoryRef` foi propagado em **todos** os pontos onde `budgetPlanRef`/`categoryRef` aparecem.
Verificado ponto a ponto no diff **e** corroborado pelo typecheck: como `DocumentCore.subcategoryRef` e
`DraftDocument.subcategoryRef` são campos **obrigatórios** (`SubcategoryRef | null`, não-opcionais),
qualquer sítio de construção que os omitisse **quebraria o `tsc`**. Typecheck verde ⇒ espelhamento
type-completo. **Nenhum ponto faltante.**

| Camada | Pontos exigidos | Status |
| :-- | :-- | :-- |
| `document.mapper.ts` — `toDomain` | 2 (Draft ~315, Open ~476) | ✅ ambos com bloco `rehydrate` + `mapper-invalid-subcategory-ref` |
| `document.mapper.ts` — `toRow` | 2 (Draft ~665, Open ~712) | ✅ ambos |
| `dto.ts` | 2 ramos (Draft ~170, Open ~205) | ✅ ambos |
| `plugin.ts` | 2 ramos (~382, ~422) | ✅ ambos (`body.subcategoryRef ?? null`) |
| `document.ts` (domínio) | `create` (195), `undoApproval` (524), `saveDraft` (637), `submit` (690) | ✅ os quatro |
| `types.ts` | `DocumentCore` (61), `DraftDocument` (105) | ✅ ambos |
| Use cases | `save-document.ts`, `save-draft.ts` | ✅ rehydrate + repasse |

Observação de qualidade (não-achado): o mapper adicionou `mapper-invalid-subcategory-ref` à union
`DocumentMapperError` e trata o `rehydrate` com `Result` (rejeita ref corrompido vindo do banco), coerente
com `.claude/rules/adapters.md` (mapper devolve `Result`, domínio rejeita estado inválido). Bom.

---

## Foco 3 — Migration aditiva/INSTANT — CONFIRMADO

`0037_natural_hedge_knight.sql` contém exatamente:

```sql
ALTER TABLE `fin_documents`    ADD `subcategory_ref` varchar(36);
ALTER TABLE `fin_payable_view` ADD `subcategory_ref` varchar(36);
CREATE INDEX `fin_payable_view_subcategory_ref_idx` ON `fin_payable_view` (`subcategory_ref`);
```

Só `ADD COLUMN` (nullable, no fim da tabela) + `CREATE INDEX`. **Nenhum** DROP / recreate / MODIFY.
Compatível com ALGORITHM=INSTANT (ADD COLUMN nullable) + ADD INDEX. `_journal.json` registra idx 37
coerentemente. Regressão zero nos documentos existentes (campo nasce nulo — CA1).

---

## Foco 4 — ADR-0014 (CA7) — CONFORME

`refs.ts`: `SubcategoryRef` expõe **só** `rehydrate` (sem `generate`/`resolve`/`validateAgainstPlan`),
reusa `rehydrateAs` → `isUuidV4` (validação **só de formato**). Sem FK física, sem chamada à public-api
de budget-plans, sem tocar tabela `bgp_*`. O teste unit (`subcategory-ref.test.ts`) trava exatamente essa
superfície opaca (asserta `generate`/`resolve`/`resolveName`/`validateAgainstPlan` === `undefined`).
Espelha fielmente os irmãos `ContractRef`/`BudgetPlanRef`/`CategoryRef`/`ProgramRef`. Conforme CA5/CA7.

---

## Foco 5 — `fin_payable_view`: coluna encenada sem populador — OBSERVAÇÃO (não-bloqueante)

A coluna `subcategory_ref` + índice existem na view (satisfazem CA1), mas o `upsert` de
`payable-view-store.drizzle.ts` (`.values({…})` / `.onDuplicateKeyUpdate({…})`) **não** seta
`subcategoryRef` — nem o `rowToPayableView` (`payable-view.mapper.ts`) o lê, nem o tipo de domínio
`PayableView` o carrega. Consequência: **hoje a coluna nascerá sempre `NULL`** até a S5 fiar a projeção
(copiar do documento + carregar no evento `DocumentSaved`).

**Avaliação: defensável (YAGNI), Minor no máximo — não compromete nada agora.**
- É **explicitamente fora de escopo** por decisão do ticket: `000-request.md` §Fora de escopo ("Leitura
  agrupar por subcategoria — é a S5; aqui só se grava") e o W1 declarou a omissão do `payable-view.mapper.ts`
  como S5. Por instrução desta wave, projeção da view/evento = S5 **não** é achado.
- CA1 pede apenas que a **coluna + índice existam** na view (parte do carimbo estrutural que a S5 vai
  consumir) — cumprido. Encenar a coluna à frente do seu populador é padrão aditivo seguro.
- Custo atual **negligível**: coluna nullable + índice sobre valores todos-NULL (entradas de índice
  praticamente vazias). Nenhuma inconsistência de tipo (domínio `PayableView` não expõe o campo, mapper
  não o lê — coerentes entre si; typecheck verde).

**Nota para a S5:** ao fiar a projeção, lembrar dos **três** pontos: (1) `.values` do `upsert`,
(2) o `set` do `onDuplicateKeyUpdate` (senão reprocessar `DocumentSaved` não atualiza a subcategoria),
(3) `rowToPayableView` + tipo `PayableView`. Registrado como lembrete, não como pendência deste ticket.

---

## Foco 6 — CA3 / back-compat — CONFORME

- **Convivência (CA3):** no HTTP test `NFS-SUBCAT-COEX` os três (`subcategoryRef` + `budgetPlanRef` +
  `categoryRef`) são ecoados juntos; no mapper `toRow`/`toDomain` o `subcategoryRef` entra **ao lado** do
  `budgetPlanRef` em cada INSERT/UPDATE e leitura. Os dois refs persistem no mesmo caminho.
- **Nasce `null` / opcional (CA4/CA8):** `z.uuid().optional()` no create; `?? null` no plugin;
  `subcategoryRef: input.subcategoryRef ?? null` no domínio; migration nullable. Documento sem o campo
  segue válido (teste `NFS-SUBCAT-NONE` → eco `null`). Documentos existentes intactos.
- **Malformado → 400 na borda (CA5):** `z.uuid()` rejeita antes do domínio (teste `NFS-SUBCAT-BAD`).

---

## Achados

| Severidade | Achado |
| :-- | :-- |
| Blocker | — nenhum |
| Major | — nenhum |
| Minor | (informativo) coluna `fin_payable_view.subcategory_ref` encenada sem populador — **fora de escopo (S5), defensável**; ver Foco 5 |

## Fora de escopo (não auditado por instrução)

Integração/EXPLAIN (#500); projeção da view + evento `DocumentSaved` (S5); validação-contra-plano (S4/S5);
título manual (S2); contrato carregar refs (S3). Nada disso é pendência deste ticket.

## Próximo passo

W3 (QUALITY) — `ts-quality-checker`: `typecheck` + `format:check` + `test` (+ lint). Integração registrada
como não-executada (#500).
