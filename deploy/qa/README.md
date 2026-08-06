# `deploy/qa/` — a topologia REAL do ambiente de QA

> **Espelho, não fonte.** Estes arquivos são cópia fiel do que roda em `/opt/erp-qa/` na VPS de QA,
> capturada em **2026-08-06**. O host continua sendo a fonte de verdade: o `deploy.sh` lá é o que o
> workflow `deploy-qa.yml` executa. Isto existe para que a divergência seja **visível e auditável**,
> não para substituir o host.

## Por que isto foi versionado

O compose do QA vivia **só no host**, editado à mão. A consequência foi medida, não suposta:

- Em **2026-08-05**, o `deploy-qa` falhou porque o `docker compose --wait` esperava por
  `erp-bem-comum-qa-core-api-outbox-contracts-1` — container que o [#407 Fatia 2](https://github.com/ERP-Bem-Comum/core-api/issues/407)
  **aposentou** no `compose.yaml` versionado ao consolidar 6 workers em 3.
- O repositório dizia uma coisa; o ambiente rodava outra; e ninguém conseguia comparar sem
  abrir SSH.

Registrado como achado **I2** da [Inquiry-0027](../../handbook/inquiries/0027-teses-orfas-de-branches-contaminadas.md)
e como ação em aberto do [Incident-0002](../../handbook/incidents/0002-ghcr-oauth-transitorio-deploy-qa-2026-08-06.md).

## O drift, medido em 2026-08-06

|          | `compose.yaml` (raiz, versionado) | `deploy/qa/compose.yaml` (host real) |
| :------- | :-------------------------------- | :----------------------------------- |
| Workers  | **3** consolidados                | **6** separados                      |
|          | `worker-outbox`                   | `core-api-outbox-contracts`          |
|          | `worker-projections`              | `core-api-outbox-partners`           |
|          | `worker-email`                    | `core-api-supplier-projection`       |
|          |                                   | `core-api-contract-count-projection` |
|          |                                   | `core-api-email-dispatch`            |
|          |                                   | `core-api-sweeper`                   |
| Edge     | ausente                           | **`caddy`** + `Caddyfile`            |
| Frontend | ausente                           | **`web`**                            |

O QA está na topologia **anterior** ao #407. A consolidação por `WORKER_GROUP` nunca chegou lá.

O `caddy` merece nota própria: ele confirma a tese **T5c** da Inquiry-0027 — o ADR de adoção do Caddy
nunca entrou no repositório (o número foi reaproveitado por outro ADR), mas o serviço roda em QA há
meses. A decisão venceu na prática sem nunca ter sido registrada.

## Segurança — o que NÃO está aqui

O repositório é **público**. Antes de copiar, foi verificado que:

- as **8** URLs `mysql://` do compose são todas `${VAR}` — nenhuma credencial literal;
- há **17** referências a `/run/secrets` — segredos são file-based, injetados no host;
- **zero** `env_file` inline.

**Nunca copiar para cá:** `/opt/erp-qa/.env`, `/opt/erp-qa/secrets/`, nem qualquer arquivo `*.bak`
do host (podem conter estado anterior à rotação de segredos).

## Como reconciliar

Duas saídas legítimas, e a escolha é de operação:

1. **Alinhar o QA ao repositório** — aplicar o #407 no host, passando de 6 workers para 3 com
   `WORKER_GROUP`. Fecha o drift na direção certa, mas exige janela.
2. **Trazer o que o QA tem de a mais** — `caddy` e `web` não são drift acidental: são serviços reais
   que o `compose.yaml` da raiz deveria conhecer.

Enquanto nenhuma acontece, este diretório é o que torna a diferença legível — e o que impede que a
próxima falha de deploy custe uma investigação por SSH.

## Atualizar este espelho

```bash
tailscale ssh ubuntu@100.91.155.0 'cat /opt/erp-qa/compose.yaml' > deploy/qa/compose.yaml
tailscale ssh ubuntu@100.91.155.0 'cat /opt/erp-qa/Caddyfile'    > deploy/qa/Caddyfile
tailscale ssh ubuntu@100.91.155.0 'cat /opt/erp-qa/deploy.sh'    > deploy/qa/deploy.sh
```

Reveja o diff antes de commitar: um `.env` ou credencial que apareça no host chegaria aqui junto.
