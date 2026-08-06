# Branches arquivadas — 2026-07-31

Seis branches paradas foram removidas na limpeza. **Nada foi perdido**: cada uma tem uma tag
`archive/<nome>` que preserva o commit indefinidamente.

Recuperar qualquer uma:

```bash
git checkout -b <nome> archive/<nome>
```

| Branch                            | Commits | Diff             | Conteúdo                                     | Merge nesta branch                                              |
| --------------------------------- | ------: | ---------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `feat/contract-contractor-ref`    |       1 | 51 arq · +1.893  | Vínculo do contratado no agregado `Contract` | ❌ 37 conflitos — a `dev` resolveu por outro desenho (ADR-0046) |
| `fix/auth-user-password-optional` |       1 | 20 arq · +835    | `passwordHash` opcional para federados/OIDC  | ❌ 4 conflitos                                                  |
| `feat/legacy-etl-programs`        |       1 | 25 arq · +1.222  | ETL legado→core de `programs` (fatia 1/32)   | ❌ 2 conflitos                                                  |
| `wip/368-deadman-parked`          |       1 | 16 arq · +2.043  | Estaciona o fix do #368 (despriorizado p3)   | ✅                                                              |
| `chore/extrai-website`            |       1 | 28 arq · −14.582 | Extrai o website para repositório próprio    | ✅                                                              |
| `005-gestao-usuarios`             |       1 | 1 arq · 1 linha  | Marca `T052` concluída num doc de spec       | ✅                                                              |

## O que ainda pode valer a pena

**`fix/auth-user-password-optional`** ficou relevante de novo: o [ADR-0055](handbook/architecture/adr/0055-cognito-external-idp-supersedes-0024-authn.md)
tornou o Cognito a autoridade de autenticação, e essa branch faz exatamente o que a migração precisa.
Vale revisitar quando a issue #603 for executada.

**`feat/legacy-etl-programs`** é a fatia 1 de 32 de um ETL. Conflita só em `scripts/etl/`, o que sugere
que a base evoluiu — mas o desenho pode ser reaproveitável.

## O que provavelmente não vale

**`feat/contract-contractor-ref`** conflita em 37 arquivos porque a `dev` já entrega `contractor` por
outro caminho (ADR-0046, `contractorRef` via wire-format do outbox). É trabalho paralelo superado.

**`005-gestao-usuarios`** altera uma linha de documentação de uma spec já fechada.
