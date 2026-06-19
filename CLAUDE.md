# CLAUDE.md

> Este arquivo é um **stub**. O contexto canônico deste repo vive em `AGENTS.md`
> (padrão aberto, multi-ferramenta). O Claude Code carrega o conteúdo via import abaixo.

@AGENTS.md

<!-- SPECKIT START -->

Plano corrente: `specs/019-fin-recon-cedente-account/plan.md` (Conta Cedente para Conciliação / issue #138, raiz da cadeia de conciliação — destrava #120/#123) no módulo `financial`. **Não é greenfield**: estende o agregado `fin_cedente_accounts` já existente (criado pela 016/CNAB) com campos de conciliação (`tipo`, `apelido`, `bankName`, `saldoAberturaCents`, `dataSaldoAbertura`); adiciona use-cases `create/edit/close/list` + a borda HTTP `/api/v2/financial/cedente-accounts` (CRUD + `/:id/close`); permissão `bank-account:read|write`; completa o guard `account-closed` no `import-bank-statement` (FR-011 — em `confirm-reconciliation` já existe). Migration `0009`: `ALTER TABLE ADD COLUMN` **nullable** (não-quebrante) + `UNIQUE INDEX` (banco+agência+conta+dígito — FR-016). Decisões (clarify): permissão dedicada; trava dados bancários após histórico (FR-008); unicidade por chave natural (FR-016). Design em `research.md` (D2: create ≠ `save()` upsert; ADR-0020:93 permite `ON DUPLICATE KEY UPDATE`). Tamanho **M**, 1 ticket (fatiável em DOMAIN-APP + HTTP). Princípio IX: citação canônica (Evans/Vernon) ⚠️ **PENDENTE** (base ACDG indisponível). (Plano da Conciliação 017 preservado em `specs/017-fin-conciliacao-bancaria/plan.md`.)
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan.

<!-- SPECKIT END -->
