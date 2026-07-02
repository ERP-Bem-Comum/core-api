# W3 — Gate de Qualidade — AUTH-EMAIL-LINK-BASE-URLS

**Skill:** ts-quality-checker (executada por sub-agente contratos-orchestrator; REPORT persistido pela sessão principal — sub-agentes não passam pelo hook prettier)
**Data:** 2026-07-02
**Worktree:** .claude/worktrees/email-fixes (branch feat/email-fixes, HEAD 038c7313)
**Restrições da sessão:** sem Docker, sem test:integration (migração de banco do humano em andamento).

## Veredito: GREEN-COM-RESSALVA-DE-BASELINE (W3 NÃO fechado — aguarda rebase)

O diff do ticket está limpo em todos os 4 gates. O único vermelho é no typecheck, e é exclusivamente o baseline pré-existente da feature ETL payable-view-backfill (migração do humano, fechada green hoje, ainda não commitada na worktree principal). Fechamento formal do W3 aguarda rebase sobre o commit dessa migração + re-run do typecheck.

## Escopo de diff do ticket (git diff --name-only HEAD, arquivos src/ e tests/)

    src/server.ts
    src/shared/http/email-link-base-urls.ts
    tests/shared/http/email-link-base-urls.test.ts

(+ docs: .env.example, handbook/infrastructure/03-secrets-catalog.md, specs/033-\*, artefatos de pipeline.)
Nenhum arquivo da feature payable-view-backfill aparece no diff do ticket.

## 1. pnpm run typecheck — RED (baseline alheio, NÃO do ticket)

    $ tsc --noEmit
    src/jobs/financial/payable-view-backfill/reader.ts(70,18): error TS2345: Argument of type
      '{ payableId: string; ...; status: PayableViewStatus; }' is not assignable to parameter of
      type 'Readonly<{ ...; debitAccountRef; ...; paidAt: string | null; }>'.
      Type '...' is missing the following properties: debitAccountRef, paidAt
    tests/jobs/financial/payable-view-backfill/backfill.test.ts(13,93): error TS2739: Type
      '{ payableId: string; ...; status: PayableViewStatus; }' is missing the following
      properties from type 'Readonly<{...}>': debitAccountRef, paidAt
    [ELIFECYCLE] Command failed with exit code 2.

Classificação: baseline pré-existente, fora do diff do ticket.

- Ambos os erros vivem na feature payable-view-backfill (trabalho ETL do humano). Causa-raiz única: o tipo PayableViewRow ganhou debitAccountRef e paidAt, e reader.ts + backfill.test.ts ainda não foram atualizados.
- Prova (intocados pelo ticket):

      $ git diff --name-only HEAD -- src/jobs/financial/payable-view-backfill/reader.ts \
          tests/jobs/financial/payable-view-backfill/backfill.test.ts
      (vazio — ambos idênticos a HEAD 038c7313)

- Política de regressão zero: não consertar (diff alheio; saída 3 — escalação explícita, já ciente pelo humano, registrada em 000-request.md §"Nota de baseline").

### Discrepância vs. nota de baseline (registrada para o humano)

A nota do 000-request.md afirmou erros "exclusivamente em backfill.test.ts". Na prática o typecheck também acusa src/jobs/financial/payable-view-backfill/reader.ts(70,18) — mesma feature, mesma causa-raiz, igualmente intocado pelo ticket. Substância mantida (zero erros no diff do ticket); apenas a enumeração literal da nota estava incompleta (1 citado, 2 afetados, ambos baseline).

## 2. pnpm run format:check — GREEN

    $ prettier --check .
    Checking formatting...
    All matched files use Prettier code style!

## 3. pnpm run lint — GREEN

    $ eslint .
    (sem output — zero problemas, exit 0)

## 4. pnpm test — GREEN

    ℹ tests 3357
    ℹ suites 988
    ℹ pass 3339
    ℹ fail 0
    ℹ cancelled 0
    ℹ skipped 18
    ℹ todo 0
    ℹ duration_ms 73421.274917

- 0 falhas. Os 18 skipped são testes de integração gated (env de opt-in não definida).
- node:test com --experimental-strip-types apenas remove tipos (não typecheck), então backfill.test.ts roda em runtime mesmo com o erro de tipo — e passa. O erro só é capturado pelo tsc.
- Cobre os testes novos do ticket: tests/shared/http/email-link-base-urls.test.ts (8 pass).

## Conclusão e condição de fechamento

| Gate         | Status | Origem                                                                                 |
| ------------ | ------ | -------------------------------------------------------------------------------------- |
| typecheck    | RED    | Baseline alheio (payable-view-backfill ETL): reader.ts + backfill.test.ts, intocados    |
| format:check | GREEN  | —                                                                                       |
| lint         | GREEN  | —                                                                                       |
| test         | GREEN  | 3357 testes, 0 fail, 18 skipped (integração)                                            |

Condição de fechamento formal do W3 (saída 3 — escalação explícita):

1. Rebase de feat/email-fixes sobre o commit da migração ETL payable-view-backfill (atualiza reader.ts + backfill.test.ts com debitAccountRef + paidAt).
2. Re-run pnpm run typecheck → 0 erros.
3. Só então marcar W3 done / pipeline:state close.

---

## Re-run pós W1-fix de idioma (2026-07-02, mesmo agente do gate)

O diff mudou após o gate original: W1-fix de idioma (`autocadastroBaseUrl` → `selfRegistrationBaseUrl`; env `PARTNERS_AUTOCADASTRO_BASE_URL` → `PARTNERS_SELF_REGISTRATION_BASE_URL`; ponte comentada para o campo legado do partners — issue #333) + W2 round 2 APPROVED (addendum no REVIEW.md). Gate completo re-executado:

| Gate         | Status | Observação                                                                    |
| ------------ | ------ | ------------------------------------------------------------------------------ |
| typecheck    | RED    | Mesmos 2 erros baseline (payable-view-backfill reader.ts + backfill.test.ts)    |
| format:check | GREEN  | All matched files use Prettier code style!                                      |
| lint         | GREEN  | 0 problemas                                                                     |
| test         | GREEN  | 3357 testes · 3339 pass · 0 fail · 18 skipped — contagem estável, sem regressão |

Veredito inalterado: **GREEN-COM-RESSALVA-DE-BASELINE**. O rename não introduziu regressão. Condição de fechamento permanece a mesma (rebase pós-commit da migração ETL + typecheck 0 erros).
