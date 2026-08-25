[← Voltar para Arquitetura](../README.md)

# 📋 Architecture Decision Records (ADRs)

> Registros das decisões arquiteturais relevantes do projeto. **Imutáveis. Auditáveis.**

---

## 1. O Que é ADR

Um **ADR (Architecture Decision Record)** é um documento curto que captura uma decisão arquitetural significativa, junto com seu contexto e consequências.

> **ADR é imutável.** Uma vez aceito, não é editado.
>
> Quando uma decisão é revisada, cria-se um **ADR novo** que `supersedes` o anterior. O ADR antigo permanece como evidência histórica.

---

## 2. Por Que ADRs

| Benefício                  | Detalhe                                                           |
| :------------------------- | :---------------------------------------------------------------- |
| **Auditoria**              | Em 2 anos, qualquer pessoa entende por que uma decisão foi tomada |
| **Onboarding**             | Novos membros leem o histórico de decisões                        |
| **Disciplina**             | Forçar a justificativa por escrito reduz decisões mal pensadas    |
| **Memória organizacional** | Decisões não morrem quando alguém sai do time                     |

---

## 3. Como Escrever um ADR

1. Pegar o próximo número livre (`NNNN-`) e copiar o template abaixo.
2. Preencher cada seção honestamente, **incluindo alternativas rejeitadas**.
3. Submeter como PR para revisão.
4. Depois de aceito, mover de `Status: Proposed` para `Status: Accepted`.
5. Atualizar o índice nesta página.
6. Adicionar entrada no [`../../CHANGELOG.md`](../../CHANGELOG.md).

---

## 4. Template

```markdown
# ADR-NNNN: <Título curto da decisão>

- **Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** <quem aprovou>

## Contexto

<O problema que a decisão resolve. Restrições, premissas, forças em jogo.>

## Decisão

<O que foi decidido, em frase curta e direta.>

## Consequências

### Positivas

- ...

### Negativas

- ...

### Neutras

- ...

## Alternativas Consideradas

### A. <Nome da alternativa>

<O que era, por que foi rejeitada.>

### B. <Outra alternativa>

...

## Quando Re-avaliar

<Critérios objetivos que disparam revisão da decisão.>

## Referências

- Links para documentação, ADRs relacionados, etc.
```

---

## 5. Índice de ADRs

| #                                                              | Título                                                                                                                                   | Status                                | Data       |
| :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------ | :--------- |
| [0001](./0001-strangler-fig-over-rewrite.md)                   | Estratégia Strangler Fig sobre Big Bang ou Refactor                                                                                      | Accepted                              | 2026-04-27 |
| [0002](./0002-keep-nodejs-runtime.md)                          | Manter Node.js como runtime nesta fase                                                                                                   | Accepted                              | 2026-04-27 |
| [0003](./0003-shared-db-isolated-schemas.md)                   | Banco compartilhado com schemas isolados                                                                                                 | **Superseded by 0014**                | 2026-04-27 |
| [0004](./0004-postgres-outbox-pattern.md)                      | Postgres Outbox como bus de eventos inicial                                                                                              | **Superseded by 0015**                | 2026-04-27 |
| [0005](./0005-thin-bff-gateway.md)                             | BFF Gateway burro (apenas roteamento) — **supersessão parcial pelo [0059](./0059-bff-aggregates-without-business-rules.md)**: "Zero composição de respostas" e o alvo de 200-300 linhas caem; "zero regra de negócio", roteamento e cross-cutting permanecem                                                                                                    | Accepted (supersedes parcial por 0059)                              | 2026-04-27 |
| [0006](./0006-modular-monolith-core-api.md)                    | Modular Monolith para o `core-api` (granularidade de serviço)                                                                            | Accepted                              | 2026-04-27 |
| [0007](./0007-multi-cloud-aws-gcp.md)                          | Topologia Multi-Cloud (AWS legado + GCP novo)                                                                                            | **Superseded by 0021**                | 2026-04-28 |
| [0008](./0008-bradesco-integration-architecture.md)            | Arquitetura da Integração Bradesco (REST API + VAN via Windows VM). ⚠️ **O transporte da VAN (Adapter B — SSH/SFTP, `ssh2`, `ssh.exec`, envs `VAN_VM_SSH_*`/`STCPCLT_*`) foi superseded pelo [0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md).** O Adapter A (REST/mTLS — saldo e extrato) permanece **vigente e inalterado** | Accepted (VAN superseded por 0060)    | 2026-04-28 |
| [0009](./0009-node-24-typescript-6-with-7-roadmap.md)          | Node.js 24 LTS + TypeScript 6 com plano de migração para TS 7.0                                                                          | Accepted (supersedes parcial de 0002) | 2026-04-28 |
| [0010](./0010-email-port-adapter-pattern.md)                   | Email — Port & Adapter Pattern com Nodemailer inicial                                                                                    | Accepted                              | 2026-04-28 |
| [0011](./0011-supply-chain-hardening.md)                       | Supply Chain Hardening — Política de Dependências                                                                                        | Accepted                              | 2026-04-28 |
| [0012](./0012-pnpm-package-manager.md)                         | pnpm como Package Manager (legado e novo)                                                                                                | Accepted                              | 2026-04-28 |
| [0013](./0013-mysql-database-engine.md)                        | Engine de Banco de Dados — MySQL 8 (correção de assunção)                                                                                | Accepted                              | 2026-04-28 |
| [0014](./0014-mysql-database-isolation.md)                     | Isolamento por Database em MySQL (supersedes 0003)                                                                                       | Accepted                              | 2026-04-28 |
| [0015](./0015-mysql-outbox-pattern.md)                         | MySQL Outbox Pattern (supersedes 0004)                                                                                                   | Accepted                              | 2026-04-28 |
| [0017](./0017-correlation-keys-cross-period-audit.md)          | Chaves de correlação cross-período entre `legacy` e `core` (auditoria fiscal sob Strangler Fig)                                          | **Proposed**                          | 2026-05-07 |
| [0018](./0018-persistence-dual-dialect-drizzle.md)             | Persistência Dual-Dialect — Drizzle com MySQL (produção) e SQLite (dev/CI)                                                               | **Superseded by 0020**                | 2026-05-14 |
| [0019](./0019-document-storage-s3-with-minio-dev.md)           | Document Storage — AWS S3 (produção) com MinIO via Docker (dev/homologação)                                                              | Accepted                              | 2026-05-15 |
| [0020](./0020-mysql-only-supersedes-dual-dialect.md)           | MySQL como Único Dialeto de Persistência (supersedes 0018)                                                                               | Accepted                              | 2026-05-15 |
| [0021](./0021-aws-primary-magalu-pbe-supersedes-0007.md)       | Topologia Cloud — AWS (Codebit) Primária + MagaluCloud PBE Interno (supersedes 0007)                                                     | Accepted                              | 2026-05-22 |
| [0022](./0022-read-models-via-projection-over-event-stream.md) | Read-Models via Projeção sobre o Event Stream (Timeline agora, AuditLog diferido)                                                        | Accepted                              | 2026-05-26 |
| [0023](./0023-contract-lifecycle-pending-state.md)             | Ciclo de vida do Contrato — estado `Pendente` (4 estados)                                                                                | Accepted                              | 2026-05-27 |
| [0024](./0024-identity-and-rbac-auth-module.md)                | Identidade & RBAC — Módulo `auth` (identidade própria OIDC-ready, sessão híbrida, permissions granulares). ⚠️ **A parte de autenticação (fonte de identidade, emissão de token, refresh opaco) foi superseded pelo [0055](./0055-cognito-external-idp-supersedes-0024-authn.md).** O RBAC, o catálogo de permissões e a autorização pura permanecem **vigentes e inalterados** | Accepted (authN superseded por 0055) | 2026-05-27 |
| [0025](./0025-http-server-fastify-core-api.md)                 | Servidor HTTP no `core-api` com Fastify (adapter de borda, BFF continua burro)                                                           | Accepted                              | 2026-05-27 |
| [0026](./0026-mysql-read-write-split-connection.md)            | Read/Write Split de Conexão MySQL (writer/reader pools — Master-Slave ready)                                                             | Accepted                              | 2026-05-27 |
| [0027](./0027-zod-openapi-contract-first-http-edge.md)         | Zod + zod-openapi como contract-first da borda HTTP (validação de I/O + OpenAPI 3.1.1)                                                   | Accepted                              | 2026-05-27 |
| [0028](./0028-http-edge-shell-location.md)                     | Localização do shell HTTP de borda (`src/shared/http/`) e do composition root (`src/server.ts`) — verticalidade por feature              | Accepted                              | 2026-05-28 |
| [0029](./0029-pnpm-11-supply-chain-defaults.md)                | pnpm 11.x com defaults de supply-chain (supersedes 0012)                                                                                 | Accepted                              | 2026-05-30 |
| [0030](./0030-valkey-shared-store-deferred.md)                 | Store compartilhado (Valkey via ioredis) — adiado até multi-instância                                                                    | **Proposed**                          | 2026-05-30 |
| [0031](./0031-partners-registry-module.md)                     | Módulo `partners` — fronteira de Cadastros/Counterparties (supplier, financier, collaborator) migrada do legado                          | Accepted                              | 2026-06-01 |
| [0032](./0032-transient-http-composition-read-until-bff.md)    | Composição de leitura transitória no adapter HTTP (rota gorda com `Sunset`) até o BFF v2 — domínio intocado, cross-módulo via public-api | Accepted                              | 2026-06-02 |
| [0033](./0033-api-versioning-v1-legacy-mirror.md)              | Versionamento de API: `/api/v1` espelha o legado (Strangler Fig), `/api/v2` é o modelo novo; `buildApp` com prefixo por plugin           | Accepted                              | 2026-06-03 |
| [0034](./0034-adopt-bruno-api-client-cli.md)                   | Adoção do Bruno (API client Git-friendly) como ferramenta de smoke e2e da borda HTTP; coleções `.bru` em `api-collections/`, `bru` CLI   | Accepted                              | 2026-06-04 |
| [0035](./0035-partner-territory-soft-delete.md)                | Parceria territorial (estados/municípios) — Entity persistida com soft-delete (`active`+`deactivated_at`+CHECK); resolve D9 do ADR-0031   | Accepted                              | 2026-06-06 |
| [0036](./0036-act-partner-placeholder.md)                      | `Act` — novo tipo de parceiro PLACEHOLDER (clone enxuto do núcleo do Collaborator); provisório, regras de negócio pendentes              | Accepted (provisório)                 | 2026-06-06 |
| [0037](./0037-http-first-retire-embedded-cli.md)               | HTTP-first — aposenta a CLI embutida no core-api; validação E2E via Bruno (ADR-0034); CLI do domínio migra para `cli/` (binário `bc`). Supersede parcial do Princípio VII | Accepted | 2026-06-07 |
| [0038](./0038-bruno-cli-mandatory-and-bru-authoring.md)        | Coleções Bruno obrigatoriamente executadas via CLI + diretrizes de autoria `.bru`                                                       | Accepted | 2026-06-08 |
| [0039](./0039-contract-cancelled-state.md)                     | Ciclo de vida do Contrato — estado terminal `Cancelled` (5 estados)                                                                     | Accepted | 2026-06-09 |
| [0040](./0040-agent-findings-as-github-issues.md)              | Achados de agente viram GitHub Issues testáveis (tracker primário); contrato OpenAPI/`oasdiff` como evolução                            | Accepted | 2026-06-15 |
| [0041](./0041-specialized-workers-and-oneshot-jobs.md)         | Workers especializados por entrypoint + jobs one-shot via cron externo (sem job queue até multi-instância)                              | Accepted | 2026-06-16 |
| [0042](./0042-deadman-switch-redundant.md)                     | Dead-man's switch redundante (S3/R2 ⟂ GitHub Actions, JSONL append-only) para detecção de jobs mortos                                   | Accepted | 2026-06-16 |
| [0043](./0043-partners-supplier-integration-events.md)         | Contrato de eventos de integração `partners → financial` — `SupplierRegistered`/`SupplierEdited` publicados via outbox `par_outbox` (payload autocontido `{ supplierRef, name, document, occurredAt }`; at-least-once + idempotência) | Accepted | 2026-06-16 |
| [0044](./0044-cnpj-alphanumeric-kernel.md)                     | CNPJ alfanumérico (Serpro/Receita 2026) no VO `Cnpj` do kernel — módulo 11 com `ASCII − 48`, DVs numéricos, retrocompatível; estende ADR-0031 §4 | Accepted | 2026-06-16 |
| [0045](./0045-financial-supplier-read-model.md)                | Read-model de fornecedor no `financial` consumido do `par_outbox` (US2 #47) — worker em composition root, upsert com guard de `occurred_at`, backfill one-shot; estende ADR-0015/0022/0043 | Accepted | 2026-06-16 |
| [0046](./0046-contracts-contractor-ref-integration-events.md)  | Contrato de eventos `contracts → partners` — `contractorRef` aditivo ao wire-format v1 (Opção A) para o read-model `par_contract_count_view` (contagem de contratos nos grids, US6 #46); estende ADR-0022/0043 | Accepted | 2026-06-17 |
| [0047](./0047-transactional-email-via-producer-domain-event.md) | E-mail transacional como **evento de domínio no outbox do módulo produtor** (atomicidade do disparo na mesma tx; `notifications` vira consumidor) — fecha #134; estende ADR-0015/0010 | Accepted | 2026-06-18 |
| [0048](./0048-legacy-categorization-installments-mapping.md)    | **Anticorruption Layer** legado↔core (gate Camadas 0–2): reusar a categorização 020 (não portar `CostCenter→Category→SubCategory`/`releaseType`) + mapa `installments→payables` (`SUM(value WHERE PAGO)` → `'Paid'`) + dashboard fatiado; spike #233, conforma ADR-0001/0005/0006/0014 | Accepted | 2026-06-23 |
| [0049](./0049-core-api-bff-boundary.md)                        | **Fronteira core-api ↔ BFF**: core = Domain API (expõe dado cru já autorizado), BFF = Experience API (compõe view-model por tela); régua "banco agrega → core, monta/formata → BFF", contrato batch-by-id, authz/PII no core por escopo. Estado-alvo do ADR-0032 | Accepted | 2026-07-07 |
| [0050](./0050-document-reader-cascade-supersedes-0034.md)      | **Leitura de documento fiscal em cascata** (nativo-first): `XML → parser nativo (node:zlib) → OCR self-hosted → exceção manual`; port `DocumentReaderPort.read(bytes)` recebe bytes, nunca URL (anti-SSRF). **Supersedes ADR-0056** (renumerado de 0034 em 2026-07-31) | Accepted | 2026-07-08 |
| [0051](./0051-taxonomy-owner-budget-plan-scoped.md)            | **Owner da taxonomia**: hierarquia canônica de 4 níveis (**Plano → Centro → Categoria → Subcategoria**); `budget-plans` é dono do **planejável** (escopado por plano), `financial` lê a árvore **do plano do documento** via public-api (OHS+ACL) e retém só o **operacional** (`ajuste`/`Estorno` — sem origem legada). Define a regra do ETL. Fecha o follow-up do #341 (#448); complementa ADR-0048 §D1 | Accepted | 2026-07-15 |
| [0052](./0052-rbac-bypass-flag.md)                             | **Modo `AUTH_RBAC_MODE=bypass`**: desliga a autorização por permissão (todo autenticado é super-usuário), **mantendo** a autenticação. Bypass **total** — inclui a auto-gestão de RBAC (permite recuperação do #462). Guardas anti-silêncio: fail-secure (só `bypass` exato liga; typo → `enforced`), banner de boot, default `enforced`. Ligável em produção (decisão do dono); trade-off aceito de escalação persistida | Accepted | 2026-07-16 |
| [0053](./0053-sensitive-data-carve-out-rbac-bypass.md)         | **Carve-out de confidencialidade ao bypass**: permissão marcada como **sensível** (1ª: `collaborator:read-sensitive`) **não** é liberada pelo `AUTH_RBAC_MODE=bypass` — dado sensível (LGPD Art. 5º II: raça, identidade de gênero) não depende de env var para seguir protegido. Mesma estrutura do precedente `cannot-self-lockout` do 0052: sobrevive ao bypass o que o bypass não desfaz depois (integridade persiste; vazamento também). Complementa (não substitui) o 0052. **REJEITADO em 2026-07-20** (P.O.): durante a aceitação do sistema recém-entregue o acesso fica liberado a todo autenticado — paridade com o legado, necessidade de testar todos os módulos, cliente ciente; o **redesenho completo do RBAC** (com LGPD + regras do cliente) substitui este remendo. Ver §Desfecho | **Rejected** | 2026-07-16 |
| [0054](./0054-ai-assisted-contribution-policy.md)              | **Contribuição assistida por IA** (precedente do Linux kernel): trailer `Assisted-by: AGENT:MODEL` obrigatório em commit gerado/modificado por IA; **a IA nunca adiciona `Signed-off-by`** (só humano certifica o DCO); o humano é dono de cada linha e assume responsabilidade integral; mesmo processo W0→W3, sem trilha paralela | Accepted | 2026-07-23 |
| [0055](./0055-cognito-external-idp-supersedes-0024-authn.md)   | **Amazon Cognito como autoridade de autenticação** (decisão de diretoria) — supersede **parcial** do 0024 (fonte de identidade, emissão de token, refresh opaco). **A autorização permanece 100% no `core-api`**: nenhuma claim de RBAC no token, `cognito:groups` não é fonte de authZ. Vínculo por coluna neutra `external_subject` com find-or-link JIT que **nunca cria usuário**. Transição com dois verificadores isolados (ES256 legado × RS256 Cognito), flags fail-secure e desligamento em **3 superfícies**. Estado do PKCE em cookie selado `SameSite=Lax` (não em store); store compartilhado da sessão fica como dívida com gatilho na 2ª réplica | Accepted | 2026-07-29 |
| [0056](./0056-ocr-port-adapter.md)                             | **OCR como Port/Adapter Pattern** — `OcrPort.extract(pdfUrl)` com adapters `mock → Tesseract → Textract`. **Criado como `ADR-0034` e renumerado em 2026-07-31** (colisão de número com a adoção do Bruno). Superseded pelo [0050](./0050-document-reader-cascade-supersedes-0034.md), que reorienta para cascata nativo-first e troca URL por bytes (anti-SSRF) | **Superseded by 0050** | 2026-06-06 |
| [0057](./0057-claude-md-as-canonical-agent-doc.md)             | **`CLAUDE.md` como doc canônica de agente** — o `AGENTS.md` é aposentado e deletado (o padrão aberto multi-ferramenta deixou de pagar seu custo quando o repo passou a suportar só o Claude Code). Sai do texto o que já é mecânico: tabelas de roteamento (descoberta nativa), sintaxe TS (`tsconfig`) e "não rode `npm`" (hook). Inclui **errata** de como ler as referências ao `AGENTS.md` nos ADRs [0037](./0037-http-first-retire-embedded-cli.md), [0040](./0040-agent-findings-as-github-issues.md) (onde `#15` passa a ser `#7`) e [0054](./0054-ai-assisted-contribution-policy.md), que são imutáveis e não foram editados | Accepted | 2026-08-03 |
| [0058](./0058-runtime-tracks-recommended-lts.md)               | **O runtime acompanha o LTS recomendado — critério em vez de versão fixa.** Supersede **parcialmente** [0002](./0002-keep-nodejs-runtime.md) e [0009](./0009-node-24-typescript-6-with-7-roadmap.md): apenas a FORMA de fixar versão, não a escolha de Node nem de TypeScript. Nasce do inventário de decisões — `ADR-0002-C2` ("versão é Node 20 LTS") e `ADR-0009-C5` ("ajustes mínimos" na migração TS 7) foram para `contradicted` **pela mesma causa**: ADR que fixa versão ou estima esforço produz afirmação que envelhece sozinha. A versão passa a viver onde é executável (`engines.node`, `Dockerfile`, CI), e este ADR **deliberadamente não escreve a versão-alvo** — fazê-lo repetiria o defeito. Troca de tecnologia estrutural exige **inquiry que meça**, não que argumente. Concordância entre os três pontos cobrada por `tests/cleanup/node-version-single-source.test.ts` | Accepted | 2026-08-05 |

| [0059](./0059-bff-aggregates-without-business-rules.md)        | **O BFF agrega, mas não decide** — `supersedes` **parcial** do [0005](./0005-thin-bff-gateway.md): caem "Zero composição de respostas" e o alvo de 200-300 linhas; permanecem "zero regra de negócio", roteamento por prefixo e cross-cutting. "Burro" passa a significar **sem regra de negócio**, não sem composição — o BFF real ficou entre a opção 2 e a 3 que o 0005 enumerou, e o ADR não previa esse ponto. Composição para o client é papel canônico de BFF; o critério que separa é o do [0049](./0049-core-api-bff-boundary.md) ("o banco precisa fazer isso? → core; é montar o que já veio? → BFF"). O alvo numérico sai porque proxy de contagem envelhece sozinho — mesmo defeito de forma que o [0058](./0058-runtime-tracks-recommended-lts.md) documenta. **Nenhuma cláusula é verificável deste repositório** (o BFF vive fora), e isso está declarado | Accepted | 2026-08-05 |

| [0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) | **O transporte da VAN passa a ser um bucket, e a aplicação nunca toca a instância** — `supersedes` **parcial** do [0008](./0008-bradesco-integration-architecture.md): cai o Adapter B inteiro (SSH/SFTP via `ssh2`, `ssh.exec()` do `stcpclt.exe`, as nove envs `VAN_VM_SSH_*`/`STCPCLT_*`); o Adapter A (REST/mTLS) permanece intacto. O backend grava a remessa num prefixo, um **agente dentro da própria instância Windows** — operado pela infra, fora deste repositório — sincroniza, executa o cliente e devolve retorno e status ao bucket. **A superfície de CWE-78 não é mitigada: deixa de existir**, junto com a chave SSH, o pinning de host key e o `command=`. O preço é perder o resultado **síncrono** do `exec()`: `Transmitted` passa a depender de sinal assíncrono em `status/` — e sem acesso à instância, o que não estiver ali não existe para nós. Nada do Adapter B chegou a ser construído. ⚠️ **Prefixos e pendências 1-3 superseded pelo [0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md)**; a decisão de rota permanece vigente | Accepted (prefixos/pendências superseded por 0061) | 2026-08-10 |
| [0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) | **O contrato do bucket da VAN** — `supersedes` **parcial** do [0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) (tabela de prefixos e pendências 1-3; a rota segue vigente). São **cinco** prefixos, não quatro: `saida/` · `processados/` · `falhas/` · `retorno/` · `status/`, e **o agente nunca apaga** — o estado da remessa é a **localização** do objeto. O `status/` publica envelope JSON por execução, com três formatos de chave; **a do duplicado é distinta de propósito** (sobrescrever o original faria remessa transmitida constar como não transmitida) e **a ausência de `recepcao-*` significa "rodou e não havia nada", não "não rodou"**. O veredito vem de **evidência física** (arquivo em BACKUP), mais forte que exit code. ⚠️ **A caixa postal é do CONVÊNIO:** chegam retornos sem correspondência com remessa nossa, e o processamento **MUST NOT** falhar o lote por referência desconhecida. Credencial do agente é **role da instância** — o ganho de segurança do 0060 se confirma. Corrige duas afirmações erradas do 0060 (o `CLCP.ERR.TXT` **existe**; o teto de 26 caracteres **não se aplica**) | Accepted | 2026-08-10 |
| [0062](./0062-deadman-switch-decommissioned-supersedes-0042.md) | **O dead-man's switch é desativado sem substituto** — `supersedes` o [0042](./0042-deadman-switch-redundant.md). O mecanismo foi construído quase por inteiro (emissor Go com HMAC, dois planos de ingestão, dois workflows, contratos de dados) e **nunca recebeu um único sinal**: `deadman/history.jsonl` com **0 linhas**, o emissor escrito e jamais implantado. Como a decisão do auditor é por estado, e o estado nunca mudou, o cron reabria o mesmo alarme **todo dia** — vigilância virou ruído. Os dois workflows estão `disabled_manually`; os artefatos **não** foram removidos (o emissor é código pronto que a próxima tentativa aproveita). ⚠️ **O ponto cego volta a estar descoberto** — job agendado que morre em silêncio não tem detecção, e este ADR **não** desenha o substituto: os cinco requisitos estão na [Inquiry-0030](../../inquiries/0030-deadman-switch-nunca-vigiou.md) §5, que segue `open`. A lição transversal: a aferição de 07/2026 **inventariou peças** e deu `partially-realized`; a pergunta que faltou — *"quando foi o último sinal recebido?"* — teria revelado três semanas antes que o valor entregue era zero | Accepted | 2026-08-21 |
| [0063](./0063-payable-is-the-write-aggregate-cas-by-precondition.md) | **O título é a unidade de escrita** — operação que altera só o título escreve por `PayableRepository` (`UPDATE` por PK), não pelo `save` do documento. Quatro tabelas já referenciavam `payable_id` (uma delas como PK de read-model, outra com FK), o que pelo critério de Evans o tornava raiz de agregado. Quatro sintomas independentes vinham do mesmo boundary errado: deadlock (#803), pagamento em dobro (PR #794), status derivado na leitura e conflito de versão **falso** entre títulos irmãos. O controle de concorrência é **CAS pela pré-condição da operação**, sem coluna `version` e sem migration — e ela difere por natureza: `status = 'Approved'` para a baixa (**transição**), `due_date = :lido_pelo_cliente` para o reagendamento (**atribuição**, onde nenhum estado nomeado serviria e um `WHERE status IN (…)` daria last-write-wins mudo). Conflito é **explícito** (409), nunca sucesso idempotente — que engoliria uma segunda operação legítima em silêncio. Um slug por operação, porque a mensagem ao humano é escrita por slug. Medido em MySQL real, 6 casos, dois ambientes. ⚠️ **Breaking:** `expectedDueDate` obrigatório no PATCH de vencimento (#826). **Não decide:** retenções/impostos write-once, FK cross-aggregate (#790) e o mesmo padrão em auth/budget-plans/contracts (#810) | Accepted | 2026-08-21 |

| [0064](./0064-outbox-fanout-per-consumer-progress.md) | **O outbox entrega a N consumidores** — `estende` (não supersede) [0015](./0015-mysql-outbox-pattern.md) e [0022](./0022-read-models-via-projection-over-event-stream.md). O passo 8 do fluxo de `0015:51-55` ("consumidor marca event_id como visto") **nunca foi implementado**: `eventos_processados` nasceu na migration `0001` com a PK composta certa e ficou vazia em produção, enquanto o passo 9 (`processed_at` na origem) virava o critério de claim. Isso é **fila de trabalho** — `SKIP LOCKED` existe para que dois workers não peguem o mesmo item — onde o requisito é **fanout**. Dois consumidores dividiram cada outbox; medido: **11 fornecedores cadastrados, 1 na view, `pendentes = 0`**, com o consumidor que só escreve log levando vantagem de 5× no poll (100ms × 500ms). A unidade de progresso passa a ser o par **(consumidor, evento)**; **dead-letter é terminal e por consumidor**, e **nunca apaga a linha de origem** — o `DELETE` que existia violava `0022:27-29` ("o outbox retém as entradas… não deleta") e a reconstrução de `0022:40`, **defeito anterior ao fanout**. Claim em **READ COMMITTED**: sob RR o gap lock no índice `(processed_at, occurred_at)` fazia o `INSERT` do **produtor** estourar `1205` (medido em 8.4.11). Vale para os **cinco** outboxes, inclusive os de consumidor único — o `par_email_outbox` foi *criado* para contornar esta limitação. Fecha [#800](https://github.com/ERP-Bem-Comum/core-api/issues/800) e [#824](https://github.com/ERP-Bem-Comum/core-api/issues/824) | Accepted | 2026-08-21 |

| [0065](./0065-remittance-responsibility-boundary-supersedes-0060-0061-transmitted.md) | **A responsabilidade pela remessa termina no bucket** — `supersedes` **parcial** de [0060](./0060-van-transport-via-s3-bucket-supersedes-0008-relay.md) (`:78-79`) e [0061](./0061-van-bucket-contract-supersedes-0060-pendencies.md) (`:114`): a cláusula "a transição para `Transmitted` depende de sinal externo" deixa de valer para o **título** e segue valendo para a **remessa**. Decisão da P.O. em 24/08 ([#792](https://github.com/ERP-Bem-Comum/core-api/issues/792)), por ACL (Vernon, p. 142): "transmitido" significa **"saiu da nossa alçada"**, não "o banco confirmou". O título vira `Transmitted` **na geração, na mesma transação da reserva** (CAS `status = 'Approved'`, ADR-0063), com evento `PayableTransmitted` (a #823 vira projeção); `Failed` **não devolve**, `discard` devolve por CAS; pré-voo e read-model deixam de colapsar o estado. **`Pago` segue manual** ([#59](https://github.com/ERP-Bem-Comum/core-api/issues/59)), aceitando `Approved` e `Transmitted` como origem. **Download do arquivo em produção** ([#822](https://github.com/ERP-Bem-Comum/core-api/issues/822)): rota em todo ambiente sob permissão dedicada `remittance:download`, 403 `remittance-download-forbidden`, log estruturado de cada acesso, bytes pela API com `contentHash` — URL assinada rejeitada (0050 `:73`). ⚠️ "Transmitido" na tela não significa "o banco recebeu": a #787 sobe de prioridade | Accepted | 2026-08-24 |
| [0067](./0067-typescript-7-side-by-side-supersedes-0009-language.md) | **TypeScript 7 nativo compila; o TS 6 fica só para o `typescript-eslint`** — `supersedes` **parcial** de [0009](./0009-node-24-typescript-6-with-7-roadmap.md), seções "Linguagem" (`:32-34`) e "Plano de migração" (`:36-42`). O gatilho literal do 0009 (`:90-96`) disparou: **TS 7.0 é GA desde 08/07/2026**. Mas duas previsões dele estavam erradas e ficam ditas: "ajustes mínimos" não descreve o port — **nenhuma** versão do `typescript-eslint` aceita TS 7 (peer `>=4.8.4 <6.1.0` no `latest` 8.68.0 **e** no canary; sem v9 publicada; issue [#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) OPEN, parada desde 09/07) —, e o "CI roda `tsc` e `tsgo` em paralelo" (`:39`) **nunca foi implementado** em 4 meses, então é **revogado**, não repetido. Side-by-side por alias: `typescript` → `npm:@typescript/typescript6`, `@typescript/native` → `npm:typescript@^7.0.2`. **`@typescript/native-preview` sai** (descontinuado pela Microsoft). ✅ Nenhum breaking do TS 7 atinge o `tsconfig` (medido campo a campo: `ES2024`, `NodeNext`, sem `baseUrl`, `types`/`strict` explícitos) — dividendo do "strict total desde o dia 1". ⚠️ Risco declarado: template literal com emoji muda tipo inferido **sem erro** (TS 6 conta 4, TS 7 conta 3) — exposição **medida hoje: nula**, o repo não tem template literal type algum. ⚠️ Custo consciente: o alias só existe até `6.0.2` contra `6.0.3` instalado. Instalação **respeita a quarentena** de 24h (`minimumReleaseAgeStrict`) | Proposed | 2026-08-25 |

### Notas de numeração

- **`0016` não existe e é reservado de propósito** para a estratégia de implementação dos módulos —
  prefixos `ctr_*`/`fin_*` e comunicação por outbox in-process. Reserva registrada no
  [`../../CHANGELOG.md`](../../CHANGELOG.md) em 2026-04-28; o `0017` pulou o número
  intencionalmente. Enquanto não for escrito, **não existe lista canônica de prefixo de tabela por
  módulo** — `auth`, `partners`, `programs`, `budget-plans` e `notifications` operam por convenção
  tácita.
- **`0034` esteve duplicado** entre 2026-06-08 e 2026-07-31: a adoção do Bruno e o OCR
  Port/Adapter reivindicavam o mesmo número. Resolvido renumerando o de OCR para `0056`. O `0034`
  agora significa, sem ambiguidade, a adoção do Bruno.

---

## 6. Status Possíveis

| Status                   | Significado                                                |
| :----------------------- | :--------------------------------------------------------- |
| `Proposed`               | Em discussão, ainda não aprovado                           |
| `Accepted`               | Decisão vigente                                            |
| `Deprecated`             | Não vale mais, mas não foi substituído por novo ADR (raro) |
| `Superseded by ADR-XXXX` | Substituído por outro ADR                                  |

---

> 📚 Inspirado no formato de Michael Nygard ([Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
