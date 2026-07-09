# W0 — Teste RED · FIN-PAYABLE-PAIDAT-CHECK (#383)

**Skill:** `tdd-strategist` · **Camada:** integration (gate `MYSQL_INTEGRATION`) · **Outcome:** RED (a provar no x99)

## Teste

`tests/modules/financial/adapters/persistence/payable-paid-at-check.drizzle-mysql.test.ts` — semeia um
payable `Approved` (paid_at NULL) via domínio + `repo.save`, depois força o estado inconsistente via
`UPDATE` cru (`handle.db.execute(sql\`...\`)`), cobrindo os 3 CAs:

1. `UPDATE status='Paid', paid_at=NULL` → `assert.rejects` com `errno === 3819` (ER_CHECK_CONSTRAINT_VIOLATED).
2. `UPDATE status='Paid', paid_at='2026-07-10'` → aceito (sem throw).
3. `UPDATE status='Open', paid_at=NULL` → aceito (sem throw).

O domínio nunca cria `Paid` sem `paid_at`, por isso o estado inconsistente é forjado por SQL cru.

## RED / GREEN — só observável em MySQL real

A constraint é de banco: o RED (sem a constraint, o UPDATE inconsistente **passa** → o `assert.rejects`
do CA1 falha) e o GREEN (com a constraint, o UPDATE é rejeitado) **só são observáveis contra MySQL 8.4**.
Localmente o teste pula (gate `MYSQL_INTEGRATION` não definido) — validação real no **x99** (pendente).
