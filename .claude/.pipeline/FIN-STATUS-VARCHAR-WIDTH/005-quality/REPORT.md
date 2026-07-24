# W3 — REPORT (gate de qualidade) · FIN-STATUS-VARCHAR-WIDTH (#519)

**Executor:** `ts-quality-checker` + verificação na sessão principal. Bug de PRODUÇÃO. Skill.

## Veredito: GREEN

## Gate local (unit + estáticos)

```
pnpm run typecheck    → tsc --noEmit, exit 0
pnpm run format:check → All matched files use Prettier code style!
pnpm run lint         → eslint ., exit 0
pnpm test             → tests 4343 · pass 4323 · fail 0 · skipped 20 · todo 0 · EXIT 0
```

Regressão zero (`fail 0`). O teste do W0 (`payable-status-width.drizzle-mysql.test.ts`) skipa limpo sem
`MYSQL_INTEGRATION` (é 1 dos 20 skipped, junto dos demais gates de integração). Os 2 títulos de teste foram
renomeados (S1 do W2: "RED por 1406 hoje" → "sem estourar 1406") — asserções inalteradas.

## Gate de INTEGRAÇÃO (o que importa neste ticket) — provado contra MySQL 8.4.10 real

O `pnpm test` puro não aplica migration nem toca banco. A prova real está no W1 (`003-impl/REPORT.md` §4b):

- **RED→GREEN** do teste do W0: `varchar(16)` → 2 fail (errno 1406); `varchar(24)` + migration 0039 → 2 pass.
- **Regressão de dado:** `CHECKSUM TABLE` idêntico antes/depois do ALTER (1561723521) — widen não-destrutivo.
  CHECK segue ativo (ERROR 3819 em valor inválido).
- **Regressão comportamental:** suíte `financial` completa (31 arquivos) contra VM Incus 8.4.10 nativa →
  **119 tests · 119 pass · 0 fail**, incluindo o `CA4 (⊻)` de conciliação parcial que era RED pelo #519.

## Escopo (ADR-0014)

Só o módulo `financial` alterado: `schemas/mysql.ts` (2 linhas), `0039_huge_firelord.sql` (novo),
`meta/0039_snapshot.json` + `_journal.json`, o teste, e 1 registro em `scripts/ci/test-integration.ts`.
`contracts.ctr_documents.status` (mesma classe, margem 0) **não** tocado — follow-up separado.

## Pendência OPERACIONAL (fora do código — para ops, não bloqueia o merge)

**Confirmar a versão de patch do MySQL de PRODUÇÃO (RDS) antes de aplicar a migration:**
- **≥ 8.4.10** → o ALTER cai em INPLACE (metadata-only, ~instantâneo) → **sem janela de manutenção**.
- **≤ 8.4.9** → o ALTER cai em COPY sob `LOCK=SHARED` (escritas em `fin_documents`/`fin_payables` pausam ∝
  nº de linhas) → **janela de manutenção advisável** / pt-osc se as tabelas forem grandes.

Medido no W1 §5; memória `mysql84-alter-varchar-no-algorithm-hint` atualizada com o nuance de versão.

## Fechamento

Todas as 4 waves done. RED→GREEN provado, regressão-zero validada em VM real, review APPROVED, gate verde.
Ticket fechável.
