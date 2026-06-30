# 000 — Request CTR-ADAPTERS-RENAME-PORT-PREFIX

> **Aplicar padrão `<port>.<tech>.ts` aos adapters InMemory + Logger. Size S.**
> Renomeia 4 arquivos source + 4 tests + atualiza imports. Aplica padrão JÁ presente em `persistence/repos/` (que usa `contract-repository.in-memory.ts`, `outbox-repository.drizzle.ts`).

## Justificativa

Após `CTR-ADAPTERS-FOLDER-REORG`, 3 arquivos compartilham basename `in-memory.ts`:
- `event-delivery/in-memory.ts`
- `outbox/in-memory.ts`
- `storage/in-memory.ts`

Colide em IDE tabs / stack traces curtos. Inconsistente com `persistence/repos/` que JÁ segue `<port>.<tech>.ts`.

## Renomeações

### Source

| De | Para |
| :--- | :--- |
| `event-delivery/in-memory.ts` | `event-delivery/event-delivery.in-memory.ts` |
| `event-delivery/logger.ts` | `event-delivery/event-delivery.logger.ts` |
| `outbox/in-memory.ts` | `outbox/outbox.in-memory.ts` |
| `storage/in-memory.ts` | `storage/document-storage.in-memory.ts` |

### Tests (mirror)

| De | Para |
| :--- | :--- |
| `event-delivery/in-memory.test.ts` | `event-delivery/event-delivery.in-memory.test.ts` |
| `event-delivery/logger.test.ts` | `event-delivery/event-delivery.logger.test.ts` |
| `outbox/in-memory.test.ts` | `outbox/outbox.in-memory.test.ts` |
| `storage/in-memory.test.ts` | `storage/document-storage.in-memory.test.ts` |

## NÃO renomear

- `storage/s3-config-aws.ts` (futuro W1 S3) — config builder, **não é adapter de port**.
- `storage/s3-error-mapper.ts` (futuro W1 S3) — error mapper utility, idem.
- `persistence/repos/*` — já seguem o padrão.

## Side-effect no W0 RED do `CTR-STORAGE-S3-ADAPTER`

O test `s3.integration.test.ts` (em RED esperado) importa `#src/.../storage/s3.ts` — esse path agora muda para **`document-storage.s3.ts`** no W1 do S3-ADAPTER. Atualizo o import deste ticket para apontar para o novo path antecipado.

`s3-config-aws.test.ts` e `s3-error-mapper.test.ts` não mudam (utilities).

## Critérios de aceitação

- **CA1** — 4 source files renomeados conforme padrão `<port>.<tech>.ts`.
- **CA2** — 4 test files renomeados mirror.
- **CA3** — Todos os imports atualizados (`#src/...` + relativos).
- **CA4** — Suite global excluindo `tests/infra/**` mantém os MESMOS números antes/depois (zero regressão).
- **CA5** — Padrão consistente em todo `adapters/` (apenas adapters, não utilities).
- **CA6** — Estado RED herdado do `CTR-STORAGE-S3-ADAPTER` W0 continua RED, mas import path no `s3.integration.test.ts` atualizado para `document-storage.s3.ts` (novo nome antecipado para W1).
- **CA7** — Format check OK.

## Risco

1. **Quantidade de imports a atualizar** — 4 paths antigos, ~15+ ocorrências em src/tests/. Mitigação: sed batch + grep de verificação.
2. **Update no `s3.integration.test.ts`** — arquivo de outro ticket. Justificável porque o nome `document-storage.s3.ts` ainda não existe; apenas anteciparemos o nome correto para o W1 daquele ticket pegar.
