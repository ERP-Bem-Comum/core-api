# W3 — GREEN · REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437)

> Skill: `ts-quality-checker`. Gate final + validação MySQL real.
> Worktree: `.claude/worktrees/437-suppliers-no-contract`.

## Resultado

**GREEN em todos os gates + CA5 validado em MySQL 8.4.10 real.**

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ verde (sem saída) |
| `pnpm run format:check` | ✅ `All matched files use Prettier code style!` |
| `pnpm run lint` | ✅ verde (sem saída) |
| `pnpm test` | ✅ **4008 tests · 3989 pass · 0 fail · 19 skipped** |
| Integração `contracts` (completa) | ✅ **95 tests · 90 pass · 0 fail · 5 skipped** |
| Integração `financial` (completa) | ✅ **80 tests · 80 pass · 0 fail** |
| **CA5 — anti-join ponta-a-ponta** | ✅ **6/6 checks** (script dedicado) |

---

## Ambiente de validação — exceção OrbStack (x99 offline)

O x99 estava **offline** nesta sessão; o Gabriel autorizou explicitamente usar OrbStack. Ver
[[validate-mysql-always-x99-never-mac-docker]].

**Gotcha crítico identificado e contornado (não estava previsto no plano):**
`scripts/ci/test-integration.ts:223` executa `docker compose down -v` no `finally`, e o
`compose.yaml` tem **project name fixo** (`name: core-api-dev`, `:27`) e **volumes de nome fixo**
(`core-api-mysql-data`, `:564`). Rodar `pnpm run test:integration:*` a partir de **qualquer**
worktree destruiria o volume da infra dev persistente do Gabriel e sobrescreveria/deletaria
`secrets/*.txt` (`:205-207`, `:261`).

**Caminho usado (não-destrutivo), aprovado pelo Gabriel:**

1. `docker stop core-api-mysql` — **stop, nunca `down -v`**: volume preservado.
2. `docker run` de um MySQL 8.4.10 avulso na 3306 (`ca437-mysql-3306`), fora do projeto compose.
3. Suítes `contracts` + `financial` completas contra ele.
4. `docker rm -f` do container de teste + `docker start core-api-mysql`.

**Pós-condições verificadas:** `core-api-mysql` Up (healthy); volumes `core-api-mysql-data` e
`core-api-minio-data` presentes; 12 `secrets/*.txt` intactos; nenhum container `ca437-*` remanescente;
`git status` do repo principal idêntico ao início da sessão.

**Descoberta relevante para o futuro:** dos 11 arquivos da suíte `contracts`, **9 têm a
connection string hardcoded** em `127.0.0.1:3306` (sem fallback de env var). Só
`job-run.drizzle-mysql.test.ts` e o novo `active-contractor-read.drizzle-mysql.test.ts` são
parametrizáveis por `CONTRACTS_DATABASE_URL`. Por isso a validação exigiu liberar a 3306 — não
bastou publicar numa porta alternativa. (Traço pré-existente; não é do escopo do #437.)

---

## CA5 — validação em MySQL real

### `contracts` — port novo (7/7)

```
▶ buildContractsActiveContractorReadPort — Drizzle + MySQL (#437)
  ✔ CA1: contratante com contrato Active (contractor_type=supplier) aparece
  ✔ CA2: Pending NÃO conta como contrato (rascunho sem assinatura/vigência)
  ✔ CA2: Expired / Terminated / Cancelled NÃO contam
  ✔ CA1: contractor_type ≠ supplier NÃO aparece (mesmo com contrato Active)
  ✔ CA1: DISTINCT — 2 contratos Active do mesmo contratante → 1 entrada
  ✔ CA2: Pending + Active no mesmo contratante → aparece (basta 1 Active)
  ✔ pool boot-scoped: close() encerra o pool (2ª chamada após close falha)
ℹ tests 7 · pass 7 · fail 0
```

### `financial` — projeção de candidatos (3/3)

```
▶ openSuppliersWithoutContractReader — Drizzle + MySQL (REP-2 · #240 / #437)
  ✔ candidatos: agrega por fornecedor (contract_ref IS NULL, todos os status), nome via LEFT JOIN
  ✔ CA3 (#437): kind=Parent — filhos de retenção (ISS/IRRF) fora da soma e da contagem
  ✔ CA3 (#437): fornecedor cujos títulos sem contrato são SÓ filhos de retenção não é candidato
ℹ tests 3 · pass 3 · fail 0
```

### Anti-join ponta-a-ponta — a prova que faltava (Minor 1 do W2)

O W2 registrou que **nenhum teste provava o acoplamento de identidade** entre
`ctr_contracts.contractor_id` e `fin_payable_view.supplier_ref`: os dois arquivos de integração
populam **lados diferentes** e nunca se encontram. Se os espaços divergissem, a subtração seria
silenciosamente vazia e **o defeito da #437 persistiria sem erro**.

Script dedicado (scratchpad, não versionado) semeou os **dois** lados no mesmo MySQL e exercitou o
caminho real (2 readers de public-api + use-case do `reports`), reproduzindo o cenário que a P.O.
viu em tela:

```
=== CANDIDATOS (financial, antes do anti-join) ===
  Fornecedor COM contrato ativo :: aa000000-0000-4000-8000-00000000c001
  Fornecedor SEM contrato :: bb000000-0000-4000-8000-00000000c002
  Fornecedor so rascunho :: cc000000-0000-4000-8000-00000000c003

=== CONTRATANTES ATIVOS (contracts) ===
  aa000000-0000-4000-8000-00000000c001

=== RESULTADO FINAL (relatorio) ===
  Fornecedor SEM contrato :: bb000000-0000-4000-8000-00000000c002
  Fornecedor so rascunho :: cc000000-0000-4000-8000-00000000c003

=== VERIFICACAO ===
  PASS  espaco de identidade casou (COM_CONTRATO no conjunto ativo)
  PASS  #437 CORRIGIDO: fornecedor COM contrato ativo NAO aparece
  PASS  fornecedor SEM contrato aparece
  PASS  fornecedor so com Pending aparece (rascunho nao e contrato)
  PASS  anti-join subtraiu exatamente 1 de 3 candidatos
  PASS  candidatos do financial eram 3 (o bug apareceria sem anti-join)

RESULTADO: TUDO PASSOU
```

**Leitura:** o `financial` devolve 3 candidatos **incluindo o fornecedor contratado** — o bug está
reproduzido na camada de candidatos. O `contracts` reconhece esse mesmo ref como ativo — **o espaço
de identidade casa de fato**. O relatório final sai com 2, sem o contratado. **O #437 está
corrigido, provado contra MySQL real.**

---

## Suítes de integração completas (varredura de regressão)

### `contracts` — 11 arquivos

```
ℹ tests 95 · suites 35 · pass 90 · fail 0 · skipped 5 · duration_ms 9355.647125
```

### `financial` — 24 arquivos

```
ℹ tests 80 · suites 32 · pass 80 · fail 0 · duration_ms 16839.355666
```

Nenhuma regressão em vizinhos: migrations, driver, outbox, repos, read-models e o worker de
projeção `par_outbox → fin_supplier_view` todos verdes.

---

## Gates estáticos + suíte unitária

```
$ pnpm run typecheck
$ tsc --noEmit
(sem saída = verde)

$ pnpm run format:check
Checking formatting...
All matched files use Prettier code style!

$ pnpm run lint
$ eslint .
(sem saída = verde)

$ pnpm test
ℹ tests 4008 · suites 1142 · pass 3989 · fail 0 · cancelled 0 · skipped 19 · todo 0
```

**Política de regressão zero:** nenhum vermelho, próprio ou alheio, em nenhuma das rodadas. A
colisão conhecida da suíte `partners` não se manifestou (aquela suíte não faz parte do escopo deste
ticket e não foi executada).

---

## CA1–CA5 — fechamento

| CA | Prova |
| :-- | :-- |
| **CA1** — fornecedor com contrato `Active` não aparece | integração `contracts` (3 casos) + anti-join ponta-a-ponta (check 2) |
| **CA2** — `Pending`/`Expired`/`Terminated`/`Cancelled`/sem contrato aparecem | integração `contracts` (3 casos) + anti-join (checks 3 e 4) |
| **CA3** — filhos de retenção fora (`payableCount=1`, líquido) | integração `financial` (2 casos) |
| **CA4** — RBAC 403/200 + contrato HTTP inalterado | `pnpm test` (borda) + teste do #240 **verde e não editado** (`git status` vazio) |
| **CA5** — validado em MySQL real | **este relatório** — 7/7 + 3/3 + 6/6 checks em MySQL 8.4.10 |

---

## Follow-ups registrados (não consertados — anti-padrão #15)

1. **#436** — `payee_kind` não projetado em `fin_payable_view`: o relatório rotula como "fornecedor"
   qualquer favorecido (financiador/ACT/colaborador). **Mesma raiz**; tratar lá.
2. **Minor 1 do W2** — `shutdown()` sequencial do `reports` vaza pool se um `close()` rejeitar
   → sugerir `Promise.allSettled`. Pré-existente.
3. **Minor 2 do W2** — 4 pools boot-scoped sem dedup por URL na borda HTTP; `PoolRegistry` (#407) é
   worker-scoped. Pré-existente, afeta REP-1/2/4 já mergeados.
4. **Minor 3 do W2** — "citar ticket no código" não é regra documentada do repo (o precedente na
   `dev` é o oposto). Se a norma desejada é zero, é decisão repo-wide.
5. **Novo (desta wave)** — 9 dos 11 testes de integração do `contracts` têm connection string
   hardcoded em `127.0.0.1:3306`, sem fallback de env. Impede rodar a suíte numa porta alternativa
   e força liberar a 3306 (conflito com a infra dev). Candidato a issue.
6. **Novo (desta wave)** — `pnpm run test:integration:*` é **destrutivo para a infra dev**
   (`down -v` + volume de nome fixo + sobrescrita de secrets). Não há guarda. Candidato a issue:
   detectar infra persistente e abortar, ou usar project name isolado por worktree.

## DoD

✅ Gate W3 verde · ✅ CA1–CA5 provados · ✅ contrato HTTP inalterado · ✅ `ContractCountReadPort`
intacto · ✅ infra dev do Gabriel restaurada sem perda. **Pronto para commit + PR.**
