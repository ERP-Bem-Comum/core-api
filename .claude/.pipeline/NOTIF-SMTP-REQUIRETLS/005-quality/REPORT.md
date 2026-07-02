# W3 — Gate de Qualidade — NOTIF-SMTP-REQUIRETLS

**Skill:** ts-quality-checker (via sub-agente do gate; REPORT persistido pela sessão principal)
**Data:** 2026-07-02
**Worktree:** .claude/worktrees/email-fixes (branch feat/email-fixes, HEAD 038c7313)
**Restrições da sessão:** sem Docker, sem test:integration (migração de banco do humano em andamento).

## Veredito: GREEN-COM-RESSALVA-DE-BASELINE (W3 NÃO fechado — aguarda rebase)

| Gate         | Status | Origem                                                                               |
| ------------ | ------ | ------------------------------------------------------------------------------------ |
| typecheck    | RED    | Baseline alheio (payable-view-backfill ETL): reader.ts:70 + backfill.test.ts:13       |
| format:check | GREEN  | All matched files use Prettier code style!                                            |
| lint         | GREEN  | 0 problemas                                                                           |
| test         | GREEN  | **3365 testes · 3347 pass · 0 fail · 18 skipped** (3357 baseline + 8 novos do ticket) |

- A contagem subiu exatamente +8, casando com os testes do W0 (5 parsing `SMTP_REQUIRE_TLS` + 3 wiring `requireTLS`).
- `nodemailer.integration.test.ts` está entre os 18 skipped (gated por env de integração — home correto).
- Prova de baseline intocado: `git diff --name-only HEAD -- src/jobs/financial/payable-view-backfill/reader.ts tests/jobs/financial/payable-view-backfill/backfill.test.ts` → vazio (idênticos a HEAD).
- O diff da branch também carrega o ticket-irmão `AUTH-EMAIL-LINK-BASE-URLS` (mesma branch/PR — fronteira intencional, nit N2 do W2).

## Condição de fechamento formal do W3 (política de regressão zero, saída 3)

1. Rebase de `feat/email-fixes` sobre o commit da migração ETL `payable-view-backfill` (humano).
2. Re-run `pnpm run typecheck` → 0 erros.
3. Só então marcar W3 done / `pipeline:state close`.

Mesma condição do ticket-irmão — os dois tickets da branch fecham juntos no rebase.
