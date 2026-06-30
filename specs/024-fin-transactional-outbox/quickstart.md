# Quickstart — Validar a 024 (outbox transacional do Financeiro)

## O que muda

Introduz a tabela `fin_outbox` e grava estado + evento na **mesma transação** nos repos do Financeiro (documento + conciliação). Os use-cases param de fazer `outbox.append` separado.

## Verificação por testes (W0→W3)

```bash
# Unit: rollback in-memory (outbox que falha → estado não persiste) + paridade dos repos
pnpm test -- --test-name-pattern="outbox"

# Integração (Docker/MySQL): injeta falha entre estado e outbox → COUNT == baseline
pnpm run test:integration:financial

# Gate W3 completo
pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test
```

**Antes do fix (RED)**: não existe `save`-com-eventos-na-tx; o outbox nem é MySQL (in-memory). O teste que injeta falha no outbox vê o estado **persistido** e o evento **perdido**.

**Depois (GREEN)**: caminho feliz grava estado + `fin_outbox` na mesma tx; falha no outbox reverte tudo (`COUNT(fin_documents)`/`COUNT(fin_payables)` e `COUNT(fin_outbox)` == baseline).

## Migration

```bash
# após editar schema.ts (tabela finOutbox espelhando ctrOutbox):
pnpm run db:generate   # gera a migration fin_outbox; versionar o .sql
```

## Critérios de pronto (mapeiam SC/CA)

- [ ] CA1/SC-002: falha no INSERT do outbox → documento não persiste; retorna slug de erro.
- [ ] CA2: estado + evento na mesma `db.transaction` (documento E conciliação) — integração prova `COUNT == baseline` ao injetar falha.
- [ ] CA3: falha de constraint no outbox reverte a tx; estado anterior preservado; sem vazar `Error`.
- [ ] SC-001: sucesso → estado e evento duráveis (recuperáveis após reinício).
- [ ] FR-006: idempotência por PK `event_id`.
- [ ] Gate W3 verde + `test:integration:financial` (Docker).
