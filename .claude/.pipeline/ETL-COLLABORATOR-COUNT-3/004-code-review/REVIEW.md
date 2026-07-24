# Code Review — Ticket ETL-COLLABORATOR-COUNT-3 (#522) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-07-23T21:20Z
**Escopo revisado:**

- `tests/etl/orchestrate.integration.test.ts` (diff :43)
- `tests/etl/legacy/reader.integration.test.ts` (diff :31)
- `tests/etl/fixtures/legacy-mini.sql` (leitura — NÃO tocado)
- `git diff --stat`, `git status --short`, `git blame` (fixture + asserções)
- Contexto: `000-request.md`, `002-tests/REPORT.md`, `003-impl/REPORT.md`

---

## Contexto

Fix **test-only**, size S. Duas asserções desatualizadas (`==2`) sobre a contagem de
collaborators da fixture sintética, atualizadas para `==3`. Nada em `src/`.

```
tests/etl/legacy/reader.integration.test.ts | 2 +-   (collaborators.rows.length 2 → 3)
tests/etl/orchestrate.integration.test.ts   | 2 +-   (collaborators.read       2 → 3)
2 files changed, 2 insertions(+), 2 deletions(-)
```

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante

Nenhuma.

### 🔵 Sugestão

Nenhuma.

---

## Verificação dos 3 focos do ticket

### 1. A correção é a asserção, não a fixture? ✅ CONFIRMADO

- **`git blame`** do 3º collaborator (fixture `:178-181`): commit `468c47de` (2026-07-02
  **13:22:08**, fatia **ETL-FINANCIAL-WRITER**). É intencional — o "Aprovador Fake" (id 3) é o
  aprovador dos payables 1 e 2 (`approvals` `:241-243`: `(1,3,NULL,1,...)`, `(2,3,NULL,2,...)`,
  ambos com `collaboratorId=3`). Identidade do aprovador resolve por `collaboratorId→email`
  (`user@fake.test`, casando com user 1) porque `approvals.userId` é NULL no legado (defeito
  F1/D11, documentado na própria fixture `:176-177` e `:240`).
- **`git blame`** das asserções (`5ebe9fa15`, 2026-07-02 **15:29:54**): reescritas **~2h depois**
  da fixture já ter 3 collaborators → **stale-on-arrival**. Nunca rodaram (suíte gated, sem CI
  até o #523). O `==2` era um bug latente, não um contrato.
- **A fixture NÃO foi revertida** (correto): remover o collaborator 3 quebraria o join do
  aprovador dos payables 1/2 (requisito do ETL-FINANCIAL-WRITER). `git status` confirma que o
  `.sql` não está no diff; as asserções `:43`/`:31` aparecem como "Not Committed Yet".

### 2. Não-afrouxamento ✅ CONFIRMADO

Mudar `==2` para `==3` **aperta** a asserção (contagem exata correta), não afrouxa. Todos os
guards permanecem em igualdade estrita e continuam válidos com 3:

- **`quarantined === 0`** (orchestrate `:52`, loop sobre as 4 entidades incl. collaborators): as
  3 linhas migram limpo. Collaborator 3 tem CPF `39053344705` **distinto** dos outros dois
  (`52998224725`, `11144477735`), e-mail `user@fake.test` **distinto entre os 3 collaborators**
  (o compartilhamento é com o **user 1**, cross-entidade, não colab↔colab), e `role='Gerente'`
  **não-nula** (evita `RequiredFieldMissing`, fixture `:82-87`). O `orchestrate` passar 4/4
  contra MySQL real (W1) **prova** empiricamente que `quarantined` seguiu 0 (o mapper real
  validou CPF e destino).
- **Reconciliação** `read === migrated + quarantined + alreadyExists` (orchestrate `:53`): fecha
  3 = 3 + 0 + 0 para collaborators.
- **Inativo `id === 2`** (reader `:41`): `Colab Inativo`, `active=0` — entidade inalterada por
  adicionar o colab 3. Backstop de pé.
- **`archived === 2`** (reader `:58`): `collaborator_history` tem 2 linhas (`:121-123`, ambas
  `collaboratorId=1`) — **entidade separada** de `collaborators`. Adicionar o colab 3 NÃO cria
  history; a contagem 2 é ortogonal e permanece.

### 3. Escopo ✅ CONFIRMADO

- `git status --short`: só `M` nos 2 arquivos de teste ETL + o diretório de pipeline (untracked).
  **Nada em `src/`.**
- `git diff --stat`: 2 arquivos, 2+/2−. Exatamente as 2 asserções de 1 linha.
- Fixture `legacy-mini.sql` **não tocada**.
- Ambos os alvos vivem em `tests/etl/**` (regras ESLint relaxadas em `tests/**`, `.claude/rules/testing.md`).

---

## O que está bom

- Fix cirúrgico e mínimo (o menor diff que corrige o defeito), coerente com size S.
- Diagnóstico correto: **asserção stale**, não fixture quebrada — sustentado por `git blame`
  (janela de 2h entre fixture e asserção), não por suposição.
- Preserva a intenção da fixture (colab 3 = aprovador, requisito ETL-FINANCIAL-WRITER) em vez de
  "consertar" a contagem removendo dado.
- Não afrouxa nenhum guard; a reconciliação e os backstops (`quarantined===0`, inativo `id===2`,
  `archived===2`) continuam em igualdade estrita.
- W1 documenta RED→GREEN (4/4) contra MySQL 8.4 real — o green do `orchestrate` é a prova viva
  do não-afrouxamento, não só argumento.

---

## Próximo passo

- **APPROVED** → pipeline-maestro avança para W3 (`typecheck` + `format:check` + `lint` + `test`).
