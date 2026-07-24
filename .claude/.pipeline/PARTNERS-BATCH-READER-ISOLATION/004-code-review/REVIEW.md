# Code Review — Ticket PARTNERS-BATCH-READER-ISOLATION (#521) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-23
**Escopo revisado:**

- `tests/modules/partners/adapters/persistence/repos/suppliers-batch-reader.drizzle.test.ts` (único arquivo do diff)
- Contexto: `000-request.md`, `002-tests/REPORT.md`, `003-impl/REPORT.md`
- Confirmação de escopo: `git status` / `git diff --stat` (1 arquivo, +4/−2)

---

## Foco (4 pontos do W2)

### 1. Corrige o #521 sem afrouxar? ✅

`delete(t)` (tabela inteira, no `before`/entrada) elimina a colisão ordem-dependente: pega o resíduo
de CNPJ `11222333000181` deixado pelo `supplier-repository` (id distinto) que a limpeza por-id
(`inArray([A,B,MISSING])`) não alcançava → não há mais `Duplicate entry ... par_suppliers_cnpj_idx`
(errno 1062). **Nenhuma asserção enfraquecida:** o teste segue chamando
`getSuppliersView([A, B, MISSING])` — WHERE IN real com 2 existentes + 1 ausente. Preservados:
`items.length === 2`, `missing === [MISSING]`, campos de Alpha (`name`/`taxId`/`serviceCategory`) e o
CA5 de minimização (`Object.keys(alpha).sort() === ['name','ref','serviceCategory','taxId']`). Só a
estratégia de limpeza mudou. Confere com o W1 (50/50, ordem natural).

### 2. Import órfão ✅

`import { inArray } from 'drizzle-orm'` removido. `grep -n inArray` no arquivo → sem nenhuma ocorrência
remanescente. Não quebra `typecheck`/`lint` (`noUnusedLocals`/`no-unused-vars` satisfeitos); W1 reporta
os três gates estáticos verdes.

### 3. Contrato de isolamento (#535) ✅ forward-compatible

`delete(t)` = limpeza **por tabela, na entrada** — exatamente a regra que o #535 propõe (nunca por PK
quando há UNIQUE natural, ex.: CNPJ). Quando o #535 entrar, a linha vira `resetPartnersTables(handle)`
sem mudar semântica. O comentário PT no `before` documenta a causa (resíduo do irmão + UNIQUE) e o
vínculo com #521/#535 — alinhado à regra de idioma (doc/comentário PT) e ao estilo pré-existente do
arquivo (linhas 1-4, 46-47, 83 já em PT).

### 4. Escopo ✅

Apenas `partners` e apenas o arquivo do batch-reader (ADR-0014 respeitado). O `supplier-repository`
(fonte real do resíduo, sem `after`) **não** foi tocado — corretamente deixado para o #535 sistêmico,
evitando scope-creep (anti-padrão #15). `src/` intacto (fix test-only). `git status` confirma: só
`suppliers-batch-reader.drizzle.test.ts` modificado.

---

## O que está bom

- Diff mínimo e cirúrgico (+4/−2): troca de 1 statement + remoção do import órfão, nada além.
- Comentário explica o **porquê** (resíduo cross-arquivo + colisão na UNIQUE), não o **o quê** — e ancora
  em #521/#535, dando rastreabilidade a quem ler no futuro.
- Escolha da limpeza por-tabela é mais robusta E forward-compatible com o helper do #535 — decisão de
  design correta para um fix "mínimo agora, sem criar dívida divergente".

## Observação (🔵 não-bloqueante)

- O teste passa a deixar as linhas A/B como resíduo próprio (não há `afterEach`/`after` de limpeza de
  dados — o `after` só fecha o handle). Isso é **coerente** com o contrato "limpar na ENTRADA por tabela":
  qualquer irmão bem-comportado se protege limpando na própria entrada. Nenhuma ação neste ticket; é
  precisamente o escopo do #535 (helper + `after` no `supplier-repository`).

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (`typecheck` + `format:check` + `lint` + `test`).
