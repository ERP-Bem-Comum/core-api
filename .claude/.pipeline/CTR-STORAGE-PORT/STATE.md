# Estado do Ticket CTR-STORAGE-PORT

> Port `DocumentStorage` + Value Objects da fronteira S3.
> Primeiro ticket da sequência derivada de [ADR-0019](../../../../handbook/architecture/adr/0019-document-storage-s3-with-minio-dev.md).

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED | ✅ completed | `ts-domain-modeler` | resumo no chat (002-tests/) |
| W1 — GREEN | ✅ completed | `ts-domain-modeler` + `ports-and-adapters` | resumo no chat (003-impl/) |
| W2 — REVIEW | ✅ completed (APPROVED, round 1) | `code-reviewer` | resumo no chat (004-code-review/) |
| W3 — QUALITY | ✅ completed | `ts-quality-checker` | resumo no chat (005-quality/) |

## Próximo passo

Ticket **CTR-STORAGE-INMEMORY** — adapter InMemory que pluga em `documentStorageContract(makeStorage)`.

## Notas

- **Sem adapter neste ticket.** Adapters concretos vêm em CTR-STORAGE-INMEMORY e CTR-STORAGE-S3-ADAPTER.
- **Sem AWS SDK neste ticket.** Zero dependências novas no `package.json`.
- **Sem CLI neste ticket.** CLI ganha `subir-documento` em CTR-CLI-UPLOAD.
- **Sem agregado `DocumentoContratual` neste ticket.** Agregado vem em CTR-DOCUMENT-AGGREGATE.
- Validações de `BucketName` e `StorageKey` devem replicar **literalmente** as regras documentadas pela AWS S3 — todo afastamento exige justificativa em comentário do código + atualização do ADR-0019.
