# W2 — REVIEW · PARTNERS-COLLABORATOR-BULK-IMPORT

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `src/modules/partners/application/use-cases/import-collaborators.ts`
- `tests/modules/partners/application/import-collaborators.test.ts`

## Aderência (`.claude/rules/application.md`)

- ✅ Use case factory `(deps) => (cmd) => Promise<Result<O, never>>`. Orquestração pura; nenhuma regra de
  estado de domínio fora do agregado (delega a `registerCollaborator`).
- ✅ **DRY** — reusa `registerCollaborator` (domínio + unicidade + save por linha); zero duplicação.
- ✅ Sem import de `adapters/`; erros kebab EN propagados via `RegisterCollaboratorError`.
- ✅ `Readonly<>` em command/output/failure; `import type` para os tipos.

## Correção e semântica

- ✅ **Import parcial** correto: não aborta no 1º erro; `failed[]` acumula `{index, error}`; sempre `ok`.
- ✅ **Sequencial intencional** — `for ... of entries()` + `await` garante unicidade intra-arquivo
  determinística ("primeira ganha"). `eslint-disable no-await-in-loop` **justificado inline** (não é
  cargo-cult: paralelizar quebraria a semântica). Aceito.
- ✅ **`entries()`** evita o `| undefined` do `noUncheckedIndexedAccess` (sem branch morto).
- ✅ Testes cobrem: vazio, todas válidas, inválido no meio, duplicado intra-arquivo (CPF e email),
  duplicado contra banco, continuidade após falha. Bom alcance.

## Observações (não-bloqueantes)

1. **`index` 0-based vs. `line` legado** — divergência consciente e documentada; a borda CSV soma o
   offset do header. Mantém o use case agnóstico de CSV. OK.
2. **`Result<_, never>`** — assinatura consistente com os demais use cases (sempre `Promise<Result>`),
   sinalizando que não há modo de falha global. Correto para import parcial.
3. **`rowData` do erro legado** (linha crua) fora — a borda anexa se precisar. YAGNI. OK.

## Conclusão

Reuso limpo, semântica de import parcial fiel ao legado, sequencialidade justificada. **APPROVED** — segue para W3.
