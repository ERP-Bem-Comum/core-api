[← Voltar para ADRs](./README.md)

# ADR-0071: O S3 de dev/teste passa a ser o fork Silo — `minio/minio` e `minio/mc` sumiram do Docker Hub

- **Status:** Accepted
- **Date:** 2026-10-01
- **Deciders:** Tech Lead (Gabriel)
- **Supersedes (parcial):** [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) — só na **fonte da imagem** do S3 local: o compose deixa de referenciar a imagem oficial `minio/minio` (e o cliente `minio/mc`) e passa a referenciar o fork **Silo** (`pgsty/silo`, `pgsty/mc`). O resto do ADR-0019 segue vigente: S3 em produção, um servidor MinIO-compatível em dev/teste, o mesmo SDK oficial da AWS com `forcePathStyle`, e a análise de licença AGPLv3.
- **Relates:** [#1026](https://github.com/ERP-Bem-Comum/core-api/issues/1026) · [ADR-0011](./0011-supply-chain-hardening.md) (pin por digest, justificativa de dependência)

## Contexto

A MinIO **apagou** os repositórios `minio/minio` e `minio/mc` do Docker Hub em 2026-09-11, sem anúncio
oficial. Foi o passo final de uma sequência: distribuição comunitária "source-only" desde out/2025,
modo manutenção em dez/2025, repositórios arquivados em 2026 (`archived: true` no GitHub). O espelho
indicado pela própria MinIO, `quay.io/minio/*`, responde `unauthorized` a pull anônimo — medido em
2026-10-01 com tag de release.

Consequência: **nenhuma tag nem digest** do MinIO oficial é baixável sem login. O workflow
`integration` falha todo dia na `main` desde 2026-09-12 (`storage`, `logo`, `photo` → `gate`), três
suítes de integração de storage estão sem rodar em CI, e um clone novo não sobe o `docker compose`.

## Decisão

O serviço `minio` do `compose.yaml` passa a usar **`pgsty/silo`** e o `minio-bootstrap` passa a usar
**`pgsty/mc`**, ambos pinados por digest do índice multi-arch (amd64 + arm64). Nomes de serviço,
variáveis `MINIO_*`, secrets, healthcheck e bootstrap **não mudam**.

### Por que o Silo

Seis hipóteses foram testadas em containers isolados (registro completo na #1026), cada uma contra as
**quatro suítes reais do CI** e contra o que o compose exige além da API S3 (`*_FILE`, `curl` +
`/minio/health/ready`, o `command` do serviço, bootstrap `mc` com versionamento e download anônimo):

| Hipótese | Suítes S3 | Drop-in no compose | Por que não / por que sim |
|---|---|---|---|
| `quay.io/minio/minio` | — | — | `unauthorized`: não baixa |
| `bitnamilegacy/minio` | 22/22 | não (o `command` derruba o container) | imagem **congelada**, sem patches (Bitnami, ago/2025) |
| **`pgsty/silo`** | **22/22** | **sim, 4/4** | fork **mantido** (releases mensais), **mesma licença** (AGPLv3) |
| MinIO compilado do fonte | 22/22 | sim | upstream **arquivado**: viraríamos mantenedores de segurança de um servidor S3 |
| RustFS | 22/22 | não (`RUSTFS_*`, sem `MINIO_ROOT_*_FILE`) | Apache-2.0, comunidade grande — exige refazer serviço e bootstrap |
| SeaweedFS | 22/22 | não (outro modelo de credencial/comando) | Apache-2.0, maduro — idem |

O controle (a imagem original, ainda em cache local) passou em tudo, então o harness distingue
candidato bom de ruim.

A licença do Silo foi conferida na fonte primária (API do GitHub: `AGPL-3.0`) — uma página secundária
consultada dizia Apache-2.0, e estava errada. Com a mesma licença, a análise de copyleft do ADR-0019
se aplica sem mudança: o compose **referencia** a imagem, não copia nem redistribui.

## Consequências

- **Custo aceito — bus factor:** o Silo é um fork de um mantenedor principal (pgsty / Pigsty), criado
  em out/2025. Se parar, o compose volta a apodrecer do mesmo jeito.
- **Gatilho de reversão / saída:** se o Silo deixar de publicar imagem ou de corrigir CVE, migrar
  para o **RustFS** (Apache-2.0), que passou nas mesmas suítes, ao custo de reescrever o serviço e o
  bootstrap (variáveis `RUSTFS_*`). Essa troca, sim, mudaria o "MinIO-compatível" do ADR-0019 e pede
  ADR próprio.
- **Produção não muda:** produção é AWS S3 (ADR-0021); o Silo só existe no compose de dev/teste e no CI.
- **Não verificado localmente:** o `security_opt: no-new-privileges` do serviço. O Docker de quem
  testou é o snap da Canonical, que não executa nenhum container com essa flag; o CI do PR que
  introduz este ADR é a prova.
