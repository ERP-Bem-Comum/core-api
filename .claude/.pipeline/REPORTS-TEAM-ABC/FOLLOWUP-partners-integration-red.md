# Follow-up (fora do escopo do #238) — suíte de integração `partners` vermelha na `dev`

> Achado durante a validação MySQL (OrbStack) da CA4 do REPORTS-TEAM-ABC (#238).
> **Pré-existente na `dev`** (independe do #238). Registrado por disciplina de escopo
> (ADR-0040 / anti-padrão #15): não consertado inline. Ainda **não** virou GitHub Issue —
> a criação foi bloqueada pelo classificador (publicação externa não autorizada). Para
> abrir a issue, rodar o comando `gh issue create` no fim deste arquivo via `! ...`.

## Sintoma

`pnpm run test:integration:partners` fecha **vermelho** na `dev`:

```
ℹ tests 49
ℹ pass 48
ℹ fail 0
ℹ cancelled 1
✖ suppliers-batch-reader — e2e par_suppliers (CA7 WHERE IN)
  cause: Duplicate entry '11222333000181' for key 'par_suppliers.par_suppliers_cnpj_idx' (errno 1062)
```

Provado em volume MySQL **fresco** (OrbStack, `up --wait` → `down -v` no fim): não é reuso de
container, é colisão **cross-file** dentro de um único run serial (`--test-concurrency=1`).

## Causa-raiz

A suíte `partners` (`scripts/ci/test-integration.ts`) roda os arquivos em ordem, serial. Dois
compartilham o CNPJ fixo `11222333000181`:

1. `tests/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.test.ts` — limpa
   `par_suppliers` **só no `beforeEach`** (não em `after`/`afterEach`). Após o **último** teste do
   arquivo, a linha "Fornecedor X" (CNPJ `11222333000181`) **permanece** na tabela.
2. `tests/modules/partners/adapters/persistence/repos/suppliers-batch-reader.drizzle.test.ts` (#356)
   — o `before` deleta **apenas por id** (`WHERE id IN (A, B, MISSING)`), não faz full-delete. Insere
   "Alpha" com o **mesmo** CNPJ `11222333000181` → **`ER_DUP_ENTRY`** no índice único
   `par_suppliers_cnpj_idx`. O `before` falha e o `it` filho é cancelado.

## Prova de que independe do #238

Baseline `dev` (registro do #238 revertido, `git checkout scripts/ci/test-integration.ts`):
`tests 49 / pass 48 / fail 0 / cancelled 1` — **mesma** falha `suppliers-batch-reader`, mesmo dup.
Com o #238: `tests 50 / pass 49 / cancelled 1` (a CA4 nova soma 1 pass; a falha é a mesma).

## Correção proposta (test-only, baixo risco)

- `suppliers-batch-reader.drizzle.test.ts`: trocar o delete-por-id do `before` por **full-delete**
  (`await handle.db.delete(t)`) — o teste passa a ser dono das próprias precondições.
- (Higiene) `supplier-repository.drizzle.test.ts`: limpar `par_suppliers` também em `after`.

## Critérios de aceite

- [ ] `pnpm run test:integration:partners` fecha verde (`fail 0 / cancelled 0`) em volume fresco.
- [ ] `suppliers-batch-reader` passa mesmo com `supplier-repository` rodando antes no mesmo run.
- [ ] Nenhuma mudança em `src/` — só testes.

## Comando para abrir a issue (rodar via `! ...`)

```bash
gh issue create \
  --title "[partners] Suíte de integração vermelha na dev: suppliers-batch-reader colide com resíduo de supplier-repository (CNPJ 11222333000181)" \
  --body-file .claude/.pipeline/REPORTS-TEAM-ABC/FOLLOWUP-partners-integration-red.md \
  --label bug
```
