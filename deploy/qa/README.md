# Topologia do QA — o dono é o `ERP-INFRA`

> **Não há arquivo de infraestrutura aqui, e não deve haver.** A topologia do ambiente de QA vive em
> [`ERP-INFRA/platform/vps-qa/`](https://github.com/ERP-Bem-Comum/ERP-INFRA/tree/main/platform/vps-qa) —
> `compose.yaml`, `Caddyfile`, `deploy.sh`, `init-secrets.sh`. Este diretório existe só para registrar
> um drift medido a partir daqui, e para apontar o caminho.

## Por que este arquivo existe

Em **2026-08-05** o `deploy-qa` deste repositório falhou: o `docker compose --wait` esperava por
`erp-bem-comum-qa-core-api-outbox-contracts-1`, container que o
[#407 Fatia 2](https://github.com/ERP-Bem-Comum/core-api/issues/407) **aposentou** no `compose.yaml`
da raiz ao consolidar 6 workers em 3.

A falha acontece aqui; a causa mora lá. O registro fica onde a falha aparece.

## O drift, medido em 2026-08-06

Capturado de `ubuntu@erp-bem-comum-qa:/opt/erp-qa/`:

|          | `compose.yaml` (raiz deste repo)      | VPS de QA                            |
| :------- | :------------------------------------ | :----------------------------------- |
| Workers  | **3** consolidados por `WORKER_GROUP` | **6** separados                      |
|          | `worker-outbox`                       | `core-api-outbox-contracts`          |
|          | `worker-projections`                  | `core-api-outbox-partners`           |
|          | `worker-email`                        | `core-api-supplier-projection`       |
|          |                                       | `core-api-contract-count-projection` |
|          |                                       | `core-api-email-dispatch`            |
|          |                                       | `core-api-sweeper`                   |
| Edge     | ausente                               | **`caddy`** + `Caddyfile`            |
| Frontend | ausente                               | **`web`**                            |

**O QA está na topologia anterior ao #407.** A consolidação por `WORKER_GROUP` nunca chegou lá.

O `caddy` fecha um ciclo próprio: a tese **T5c** da
[Inquiry-0027](../../handbook/inquiries/0027-teses-orfas-de-branches-contaminadas.md) registrou que o
ADR de adoção do Caddy nunca entrou neste repositório — o número foi reaproveitado por outro ADR — mas
que o serviço estaria rodando. Está, com `Caddyfile` próprio, há meses. Decisão que venceu na prática
sem nunca ter sido registrada.

## O que o levantamento revelou sobre o próprio versionamento

O `ERP-INFRA` **já versionava** essa topologia. O que falhou não foi a ausência de mecanismo: o
compose de lá era de **30/06**, a VPS foi editada à mão em **15/07**, e a mudança nunca voltou —
**39 linhas** de divergência com serviços idênticos.

O mecanismo existia e foi abandonado. Sincronizado em
[ERP-INFRA#27](https://github.com/ERP-Bem-Comum/ERP-INFRA/pull/27).

## Como reconciliar

Duas saídas legítimas, e a escolha é de operação:

1. **Alinhar o QA ao repositório** — aplicar o #407 no host, de 6 workers para 3 com `WORKER_GROUP`.
   Fecha o drift na direção certa, mas exige janela.
2. **Trazer o que o QA tem a mais** — `caddy` e `web` não são drift acidental: são serviços reais que
   o `compose.yaml` da raiz deveria conhecer.

Enquanto nenhuma acontece, esta página é o que impede que a próxima falha de deploy custe uma
investigação por SSH.

## Referências

- [`ERP-INFRA/platform/vps-qa/`](https://github.com/ERP-Bem-Comum/ERP-INFRA/tree/main/platform/vps-qa) — a topologia, versionada
- [Incident-0002](../../handbook/incidents/0002-ghcr-oauth-transitorio-deploy-qa-2026-08-06.md) — onde este drift virou ação em aberto
- [Inquiry-0027](../../handbook/inquiries/0027-teses-orfas-de-branches-contaminadas.md) §I2 e §T5c
