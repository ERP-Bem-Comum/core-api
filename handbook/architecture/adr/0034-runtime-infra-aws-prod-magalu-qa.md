[← Voltar para ADRs](./README.md)

# ADR-0034: Infra de runtime — PROD na AWS (EC2 + Compose + RDS + S3), QA na Magalu Cloud (mirror)

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Gabriel Aderaldo + Product Owner
- **Relacionado:** [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) (AWS primary, Magalu PBE), [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) (storage S3/MinIO), [ADR-0026](./0026-mysql-read-write-split-connection.md) (RW split), [ADR-0033](./0033-container-base-image-debian-glibc.md) (imagem glibc multi-arch), [ADR-0013](./0013-mysql-database-engine.md)/[ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (MySQL 8.4), [ADR-0011](./0011-supply-chain-hardening.md) (supply-chain), [ADR-0035](./0035-caddy-edge-reverse-proxy.md) (edge Caddy). **Origem:** `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md`.

---

## Contexto

O frontend v2 (TanStack Start, repo `bem_comum/frontend`) precisa, para lançar a v1, de um **ambiente de QA estável** para validar contra o `core-api` real e de um **prod**. Até aqui não havia runtime provisionado nem caminho de deploy.

O código impõe restrições concretas ao runtime:

- Container **always-on** com um **outbox poller** contínuo (ADR-0015) — descarta serverless de função (cold start, pool, limite de execução).
- **MySQL 8.4 com RW split** (ADR-0026; `readerUrl` ausente reusa o writer single-node).
- **S3** para documentos (ADR-0019); o cliente `@aws-sdk/client-s3` já fala com qualquer endpoint S3-compatível.
- **Fastify** (ADR-0025) precisa de TLS/reverse-proxy na frente.
- Imagem **multi-arch glibc** (ADR-0033), já buildada para amd64 + arm64.

Restrição de negócio: organização sem fins lucrativos, **custo é critério de primeira ordem** (precedente: decisão Bradesco/Windows economizando ~US$ 3.840/ano). O `compose.yaml` já antecipa: *"em produção este compose NÃO sobe — endpoints viram managed services (AWS S3, RDS)"*.

---

## Decisão

Adotar **duas infras gêmeas por container**, diferindo apenas nos endpoints managed:

### PROD — AWS

- **Compute:** 1× EC2 `t4g.small` (ARM/Graviton) rodando **Docker Compose** (mesma topologia do dev) com **Caddy** como edge (ADR-0035).
- **Banco:** **RDS MySQL `db.t4g.micro`** single-AZ, com backups automáticos + PITR (managed). RW split começa single-node (writer=reader); read-replica é evolução sem mexer no app (ADR-0026).
- **Storage:** **S3** para documentos (ADR-0019).
- **Registry:** **ECR** (imagem multi-arch arm64).
- **Deploy keyless:** GitHub Actions via **OIDC** (`id-token: write`) assume uma IAM role de curta duração; o passo de deploy é `compose pull && up -d` via **SSM Run Command** (sem chave AWS nem SSH longa em secret). Secrets de runtime (senha RDS, credenciais S3) no **Secrets Manager**.

### QA — Magalu Cloud (PBE/LGPD)

- **Compute:** VM (computing) rodando **o mesmo Docker Compose** + Caddy.
- **Banco:** **MySQL 8.4 container** + volume (block-storage). QA não exige durabilidade gerenciada.
- **Storage:** **object-storage Magalu** (S3-compatível) — mesmo `@aws-sdk/client-s3`.
- **Deploy:** automático em `push` na `main` (após imagem verde).

### Paridade

Os três ambientes (dev/QA/prod) usam **a mesma imagem multi-arch** e a **mesma topologia** (app + edge + mysql + s3-compat). Só os endpoints de DB/storage mudam para managed em prod. O `Caddyfile` é o mesmo; subdomínios variam por ambiente.

### Caminho de escala (sem refactor do app)

Quando tráfego/HA exigir, trocar EC2 single-instance por **ECS Fargate + ALB** (ALB assume o TLS, Caddy sai ou recua). Os containers permanecem idênticos.

---

## Consequências

### Positivas

- **Front destravado** com QA real e prod econômico.
- **Paridade dev↔QA↔prod** elimina a classe "só quebra em produção".
- **Custo baixo** (~US$ 25–40/mês): `t4g.small` + `db.t4g.micro` single-AZ + S3, sem ALB/NAT caros.
- **Deploy seguro** (OIDC keyless, sem segredo longo).
- **RDS managed** protege o dado da ONG (backups/PITR).

### Negativas

- **EC2 single-instance = SPOF.** Aceito para a v1; o dado está no RDS managed; caminho ECS+ALB desenhado.
- **Operação manual da VM/EC2** (patch do SO). Mitigação: imagem mínima, IaC reprodutível, recriação fácil.
- **Dois provedores** (AWS + Magalu) aumentam a superfície de credenciais. Mitigação: paridade por container + IaC nos dois.

### Neutras

- A escolha não toca `domain`/`application`/`adapters` — é puramente de runtime/infra.
- O `compose.yaml` de dev continua o mesmo; prod/QA derivam dele com overrides de endpoint.

---

## Alternativas Consideradas

### A. ECS Fargate + ALB (AWS)

**Rejeitada (por ora):** o ALB tem custo fixo (~US$ 18/mês só ele) e, com dois deployables (core-api + frontend), o total contraria o critério "mais econômico possível". É o **estado-alvo de escala**, não o de partida.

### B. AWS App Runner

**Rejeitada:** custo de compute por instância maior que EC2 e menos controle (sem sidecar/edge custom); VPC connector para o RDS adiciona complexidade sem ganho na v1.

### C. Lightsail Containers

**Rejeitada:** mais barato, mas troca flexibilidade cloud-native por simplicidade; o caminho de saída para ECS exige re-trabalho de infra. EC2+Compose dá a mesma economia preservando o caminho de escala.

### D. Aurora Serverless v2 / on-box MySQL em prod

**Rejeitadas:** Aurora Serverless tem piso de ACU mais caro que `db.t4g.micro` e é overkill para o tráfego de v1; MySQL no próprio container em prod economiza ~US$ 15/mês mas sacrifica backups/PITR gerenciados — mau negócio para o dado de uma ONG. RDS gerenciado é a escolha (decisão fixada pelo dono).

---

## Quando Re-avaliar

- Tráfego/SLA exigir **HA multi-AZ** → migrar para ECS Fargate + ALB (alternativa A).
- Custo do RDS virar problema → reavaliar instância/replica.
- Magalu deixar de atender requisitos de PBE/LGPD para o QA → reconsiderar o provedor de homologação.

---

## Referências

- [ADR-0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md) — AWS primary, Magalu PBE.
- [ADR-0019](./0019-document-storage-s3-with-minio-dev.md) — storage S3/MinIO (mesmo cliente em QA/prod).
- [ADR-0026](./0026-mysql-read-write-split-connection.md) — RW split (single-node agora).
- [ADR-0033](./0033-container-base-image-debian-glibc.md) — imagem multi-arch glibc.
- [ADR-0035](./0035-caddy-edge-reverse-proxy.md) — Caddy como edge.
- `.claude/.planning/EPIC-DEVOPS-FOUNDATION.md` — épico que originou esta decisão.
