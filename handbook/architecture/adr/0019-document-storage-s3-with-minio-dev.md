[← Voltar para ADRs](./README.md)

# ADR-0019: Document Storage — AWS S3 (produção) com MinIO via Docker (dev/homologação)

- **Status:** Accepted
- **Date:** 2026-05-15
- **Deciders:** Arquiteto técnico + Gabriel Aderaldo
- **Relacionado:** [ADR-0006](./0006-modular-monolith-core-api.md) (modular monolith / ports & adapters), [ADR-0010](./0010-email-port-adapter-pattern.md) (mesma forma de port/adapter para serviço externo), [ADR-0018](./0018-persistence-dual-dialect-drizzle.md) (mesma estratégia "engine único de produção + dev-friendly local"), [Handbook §07-external-context](../../domain_questions/contratos/07-external-context.md) (ACL para Storage)

---

## Contexto

O módulo `contracts` do `core-api` está em fase final de implementação do núcleo transacional (Contratos, Aditivos, motor de cálculo de Estado Vigente, CLI, persistência dual-dialect via Drizzle/SQLite/MySQL — ADR-0018). Ao auditar contra a Especificação de Domínio (handbook `domain_questions/contratos/`), três lacunas críticas relacionadas a **documentos** ficaram explícitas:

1. **RN-AS-01 / RN-AS-02** — todo documento contratual deve registrar `hashSha256`, `versao` e evidências de assinatura. Hoje o campo `signedDocumentRef: DocumentId | null` no agregado `Amendment` guarda apenas um UUID opaco. Não há **bytes** persistidos, não há hash, não há integridade. É promessa sem comprovante.

2. **RN-11** — exclusão de documento deve ser lógica, controlada por retenção (`retencaoAte`) e por perfil. Sem storage real, não há objeto para reter nem para tentar excluir.

3. **Handbook §07-external-context** — exige ACL (Anti-Corruption Layer) para o Storage como sistema externo, com o domínio enxergando-o como "um cofre de arquivos assinado e imutável". O evento `DocumentoDisponibilizado` depende dessa camada existir.

Em paralelo, a stack-alvo de produção da Bem Comum (multi-cloud AWS+GCP — ADR-0007) já contempla **AWS S3** como serviço de armazenamento de objetos. A decisão arquitetural não é "qual storage" — é **AWS S3**, isso está dado. A pergunta é:

> **Como adicionar storage real de documentos no `core-api` agora, sem incorrer em custo de AWS S3 durante a fase de homologação, sem violar licenças, e sem criar fricção operacional para os devs?**

### Forças em jogo

| Força | Direção |
| :--- | :--- |
| Honrar ADR-0007 (multi-cloud AWS) | S3 é o destino de produção. Toda decisão precisa preservar o caminho. |
| Não contratar S3 durante homologação | Custo da AWS antes do produto estar em produção é desperdício; cota free tier de S3 é ínfima e ainda exige cartão. |
| Paridade real com S3 | Se o ambiente dev mente, bugs aparecem só em produção — pior dos mundos. (Mesmo princípio do ADR-0018.) |
| Proteção contra trap de licenciamento | Bibliotecas e binários AGPL embutidos em produto comercial implicam obrigação copyleft ou licença paga. |
| Minimizar moving parts em dev | Cada container/processo extra é um custo cognitivo e de onboarding. |
| Migração de dev → prod sem retrabalho | Idealmente, **uma variável de ambiente** muda. |
| Cumprir handbook §07 (ACL) | Domínio só conversa com port abstrato. Adapter concreto é detalhe substituível. |

### Realidade que viabiliza a decisão

- **MinIO** é um servidor S3-compatível em Go, single-binary, ~50 MB, com **API idêntica à do S3 da AWS** (mesmas chamadas, mesmos códigos de erro, mesmos cabeçalhos, mesma semântica de ETag, multipart, lifecycle).
- O cliente oficial **`@aws-sdk/client-s3`** aceita um parâmetro `endpoint` que pode apontar para `http://localhost:9000` (MinIO local) ou para o S3 da AWS (default). **A única diferença prática entre dev e prod é uma string.**
- A licença **AGPLv3** do MinIO só impõe obrigações quando o software é **distribuído** ou **provido como serviço de rede**. Usar MinIO localmente em dev/homologação caracteriza **uso interno**, sem obrigação copyleft (mesmo argumento usado pela maioria das empresas que rodam Postgres internamente sem virar GPL).
- A arquitetura **ports & adapters** do `core-api` (ADR-0006) já abstrai o domínio de qualquer detalhe de infraestrutura — adicionar um port `DocumentStorage` segue o mesmo padrão já consagrado em `ContractRepository` (ADR-0018) e `EmailService` (ADR-0010).

---

## Decisão

Adotamos **AWS S3** como serviço de storage de documentos em produção e **MinIO via Docker Compose** como implementação local equivalente para dev, homologação e CI. O domínio fala com um único **port `DocumentStorage`** consumido por **um único adapter** baseado no **`@aws-sdk/client-s3`** — a troca entre MinIO e S3 real é feita por **configuração de endpoint**, sem mudança de código.

### Princípio condutor

> **1 port, 1 adapter, 1 SDK, 2 endpoints, 0 emulação custom.**

| Camada | Quantidade | Por quê |
| :--- | :---: | :--- |
| Port (`DocumentStorage`, type) | 1 | Domínio não muda. Cumpre ACL do handbook §07. |
| Adapter S3-compatível | 1 | Mesmo código serve MinIO e AWS S3 — paridade garantida pelo SDK oficial. |
| SDK | 1 | `@aws-sdk/client-s3`. Sem wrappers caseiros, sem reinvenção. |
| Endpoints | 2 | `http://localhost:9000` (dev/CI/homologação) e `https://s3.<region>.amazonaws.com` (staging/prod). |
| Emulação custom (FlatDoc, s3rver, etc.) | 0 | Rejeitada — ver Alternativas. |

### Configuração canônica

```ts
// src/modules/contracts/adapters/storage/s3-config.ts (esboço)
export type S3StorageConfig = Readonly<{
  endpoint: string;          // http://localhost:9000 (dev) | https://s3.<region>.amazonaws.com (prod)
  region: string;            // us-east-1 (MinIO ignora) | região AWS real (prod)
  bucket: string;            // contracts-documents
  accessKeyId: string;       // de variável de ambiente
  secretAccessKey: string;   // de variável de ambiente
  forcePathStyle: boolean;   // true para MinIO; false para AWS S3 (virtual-hosted-style)
}>;
```

### Topologia de execução

| Ambiente | Endpoint | Como sobe | Persistência dos bytes |
| :--- | :--- | :--- | :--- |
| Testes unitários | Não aplica | Adapter InMemory (`Map<key, bytes>`) | Volátil |
| Testes de contrato | Não aplica | Adapter InMemory | Volátil |
| Testes E2E / integração local | `http://localhost:9000` | `docker compose up minio` | Volume Docker (`./volumes/minio`) |
| Dev local manual | `http://localhost:9000` | `docker compose up -d minio` | Volume Docker (persistente entre sessões) |
| CI | `http://minio:9000` (service container) | GitHub Actions service container `minio/minio` | Volátil (efêmero por job) |
| Staging | `https://s3.<region>.amazonaws.com` | Bucket S3 provisionado | AWS S3 (versioning ON) |
| Produção | `https://s3.<region>.amazonaws.com` | Bucket S3 provisionado | AWS S3 (versioning ON + Object Lock) |

### `docker-compose.yml` canônico (no repositório do `core-api`)

```yaml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"  # S3 API
      - "9001:9001"  # Console web (opcional, para inspeção em dev)
    volumes:
      - ./volumes/minio:/data
    environment:
      MINIO_ROOT_USER: dev-access-key
      MINIO_ROOT_PASSWORD: dev-secret-key-min-8-chars
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 2s
      retries: 5
```

> **Nota legal:** o compose **referencia** a imagem oficial `minio/minio` do Docker Hub. **Não copiamos** o binário, **não modificamos** o código-fonte, **não redistribuímos** o software como parte do nosso produto. O `core-api` distribuído (binário, imagem Docker do app, instalador) **não inclui** o MinIO. Esse é o uso clássico de software AGPL como ferramenta interna — equivalente a rodar PostgreSQL ou Redis em dev sem virar GPL.

### Escopo desta decisão

**Está dentro:**
- Escolha do storage de produção (AWS S3).
- Escolha do equivalente local para dev/homologação/CI (MinIO via Docker).
- Acoplamento ao `@aws-sdk/client-s3` como cliente único.
- Forma do port `DocumentStorage` (alto nível).
- Estratégia de configuração (endpoint via env var).

**Está fora (objeto de ADRs/tickets futuros):**
- Modelagem do agregado `DocumentoContratual` (campos, categorias, retenção) — domínio.
- Schema da tabela `documents` no Drizzle (sqlite + mysql).
- Uso de Object Lock e Versioning em produção (sub-decisão do bucket).
- Estratégia de signed URLs para preview no UI (depende do BFF — ADR-0005).
- Como a Timeline (BC `Support`) consome o evento `DocumentoDisponibilizado`.

---

## Consequências

### Positivas

- **Custo zero durante homologação.** Nenhum gasto com AWS até o produto estar pronto para staging.
- **Paridade 100% com S3.** API idêntica, mesmos códigos de erro, mesmas semânticas — não é simulação, é o protocolo S3 falado por outro servidor.
- **Migração trivial.** Trocar endpoint de `localhost:9000` para `s3.<region>.amazonaws.com` é uma variável de ambiente. Zero linha de código tocada.
- **Cumpre ACL do handbook §07.** Domínio fala com `DocumentStorage` (port). Não sabe que existe MinIO, S3, AWS, nada.
- **Padronização com ADR-0010** (port/adapter de Email) — mesma forma, mesma curva de aprendizado para devs novos.
- **Padronização com ADR-0018** (dual-dialect Drizzle) — mesmo padrão de "engine único na produção, equivalente local para dev/CI".
- **CI rápido.** Service container de GitHub Actions com `minio/minio` sobe em ~3s, contra ~30-60s de configurar credenciais AWS e cobrar segundos de cota.
- **Testes E2E reais.** A suite do `DocumentStorage` pode rodar contra o protocolo S3 de verdade no CI, não contra um mock.
- **Sem trap de licenciamento.** Uso interno como ferramenta de dev não dispara AGPL.
- **Habilita evento `DocumentoDisponibilizado`.** Com bytes reais + hash real + storageKey real, o evento deixa de ser placebo.

### Negativas

- **Docker vira dependência de dev.** Devs precisam ter Docker Desktop (ou equivalente Linux) na máquina. Mitigação: documentar no `README.md` raiz + script `scripts/setup-dev.sh` que verifica.
- **Ciclo de vida do compose.** Devs precisam lembrar de `docker compose up -d minio` antes de rodar testes E2E. Mitigação: integrar no `pnpm test:e2e` (pre-hook que sobe o serviço).
- **Volume local cresce.** `./volumes/minio` acumula bytes ao longo do dev. Mitigação: adicionar ao `.gitignore` (óbvio) + script `pnpm storage:reset` que limpa.
- **Versão do MinIO pode driftar com S3 real.** MinIO acompanha S3 mas atrasos podem existir. Mitigação: pinning da tag da imagem no compose + revisão trimestral.
- **Não exercita Object Lock / Versioning em dev.** MinIO suporta ambos, mas configurar requer comandos extras. Decisão: ligar Versioning no compose desde já; Object Lock só em prod.
- **Custos de transferência de dados na migração inicial.** Quando promover o primeiro lote de documentos de dev para staging, upload tem custo. Mitigação: não migrar dados de dev — staging começa vazio.

### Neutras

- O estilo de código (`@aws-sdk/client-s3`, `Result<T, E>`, ports/adapters) é **idêntico** entre dev e prod.
- Não altera a estratégia de outbox (ADR-0015) — eventos do storage publicam no event bus normalmente.
- Não altera a estratégia de persistência relacional (ADR-0018) — Drizzle continua sendo o ORM dos agregados; storage é coisa diferente.
- A decisão é reversível com baixo custo: arrancar MinIO + apontar direto pra S3 é o cenário esperado pós-homologação.

---

## Alternativas Consideradas

### A. AWS S3 direto desde o dia 1

**Rejeitada porque:**

- **Custo desnecessário** durante homologação. Mesmo dentro do free tier (5GB / 20k GET / 2k PUT por mês), exige cartão e expõe o projeto a cobrança acidental por loops de teste.
- **Fricção para devs.** Cada dev precisaria credenciais AWS, IAM bem configurado, MFA. Onboarding mais lento.
- **CI exige secrets reais.** Riscos de vazamento de chave em logs de build.
- **Testes E2E ficam lentos.** Latência de rede AWS (50-200ms por request) versus ~1ms local.
- **Não há ganho real.** Como MinIO usa o protocolo S3, a "fidelidade" de testar contra AWS real só importa para features muito específicas (Object Lock retention timer, lifecycle transitions reais, cross-region replication) que não estão no MVP.

### B. FlatDoc — adapter custom em filesystem com simulação manual das limitações do S3

**Considerada inicialmente (ver discussão do dia 2026-05-15 entre Gabriel e o assistente arquitetural). Rejeitada porque:**

- **Paridade < 100%.** Replicaríamos validações de chave, ETag, Object Lock, presigned URLs manualmente. Cada uma é uma fonte potencial de drift entre o que escrevemos e o que o S3 real faz.
- **Custo de implementação maior** (~2 dias) que rodar `docker compose up minio` (~1h).
- **Bugs de simulação não pegam bugs do S3 real.** Se nossa simulação aceita uma chave que o S3 rejeita, descobrimos só em prod.
- **Toda evolução do S3 vira backlog nosso.** Quando AWS lança uma feature ou muda uma regra, precisaríamos atualizar nossa simulação. MinIO já faz isso por nós.

**Vale a pena reter como fallback** se a decisão futura for **não depender de Docker** (cenário improvável, mas se acontecer, FlatDoc volta a ser a opção viável).

### C. `s3rver` (servidor S3-compatível em JavaScript puro, MIT)

**Rejeitada porque:**

- **Fidelidade menor** que MinIO. Implementa só um subconjunto da API S3, com gaps documentados em multipart, presigned URLs e Object Lock.
- **Manutenção inconsistente.** Último release maduro foi há ~2 anos; PRs abertos sem merge.
- **Sem console web** para inspeção manual durante dev (MinIO oferece em `:9001`).
- **Único ganho seria evitar Docker** — mas Docker já é aceitável (premissa do exercício).

### D. MinIO embutido como binário dentro do CLI / instalador do `core-api`

**Rejeitada porque:**

- **Trap AGPL acionado.** Distribuir o binário do MinIO como parte do produto da Bem Comum implicaria oferecer o código-fonte completo do `core-api` (interpretação conservadora) ou pagar licença comercial do MinIO Inc (a partir de US$ 10k/ano).
- **4+ binários cross-platform** a manter (linux-x64, linux-arm64, darwin-x64, darwin-arm64, windows-x64). Cada release sobe ~320MB.
- **Gerência de processo dentro do CLI.** Start/stop, port conflict, crash recovery — código operacional novo, em TS, para resolver problema que Docker já resolve.
- **Antivírus Windows frequentemente flagra** binários extraídos em runtime.
- **Acoplamento de release.** Atualizar MinIO exige rebuild de tudo do `core-api`.

### E. LocalStack (emulador AWS completo)

**Rejeitada porque:**

- **Escopo muito maior que o necessário.** LocalStack emula S3, DynamoDB, Lambda, IAM, SQS, SNS, etc. Pagamos a complexidade de tudo isso para usar só S3.
- **Versão Community do LocalStack tem fidelidade S3 mais baixa** que MinIO; a versão Pro custa licença paga.
- **Imagem ~1.5 GB** versus ~50 MB do MinIO. CI fica mais lento.

### F. Garage / SeaweedFS / Ceph RGW

**Rejeitada porque:**

- **Fora do mainstream.** Comunidade menor, menos tooling, menos exemplos.
- **Paridade com S3 menos testada** que MinIO (que é literalmente vendido como "S3-compatible storage").
- **Curva de aprendizado** para o time não justificada — MinIO resolve.

### G. MinIO via Docker Compose — **ESCOLHIDA**

Único caminho que respeita simultaneamente:

- ADR-0007 (S3 é o storage de produção — sem deriva).
- ADR-0006 (ports & adapters — adapter trocável sem tocar domínio).
- Handbook §07 (ACL para Storage — port abstrato, adapter concreto).
- Realidade operacional (não contratar AWS S3 agora, devs com Docker disponível).
- Pragmatismo de CI (service container ephemeral, rápido).
- Honestidade técnica (paridade real, não simulação).
- Segurança jurídica (uso interno, sem distribuição = sem AGPL trap).

---

## Análise de Licenciamento (AGPLv3 do MinIO)

Como esta foi a principal trava reconhecida durante a deliberação, registramos a análise para auditoria futura.

| Cenário | Caracterização | AGPL aplica? |
| :--- | :--- | :--- |
| `docker compose up minio` na máquina do dev | **Uso interno** — somos usuários, não distribuidores | ❌ Não dispara |
| `docker-compose.yml` versionado no repo apontando para `minio/minio` oficial | **Referência**, não cópia do binário | ❌ Não dispara |
| MinIO rodando em service container do GitHub Actions | **Uso interno em CI** — efêmero, não distribuído | ❌ Não dispara |
| MinIO embutido em `setup.exe` do `core-api` (rejeitado em Alternativa D) | **Distribuição** | ✅ Aplicaria → exigiria licença comercial ou copyleft |
| MinIO rodando em servidor da Bem Comum exposto a usuários externos via rede (cenário hipotético futuro) | **Serviço de rede** | ✅ Aplicaria → cláusula Affero |

**Conclusão:** o cenário escolhido (uso local em dev/homologação/CI, sem distribuição, sem exposição externa) **não dispara** nenhuma obrigação da AGPLv3. Este ADR documenta a base do raciocínio caso o jurídico questione no futuro.

**Cláusula de revisão:** se em algum momento o MinIO passar a ser parte da topologia de **produção** da Bem Comum (substituindo ou complementando AWS S3), este ADR deve ser **superseded** por novo ADR que faça a revisão de licenciamento com a equipe jurídica.

---

## Quando Re-avaliar

Esta decisão deve ser revisitada (gerando novo ADR que `supersedes` este) se:

- **MinIO Inc alterar a licença** (ex: para SSPL ou modelo source-available restritivo). Sinaliza necessidade de avaliar `s3rver`, `Garage` ou Docker S3 fork.
- **AWS S3 deixar de ser o destino de produção** (improvável, mas se ADR-0007 for revisado). Nesse caso, escolhemos novo destino e novo equivalente local.
- **O custo de manter Docker como dependência de dev** ultrapassar o benefício de fidelidade (ex: time grande de devs sem Docker, ou política corporativa que proíba). Fallback: FlatDoc (Alternativa B).
- **Surgir requisito que MinIO não suporte** com paridade aceitável (ex: feature S3 nova que o MinIO demore meses pra implementar e seja crítica para o produto).
- **Decidirmos rodar MinIO em produção** (ver Cláusula de revisão acima — exige análise jurídica nova).
- **Bugs de paridade MinIO vs. S3 real** aparecerem em produção com frequência > 1 por trimestre.

---

## Conformidade e auditoria

| Mecanismo | Como aplica este ADR |
| :--- | :--- |
| Code review obrigatório | Toda PR que toca `src/modules/*/adapters/storage/` precisa de revisão arquitetural. |
| Port único | `DocumentStorage` é `type`, não classe. Compilador garante que adapter cumpra o contrato. |
| Sem dependência direta de SDK no domínio | Lint rule (ticket separado) que proíbe `import` de `@aws-sdk/*` em `src/modules/*/domain/` e `src/modules/*/application/`. |
| Suite de contrato compartilhada | Mesma suite roda contra adapter InMemory **e** contra MinIO (CI) — qualquer divergência semântica falha o build. Mesma estratégia do ADR-0018 com `ContractRepositorySuite`. |
| Endpoint via env var | `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Defaults safe pra dev, obrigatórios em prod. |
| Health check em CI | Job dedicado que sobe MinIO, executa upload+download+delete e verifica integridade do hash. |
| Auditoria periódica de paridade | Quando staging com S3 real existir: rodar a mesma suite de contratos contra S3 staging trimestralmente. Discrepância gera ticket. |

---

## Tickets gerados por esta decisão

Esta ADR habilita (e exige) os seguintes tickets de implementação, em ordem sugerida:

1. **CTR-STORAGE-PORT** — definir port `DocumentStorage` + tipos `StorageRef`, `BucketName`, `StorageKey` com smart constructors.
2. **CTR-STORAGE-INMEMORY** — adapter InMemory para testes unitários.
3. **CTR-STORAGE-S3-ADAPTER** — adapter único baseado em `@aws-sdk/client-s3`, configurável por endpoint.
4. **CTR-STORAGE-COMPOSE** — `docker-compose.yml` com MinIO + healthcheck + volume + documentação no README.
5. **CTR-STORAGE-CI** — workflow do GitHub Actions com service container `minio/minio` + suite de paridade.
6. **CTR-DOCUMENT-AGGREGATE** — agregado `DocumentoContratual` + repositório + schema Drizzle (depende de 1).
7. **CTR-USECASE-UPLOAD-DOCUMENT** — use case `uploadDocument` que orquestra hash + storage + repo + evento `DocumentoDisponibilizado` (depende de 3 e 6).
8. **CTR-AMENDMENT-DOCUMENT-LINK** — refator de `attachSignedDocument` para validar que o `DocumentId` referencia documento já disponibilizado (depende de 6 e 7).
9. **CTR-CLI-UPLOAD** — subcomando `subir-documento --arquivo <path> --categoria <kind>` (depende de 7).

---

## Referências

- [ADR-0006](./0006-modular-monolith-core-api.md) — Modular monolith e ports & adapters (base arquitetural).
- [ADR-0007](./0007-multi-cloud-aws-gcp.md) — Topologia multi-cloud que estabelece AWS como provedor de S3.
- [ADR-0010](./0010-email-port-adapter-pattern.md) — Padrão port/adapter de serviço externo idêntico ao adotado aqui.
- [ADR-0018](./0018-persistence-dual-dialect-drizzle.md) — Mesma estratégia "engine único de produção + dev-friendly local".
- [Handbook §07-external-context](../../domain_questions/contratos/07-external-context.md) — ACL para Storage e regras de fronteira.
- [Handbook — Especificação de Domínio §6.3 e §RN-AS-01/02/RN-11](../../domain_questions/contratos/especificacao-dominio.md) — Regras de integridade documental e exclusão lógica.
- [MinIO — Compatibility Matrix com AWS S3](https://min.io/docs/minio/linux/operations/checklists/thresholds.html) — Referência técnica de paridade.
- [GNU AGPLv3 — Texto oficial](https://www.gnu.org/licenses/agpl-3.0.html) — Análise jurídica deste ADR.
- [AWS SDK for JavaScript v3 — `@aws-sdk/client-s3`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/) — SDK adotado.
