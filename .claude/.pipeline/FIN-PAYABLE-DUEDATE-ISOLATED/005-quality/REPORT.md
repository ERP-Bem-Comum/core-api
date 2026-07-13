# Quality Check — FIN-PAYABLE-DUEDATE-ISOLATED (#270)

**Skill:** ts-quality-checker
**Data:** 2026-07-13
**Veredito gate Mac:** ✅ ALL GREEN
**Integração MySQL (x99):** ✅ CAMINHO #270 VALIDADO (MySQL 8.4.10 real) · ⚠️ 1 defeito de teste **pré-existente e alheio** encontrado (registrar issue)

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck`) | ✅ | `tsc --noEmit` — exit 0, zero erros |
| 2 | Format check (`pnpm run format:check`) | ✅ | "All matched files use Prettier code style!" |
| 3 | Lint (`pnpm run lint`) | ✅ | `eslint .` — zero violações |
| 4 | Testes (`pnpm test`) | ✅ | 3907 tests · **3884 pass · 0 fail** · 18 skipped · 5 todo · exit 0 |
| 5 | Integração MySQL (`pnpm run test:integration` @ x99) | ⏳ | Sub-etapa no homelab — ver §Integração |

---

## Saída integral

### Check 1 — typecheck
```
$ tsc --noEmit
(sem saída — exit 0)
```

### Check 2 — format:check
```
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!
```

### Check 3 — lint
```
$ eslint .
(sem saída — zero violações)
```

### Check 4 — testes (suíte completa, driver memory)
```
ℹ tests 3907
ℹ pass 3884
ℹ fail 0
ℹ cancelled 0
ℹ skipped 18
ℹ todo 5
ℹ duration_ms 72385
```

Os 3 arquivos do ticket, isolados: **13/13 pass** (domínio 4 · use-case 3 · borda 6).

---

## Nota — falso-positivo investigado (regressão zero)

Uma primeira leitura capturou `✖ … DamISS NFS-E 32.pdf: reader falhou → malformed-document`. **Não é
regressão nem fail:** é um teste `todo` documentado em
`tests/.../document-reader/native-pdf-real.local.test.ts` (mapa `FATIA2` → `#388: hex Identity-H sem
/ToUnicode`), que roda **só** quando as fixtures reais gitignored existem localmente (Mac do Gabriel).
Testes `todo` que falham internamente **não contam como `fail`** no `node:test`. Prova isolada do arquivo:
`tests 7 · pass 2 · fail 0 · todo 5 · exit 0`. Totalmente ortogonal ao diff do #270 (reader de PDF #386/#388).

---

## Integração MySQL (x99) — executada 2026-07-13

Método [[mac-dev-x99-docker-runner-tunnel]]: `docker run` avulso de **MySQL 8.4.10** no x99
(container `fin270-mysql`, `root@'%'` native_password, db `core`) + túnel SSH `-L 3306:127.0.0.1:13306`.
Testes rodados do Mac com `MYSQL_INTEGRATION=1 FINANCIAL_DATABASE_URL=mysql://root:…@127.0.0.1:3306/core`
(`applyMigrations: true` — schema criado pelo próprio teste).

**Caminho do #270 — verde no engine real:**

| Teste | Cobre do #270 | Resultado |
| :-- | :-- | :-- |
| `manual-payment.drizzle-mysql` | mutação isolada de UM payable + `repo.save` por-payable + trilha (padrão espelhado) | ✅ pass |
| `payable-list-view.drizzle-mysql` | read-model que expõe `dueDate` por título (usado na asserção de não-propagação) | ✅ pass |
| `document-repository.drizzle-mysql` (contrato `documentRepositoryContract`) | save/findById de payables com `dueDate` | ✅ 19/20 |

Como `updatePayableDueDate` reusa exatamente o `repo.save` do `manual-payment` e o mesmo read-model, a
persistência do `dueDate` isolado está confirmada por transitividade + contrato do repo. **Sem migration
nova** (ver `003-impl/REPORT.md`).

## ⚠️ Defeito PRÉ-EXISTENTE e ALHEIO encontrado (não bloqueia o #270)

`document-repository.drizzle-mysql.test.ts:316` (teste `#204 — status Conciliado derivado em findPaged`)
falha no MySQL real: `UPDATE fin_payables SET status='Paid'` **sem** setar `paid_at` viola o CHECK
`fin_payables_paid_at_chk` = `(status <> 'Paid') OR (paid_at IS NOT NULL)` → errno 3819
(`ER_CHECK_CONSTRAINT_VIOLATED`). O CHECK é do #231/#232 (paidAt); o raw-SQL do teste não foi atualizado.

- **Ortogonal ao #270:** o arquivo **não** está no diff; `updatePayableDueDate` nunca escreve `status='Paid'`.
- **RESOLVIDO** (decisão do humano: consertar no escopo, não abrir issue) via ticket dedicado
  **`FIN-DOCREPO-TEST-PAIDAT-CHECK`** (pipeline W0→W3 completa, closed-green): `paid_at` adicionado nos 3
  pontos raw-SQL → `document-repository.drizzle-mysql` **20/20** no x99. Suíte de integração financial limpa.

## Cleanup x99 — 1 pendência (requer sudo do humano)

- Túnel SSH: ✅ encerrado. Porta 3306 do Mac: livre.
- Container `fin270-mysql`: ⚠️ **leftover** — `docker rm/stop` sem sudo dá `permission denied` (Ubuntu Core /
  docker-snap). Remover com: `! ssh x99 'sudo docker rm -f fin270-mysql'`.

---

## Próximo passo

- Gate Mac ✅ + caminho #270 no x99 ✅ → **DoD do #270 satisfeito** (integração validada).
- Pendências (fora do #270): (a) abrir issue do defeito #204 — aguardando OK; (b) remover container leftover.
- Após decisão: fechar W3 (`pipeline:state wave-finish … W3 --outcome GREEN`) e o ticket.
