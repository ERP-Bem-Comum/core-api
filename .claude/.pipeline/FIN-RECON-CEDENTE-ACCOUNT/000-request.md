# FIN-RECON-CEDENTE-ACCOUNT — Conta Cedente para Conciliação (extensão)

> Origem: issue #138 / feature SDD `019-fin-recon-cedente-account` (spec/plan/research/tasks em `specs/019-fin-recon-cedente-account/`). Raiz da cadeia de conciliação — destrava #120 e o guard `account-closed` da #123.

## Escopo

**NÃO é greenfield.** Estende o agregado `fin_cedente_accounts` já existente (criado pela 016/CNAB) com os campos de conciliação; adiciona use-cases e borda HTTP; completa o guard de conta encerrada no import.

1. **Domínio (estender)**: `type` (`corrente|poupanca|investimento`), `nickname`, `bankName`, `openingBalanceCents` (opcional) + `openingBalanceDate` (opcional, par coeso). Reusa `create`/`close()`/`isClosed`/status `Active|Closed`.
2. **Use-cases (novos)**: `createCedenteAccount` (rejeita duplicata), `listCedenteAccounts`, `closeCedenteAccount`, `editCedenteAccount` (trava dados bancários após histórico).
3. **Borda HTTP**: `POST/GET/GET:id/PATCH /api/v2/financial/cedente-accounts` + `POST /:id/close` (Fastify+Zod, permissão `bank-account:read|write`).
4. **Guard**: conta encerrada bloqueia import (`import-bank-statement`, FR-011) e conciliação (`confirm-reconciliation` — **já existe**).
5. **Persistência**: migration `0009` ALTER TABLE ADD COLUMN nullable + UNIQUE INDEX (banco+agência+conta+dígito).

## Critérios de aceitação (resumo — detalhe na spec)

- **CA-US1**: criar conta (banco código+nome, tipo, agência, conta+DV, apelido) → `status=ativa`; listar e consultar por id; rejeitar duplicata (FR-016) e `type` inválido.
- **CA-US2**: encerrar → `status=encerrada`; já encerrada → `cedente-account-already-closed`; conta encerrada rejeita **import** (`account-closed`, FR-011) e **conciliação** (FR-012, já existe).
- **CA-US3**: editar; sem histórico edita tudo; com histórico só apelido/bankName, dados bancários → `cedente-account-bank-data-locked` (FR-008).
- **CA-US4**: saldo de abertura + data opcionais (par coeso, FR-006) habilitam conciliação retroativa; ausência → conta válida (não-quebrante, FR-013).

## Decisões travadas (clarify 2026-06-19)

- Permissão dedicada `bank-account:read|write`. Trava de dados bancários após histórico. Unicidade por chave natural.
- `create` **não** reusa o `save()` upsert (research D2). `onDuplicateKeyUpdate` é permitido por ADR-0020:93.

## Fora de escopo

Saldo "ao vivo" (Open Finance); read-model/grid de saldo consolidado (issue separada).

## DoD

W0→W3 verde + teste do guard de conta encerrada (import + conciliação). Princípio IX (citação ACDG) pendente — ancorar no W2.
