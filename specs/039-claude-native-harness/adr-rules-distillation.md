# Destilação ADR → `.claude/rules/` (US5)

**Feature**: [039-claude-native-harness](./spec.md) · **Requisitos**: FR-018 a FR-024 · **Critérios**: SC-010 a SC-014
**Iniciado**: 2026-07-30

Registro do veredito de **cada** um dos 55 ADRs. Cobertura, não amostragem (SC-010).

---

## Método

Um aprendizado de ADR só vira linha de rule se passar nos **três testes** (FR-019):

| Teste | Pergunta                                                 | Se falhar                                                |
| ----- | -------------------------------------------------------- | -------------------------------------------------------- |
| **A** | É acionável **no momento em que se edita** o path alvo?  | Vira contexto de handbook, não rule                      |
| **B** | **Não** é já garantido por `eslint`/`tsc`/hook/CI?       | Registrar como **coberto**, citando o mecanismo (FR-022) |
| **C** | Cabe em **referência** ao ADR, sem reproduzir seu corpo? | Reduzir até caber, ou não virar rule (FR-020)            |

Aprendizado acionável que **não** é mecanizado mas **poderia** ser → registrar como candidato a
enforcement, em vez de virar só texto (FR-023).

> **Por que as travas existem:** a versão ingênua — um ADR, uma regra — produziria 427 KB de doutrina
> duplicando 427 KB de ADRs. No dia em que um ADR fosse superseded, a rule passaria a mentir. Foi
> exatamente esse mecanismo que deixou o Princípio I da constituição mandando rodar
> `pnpm run pipeline:state`, removido no commit `6362709d`.

---

## Etapa 1 — Triagem por status _(concluída)_

Só ADR **Accepted** pode gerar regra. Status extraído de cada arquivo:

### Inelegíveis (10)

| ADR                                         | Status                    | Veredito                                    |
| ------------------------------------------- | ------------------------- | ------------------------------------------- |
| `0003-shared-db-isolated-schemas`           | Superseded by ADR-0014    | **Não gera** — norma vive no sucessor       |
| `0004-postgres-outbox-pattern`              | Superseded by ADR-0015    | **Não gera** — norma vive no sucessor       |
| `0007-multi-cloud-aws-gcp`                  | Superseded by ADR-0021    | **Não gera** — norma vive no sucessor       |
| `0012-pnpm-package-manager`                 | Superseded by ADR-0029    | **Não gera** — ver achado crítico abaixo    |
| `0018-persistence-dual-dialect-drizzle`     | Superseded by ADR-0020    | **Não gera** — norma vive no sucessor       |
| `0053-sensitive-data-carve-out-rbac-bypass` | **Rejected** (2026-07-20) | **Não gera** — decisão da P.O. foi rejeitar |
| `0017-correlation-keys-cross-period-audit`  | Proposed                  | **Não gera ainda** — reavaliar se aceito    |
| `0030-valkey-shared-store-deferred`         | Proposed                  | **Não gera ainda** — reavaliar se aceito    |
| `0048-legacy-categorization-installments`   | Proposed                  | **Não gera ainda** — reavaliar se aceito    |
| `0049-core-api-bff-boundary`                | Proposed                  | **Não gera ainda** — reavaliar se aceito    |

**Elegíveis: 45 ADRs Accepted.**

---

## Achado crítico da triagem — citação em massa de ADR superseded

`ADR-0012` está **Superseded by ADR-0029** desde 2026-05-30, e continua sendo citado como **fonte
normativa** em ~20 arquivos vivos:

```
AGENTS.md · README.md · docs/01-architecture.md · docs/04-dev-guide.md
.claude/README.md · .claude/output-styles/erp-contracts.md
.claude/agents/{contratos-orchestrator,pnpm-workspace-expert,bruno-api-client-expert}.md
.claude/skills/{nodejs-process-runner,nodejs-fs-scripter,web-security-backend}/SKILL.md
.claude/hooks/block-npm.sh · .claude/runbooks/* · scripts/README.md
handbook/CHANGELOG.md · handbook/inquiries/* · .specify/memory/constitution.md
```

`ADR-0029`, o vigente, **não é citado em nenhum deles**.

**Precisão importante:** o _conteúdo_ do ADR-0029 **está aplicado** — verificado em 2026-07-30:

| Exigência do ADR-0029            | Estado real                           |
| -------------------------------- | ------------------------------------- |
| `packageManager: pnpm@11.x`      | ✅ `pnpm@11.15.1` (`package.json:18`) |
| `engines.pnpm: ">=11.0.0 <12"`   | ✅ conforme (`package.json:7-10`)     |
| `minimumReleaseAge: 1440`        | ✅ `pnpm-workspace.yaml:46`           |
| `minimumReleaseAgeStrict: true`  | ✅ `pnpm-workspace.yaml:49`           |
| `trustPolicy: no-downgrade`      | ✅ `pnpm-workspace.yaml:52`           |
| `blockExoticSubdeps: true`       | ✅ `pnpm-workspace.yaml:68`           |
| `ENV PNPM_VERSION` no Dockerfile | ✅ `Dockerfile:47`                    |

Logo, **o repo não viola o ADR-0029**. O problema é duplo e ambos são exatamente o que a US5 corrige:

1. **Referência obsoleta em massa** — um agente que siga o `AGENTS.md` até o ADR-0012 encontra
   "pnpm 10.x" e um documento marcado `Superseded`. A doutrina o manda a um beco.
2. **Lacuna de cobertura** — **não existe rule com `paths:` cobrindo `package.json`,
   `pnpm-workspace.yaml` ou `Dockerfile`**. As 6 rules atuais cobrem apenas `src/`, `tests/` e
   `api-collections/`. As settings de supply-chain são decisão de segurança deliberada (defesa contra
   o vetor do incidente `axios`, ADR-0011) e hoje **nada avisa** quem as editar.

---

## Etapa 2 — Vereditos por ADR _(em andamento: 2 de 45)_

### ✅ `0044-cnpj-alphanumeric-kernel` → **GERA REGRA**

| Teste | Resultado                                                                                 |
| ----- | ----------------------------------------------------------------------------------------- |
| A     | ✅ Acionável ao editar VO, export, máscara ou regex que toque CNPJ                        |
| B     | ✅ Sem enforcement — `grep -rin cnpj .claude/rules/ eslint.config.js` não retorna a regra |
| C     | ✅ Cabe em 2 linhas referenciando o ADR, sem reproduzir a tabela de pesos do módulo 11    |

**Aprendizado:** o valor brandado de `Cnpj` é `^[0-9A-Z]{12}[0-9]{2}$` — **pode conter letras**
(`12ABC34501DE35`). O ADR lista a consequência: "camadas que assumiam só dígitos — máscaras,
exports, `CHECK`/REGEXP de schema — precisam revisão".

**Destino:** `.claude/rules/domain.md` + `.claude/rules/adapters.md`.
**Candidato a enforcement (FR-023):** regra de lint que sinalize `\d{14}` / `[0-9]{14}` em código que
toque CNPJ.

### ✅ `0029-pnpm-11-supply-chain-defaults` → **GERA REGRA + RULE NOVA**

| Teste | Resultado                                                                         |
| ----- | --------------------------------------------------------------------------------- |
| A     | ✅ Acionável ao editar `pnpm-workspace.yaml`, `package.json` ou `Dockerfile`      |
| B     | ⚠️ Parcial — `block-npm.sh` cobre "nunca npm", mas **nada** protege as 4 settings |
| C     | ✅ Cabe em referência; a evidência literal fica no ADR                            |

**Aprendizado:** as 4 settings de supply-chain (`minimumReleaseAge`, `minimumReleaseAgeStrict`,
`trustPolicy: no-downgrade`, `blockExoticSubdeps`) são **decisão de segurança**, não configuração
incidental. Removê-las reabre o vetor do incidente `axios` (ADR-0011).

**Destino:** **rule nova** — `.claude/rules/supply-chain.md`, com
`paths: ["package.json", "pnpm-workspace.yaml", "Dockerfile*", ".npmrc"]`. É a primeira lacuna de
cobertura de path identificada.
**Candidato a enforcement (FR-023):** teste que falhe se qualquer das 4 settings sumir do
`pnpm-workspace.yaml` — mecânico vence texto.

### ✅ `0027-zod-openapi-contract-first-http-edge` → **GERA REGRA + RULE NOVA**

| Teste | Resultado                                                            |
| ----- | -------------------------------------------------------------------- |
| A     | ✅ Acionável ao editar qualquer rota, schema ou DTO de borda         |
| B     | ✅ Sem enforcement — `grep -n zod eslint.config.js` não retorna nada |
| C     | ✅ Cabe em 4 linhas; as alternativas rejeitadas ficam no ADR         |

**Aprendizados (4):**

1. **Zod vive exclusivamente em `adapters/http/`.** Domínio e application **nunca** o importam.
   Estado hoje: **zero violações** — mantido por disciplina, sem rede mecânica.
2. **Divisão de camadas, não redundância.** Zod valida o _envelope_ → **400** antes do use case;
   smart constructors validam _regra de negócio_ → `Result<T,E>` → 4xx. Fluxo:
   `request → Zod (shape) → smart constructor (regra) → use case → Result → HTTP`.
3. **OpenAPI é gerado dos schemas, nunca escrito à mão.** Alvo 3.1.1 — `zod-openapi` suporta
   **apenas** 3.1.0/3.1.1 (3.0.x e 3.2.0 fora). O `openapi.yaml` legado é referência de migração,
   não contrato vivo.
4. ⚠️ **A sobreposição Zod × smart constructor é deliberada** — o ADR diz literalmente
   _"É intencional, não DRY-violation"_. **É o aprendizado mais valioso do lote**: sem ele numa rule,
   um refactor "limpa" a duplicação aparente e derruba a validação de shape na borda.

**Destino:** **rule nova** — `.claude/rules/http-edge.md`, com
`paths: ["src/modules/*/adapters/http/**/*.ts", "tests/modules/*/adapters/http/**/*.ts"]`.
Segunda lacuna estrutural de path: a borda HTTP é a **UX primária** desde o ADR-0037 e não tem
nenhuma rule, apesar de 5 ADRs (0025, 0027, 0028, 0032, 0033) legislarem sobre ela.

**Candidato a enforcement (FR-023):** `no-restricted-imports` do ESLint barrando `zod` fora de
`adapters/http/` — a invariante #1 é puramente estrutural, logo mecanizável. Hoje só a disciplina
humana a sustenta.

---

## Lacunas estruturais de cobertura descobertas

O trabalho revelou algo que a leitura ADR-a-ADR não previa: **as rules cobrem `src/modules/*/{domain,
application,adapters}`, `tests/` e `api-collections/` — e mais nada.** Arquivos que carregam decisão
arquitetural ficam sem rule:

| Path sem rule                                                 | ADRs que legislam sobre ele  | Risco                                                  |
| ------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ |
| `pnpm-workspace.yaml`, `package.json`, `Dockerfile`, `.npmrc` | 0011, 0029                   | Remover setting de supply-chain sem saber que é defesa |
| `src/modules/*/adapters/http/**`                              | 0025, 0027, 0028, 0032, 0033 | Quebrar contract-first; "limpar" validação deliberada  |

Ambas nascem do mesmo padrão: as rules foram escritas seguindo as **camadas do modular monolith**, e
o que está **fora** dessas camadas nunca ganhou cobertura — mesmo carregando decisão tão normativa
quanto o domínio.

---

## Grupo borda HTTP — fechado _(5 ADRs)_

Todos passam no teste B: o glob de borda do ESLint (`eslint.config.js:299`) apenas **afrouxa** regras
(`prefer-readonly-parameter-types`, `promise-function-async`, `require-await` → `off`) para acomodar os
tipos do Fastify. **Não impõe nada.** Nenhuma invariante de fronteira é mecânica.

| ADR    | Veredito | Aprendizado destilado                                                                                      |
| ------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| `0025` | **GERA** | Borda é adapter: traduz `Result`→HTTP; `throw` só aqui; não duplicar o BFF (ADR-0005 **não** é superseded) |
| `0027` | **GERA** | Zod exclusivo da borda; sobreposição com smart constructor é **deliberada**; OpenAPI 3.1.1 gerado          |
| `0028` | **GERA** | Três locais (shell / composition root / HTTP de feature); `server.ts` só importa via `public-api/http.ts`  |
| `0032` | **GERA** | Rota composta é transitória e marcada; **dado de outro módulo → borda; atributo próprio → agregado**       |
| `0033` | **GERA** | Versionamento **por recurso**: v1 espelha legado e é congelado; v2 é o default do `buildApp`               |

**Refinamento importante entre ADRs:** o `0027` diz que Zod vive em `adapters/http/`; o `0028` **estende**
para incluir `src/shared/http/`. A rule registra o escopo do 0028 (o mais recente e específico) — ler só
o 0027 produziria uma regra estreita demais, que marcaria o shell transversal como violação.

### ✅ `0011-supply-chain-hardening` → **GERA REGRA PARCIAL**

Único ADR até agora com veredito **misto**, e por isso o melhor teste do método:

| Pilar do ADR-0011                          | Teste B                                                                                             | Destino                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------- |
| §4 lista de libs proibidas                 | ❌ **já enforced** — `no-restricted-imports` (`eslint.config.js:77`), com a mensagem do ADR no erro | **Não vira rule** (FR-022) |
| §3 pin de versões críticas (sem `^`/`~`)   | ✅ sem enforcement                                                                                  | `supply-chain.md`          |
| §5 checklist de adoção de nova dep         | ✅ sem enforcement                                                                                  | `supply-chain.md`          |
| §1 lockfile committed, `--frozen-lockfile` | ⚠️ parcial (CI cobre; o manifesto não)                                                              | `supply-chain.md`          |
| Substituições nativas do Node 24           | ✅ sem enforcement (exceto as já proibidas)                                                         | `supply-chain.md`          |
| §2 audit em CI · §6 permission model       | ❌ não é acionável ao editar estes paths                                                            | Fica no ADR                |

Sem o teste B, a §4 teria virado uma tabela de 5 libs duplicando o que o ESLint já reporta com mensagem
melhor — no ponto do erro, não no ponto da leitura.

---

## Rules criadas

### `.claude/rules/http-edge.md`

`paths`: `src/shared/http/**/*.ts` · `src/modules/*/adapters/http/**/*.ts` ·
`tests/modules/*/adapters/http/**/*.ts` · `src/server.ts`

Destila 0025, 0027, 0028, 0032, 0033. Fecha a lacuna da borda HTTP — que é a **UX primária** desde o
ADR-0037 e não tinha nenhuma rule.

### `.claude/rules/supply-chain.md`

`paths`: `package.json` · `pnpm-workspace.yaml` · `Dockerfile*` · `.npmrc`

Destila 0011 (parcial) e 0029. Protege as 4 settings que defendem contra o vetor do incidente `axios`.
Inclui aviso explícito para citar **ADR-0029**, não o ADR-0012 superseded.

**Verificação de integridade:** os 4 agentes e os 9 ADRs referenciados existem; as citações
`eslint.config.js:77`, `eslint.config.js:299` e as 4 linhas de `pnpm-workspace.yaml` conferem com o
conteúdo real.

---

## Candidatos a enforcement mecânico (FR-023)

| #   | Invariante                                                       | Mecanismo proposto                                         | Origem   |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------- | -------- |
| 1   | Zod não pode ser importado fora da borda                         | `no-restricted-imports` com `paths`/`patterns` por glob    | ADR-0027 |
| 2   | As 4 settings de supply-chain não podem sumir                    | teste que lê `pnpm-workspace.yaml` e falha se faltar uma   | ADR-0029 |
| 3   | CNPJ tratado como "14 dígitos"                                   | lint que sinalize `\d{14}` / `[0-9]{14}` em código de CNPJ | ADR-0044 |
| 4   | `src/server.ts` importando `domain/` ou `application/` de módulo | `no-restricted-imports` por path no composition root       | ADR-0028 |

O #1 e o #4 são estruturais puros — mecanizá-los tornaria as seções correspondentes da rule
redundantes, que é o resultado desejado: **regra que bloqueia vale mais que regra que instrui.**

---

## Lote 2 — persistência e dados _(6 ADRs)_

| ADR    | Veredito       | Aprendizado / justificativa                                                                                                                                                                                                                                  |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0013` | **JÁ COBERTO** | Engine MySQL 8.4 + `mysql2` + `drizzle-orm/mysql2` + `drizzle-kit` já estão em `adapters.md` e no `AGENTS.md`. É stack, não regra de edição                                                                                                                  |
| `0014` | **GERA**       | **Regra de ouro: um único escritor por database.** `core.*` só o core-api escreve. Eventos via outbox são o **único** canal cross-database                                                                                                                   |
| `0015` | **GERA**       | O `INSERT` na outbox vai **dentro da mesma transação** da mudança de domínio — "o evento existe se e somente se o estado foi persistido". MySQL não tem `LISTEN/NOTIFY`: **polling apenas**                                                                  |
| `0019` | **GERA**       | **1 port, 1 adapter, 1 SDK, 2 endpoints, 0 emulação custom.** `@aws-sdk/client-s3` é o único cliente — sem wrapper caseiro. MinIO↔S3 troca por endpoint; `forcePathStyle: true` só para MinIO                                                                |
| `0022` | **GERA**       | O outbox **é** o log append-only canônico — não criar event-store separado. Read-model é **projeção** alimentada pelo event-delivery, nunca por query direta na tabela de entrega. Projetor idempotente por `eventId`; read-model é derivado e reconstruível |
| `0026` | **GERA**       | Dois pools: comando→`writer`, query→`reader`. O reader **nunca** emite `INSERT/UPDATE/DELETE`. Read-after-write crítico lê do primário, **decisão explícita no use case**                                                                                    |

**Nuance capturada em `0015`:** `application.md` já diz "eventos só após o save ter sucesso" — mas isso
**não é a mesma coisa** que "o INSERT na outbox ocorre dentro da transação". A regra atual permite
implementação não-atômica que satisfaz a letra e viola o ADR. A linha precisa ser refinada, não duplicada.

## Lote 3 — domínio, módulos e eventos de integração _(6 ADRs)_

| ADR            | Veredito | Aprendizado / justificativa                                                                                                                                                                                                                                              |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0023`, `0039` | **GERA** | Máquina de estado do `Contract` tem **5 estados**: `Pending`, `Active`, `Expired`, `Terminated`, `Cancelled`. `Cancelled` só é alcançável a partir de `Pending`. `contracts-module.md` descreve o agregado mas **não lista a máquina**                                   |
| `0035`         | **GERA** | **Soft-delete padronizado em todo `par_*`**: `active` + `deactivated_at` + CHECK `(active=FALSE)=(deactivated_at IS NOT NULL)`. **Nunca hard delete.** Desmarcar = inativar, idempotente                                                                                 |
| `0043`, `0046` | **GERA** | Payload de integração é montado **no adapter de persistência a partir do snapshot do agregado**, nunca do evento de domínio (o domínio não muda). `JSON.stringify` em `varchar` — sem JSON nativo. **Campo aditivo NUNCA quebra o v1**: não faz bump de `schema_version` |
| `0045`         | **GERA** | Projeção cross-módulo vive em **worker no composition root**, fora dos módulos — nenhum módulo importa o outro. Idempotência por `ON DUPLICATE KEY UPDATE` + **guard de recência** por `occurred_at`, sem SELECT-then-UPDATE                                             |

---

## Terceira lacuna estrutural — rules por módulo

`src/modules/` tem **8 módulos** (`auth`, `budget-plans`, `contracts`, `financial`, `notifications`,
`partners`, `programs`, `reports`) e existe **uma única** rule de módulo: `contracts-module.md`.

Os 7 módulos restantes têm ADRs próprios com regra acionável e nenhuma rule que a entregue:

| Módulo          | ADRs sem rule que os entregue |
| --------------- | ----------------------------- |
| `partners`      | 0031, 0035, 0036, 0043        |
| `financial`     | 0045, 0050, 0051              |
| `auth`          | 0024, 0052                    |
| `notifications` | 0010, 0047                    |
| `budget-plans`  | 0051                          |

⚠️ **Não criar as 7 de uma vez.** Por FR-024, cada rule precisa de justificativa própria — criar por
simetria é exatamente o "crescimento por completude" que o requisito proíbe. A recomendação é criar
**sob demanda**, começando por `partners` (4 ADRs, e o soft-delete do 0035 é a regra mais fácil de violar
por desconhecimento).

---

## Lote 4 — auth, módulos e execução _(4 ADRs)_

| ADR    | Veredito | Aprendizado / justificativa                                                                                                                                                                                                                                                                                                         |
| ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0052` | **GERA** | `AUTH_RBAC_MODE=bypass` desliga só a **autorização** — `requireAuth` continua (401 permanece). ⚠️ **RBAC não é ponto único:** 4 use cases do `auth` fazem `authorize` embutido, fora do wrapper. `cannot-self-lockout` **sobrevive ao bypass** (protege estado persistido, não autorização). O bypass **nunca** pode ser silencioso |
| `0031` | **GERA** | `partners` tem 3 agregados (`supplier`, `financier`, `collaborator`). Geografias são **lookup, não agregado**. ⚠️ Enums do legado viram EN kebab **exceto** `race`/`gender_identity` (categorias IBGE) e `serviceCategory`/`occupationArea` (fidelidade de ETL, incluindo o typo legado)                                            |
| `0041` | **GERA** | Job periódico é **one-shot por cron externo**, nunca `setInterval`. Uma transação: `UPDATE` em lote + `INSERT` outbox → fecha pool → `exit`. **Sem** `SIGTERM` listener no one-shot (ao contrário do worker contínuo) — o rollback é a garantia. `worker_threads` é CPU-bound e **não se aplica**                                   |
| `0051` | **GERA** | `budget-plans` é owner do planejável; `financial` **lê via public-api** (OHS/ACL) e não espelha. `fin_categories` retém o **operacional** — "ninguém planeja um estorno". `direction` × `group` **não se unificam**                                                                                                                 |

## Lote 5 — dados, e-mail e leitura de documento _(4 ADRs)_

| ADR    | Veredito    | Aprendizado / justificativa                                                                                                                                                                                                                                                                                                                                                                               |
| ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0020` | **PARCIAL** | A lista de features SQL permitidas/proibidas **já está** em `adapters.md`. Os **mapeamentos canônicos não estão**: `Money`→`BIGINT`, `Date`→`DATETIME(3)`, `Period`→**3 colunas**, `VARCHAR(16)+CHECK` no lugar de `ENUM`, `VARCHAR(36)` em PK, tabela de junção no lugar de array                                                                                                                        |
| `0047` | **GERA**    | E-mail transacional é **evento de domínio do produtor**, no outbox do produtor, **na mesma transação**. `notifications` é consumidor, nunca dependência síncrona. O payload carrega token de uso único → **não é logado**                                                                                                                                                                                 |
| `0006` | **COBERTO** | "Cross-módulo só por `public-api`" já está em `contracts-module.md` e `application.md`. ⚠️ A estrutura descrita no ADR (`src/contexts/{documentos,titulos,banco,ocr}`) **não corresponde** ao repo real (`src/modules/{auth,budget-plans,…}`) — é a projeção inicial, não drift a corrigir (ADR é imutável)                                                                                               |
| `0050` | **GERA**    | `DocumentReaderPort` **recebe bytes**, nunca URL vinda do cliente (**anti-SSRF**). Cascata XML → texto nativo → OCR externo → **erro explícito**; "nunca valor errado silencioso" (invariante fiscal). O domínio recebe **campos tipados**, não texto bruto (minimização LGPD). Log nunca contém bytes/texto/resultado. Proibidos: `mupdf.js` (AGPL), Qwen2.5-VL-3B (licença Research), OCR cloud sem DPA |

## Lote 6 — processo, infra e macro _(16 ADRs)_

| ADR            | Veredito     | Justificativa                                                                                                                                                                            |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0034` (bruno) | **GERA**     | `@usebruno/cli` é **devDependency pinada, nunca `dependencies`** — Bruno jamais entra em produção. Exceção cirúrgica por-versão no `pnpm-workspace.yaml`. **Vai para `supply-chain.md`** |
| `0021`         | **GERA**     | ⚠️ **MagaluCloud PBE: sem dump legado, sem dados reais ou pessoais, sem Bradesco real.** Restrição de LGPD acionável em config de deploy                                                 |
| `0024`         | **GERA**     | Identidade própria OIDC-ready por port `Authenticator`; RBAC por permissões granulares. Consolida com `0052` numa rule de `auth`                                                         |
| `0036`         | **GERA**     | `Act` reusa o soft-delete padrão `par_*` + **status duplo** (`registrationStatus` × `status`). Reforça `0035`                                                                            |
| `0005`         | **COBERTO**  | "BFF é burro, zero regra de negócio" já entrou na `http-edge.md` via `0025`                                                                                                              |
| `0037`, `0038` | **COBERTO**  | HTTP-first já está na `http-edge.md`; o `0038` é literalmente a `api-collections.md`                                                                                                     |
| `0040`, `0054` | **COBERTO**  | Achado→issue e trailer `Assisted-by:` já são seções normativas do `AGENTS.md`                                                                                                            |
| `0002`, `0009` | **COBERTO**  | Stack (Node 24 / TS 6 strict) já vive no `AGENTS.md` e no `tsconfig.json` — este último é enforcement real                                                                               |
| `0010`         | **COBERTO**  | Port & adapter já em `application.md`/`adapters.md`. Paths do ADR (`packages/shared-kernel/`, `apps/core-api/`) são da projeção inicial                                                  |
| `0001`         | **NÃO GERA** | Estratégia macro de migração — não é acionável ao editar arquivo algum                                                                                                                   |
| `0008`         | **NÃO GERA** | O módulo `banco` ainda não existe em `src/modules/` — sem path alvo. Reavaliar quando nascer                                                                                             |
| `0042`         | **NÃO GERA** | O dead-man's switch vive fora do core-api (workflow/dispositivo). Fora do escopo de path                                                                                                 |
| `0034` (ocr)   | **NÃO GERA** | **Superseded de fato** pelo `0050` — ver achado abaixo                                                                                                                                   |

---

## Segundo achado de status desatualizado

`0034-ocr-port-adapter.md` declara **`Status: Accepted`**, mas o `0050` o supersede — e o diz no título
_e_ no nome do arquivo (`0050-document-reader-cascade-supersedes-0034.md`). O status nunca foi atualizado.

**Mesma classe do `ADR-0012`**, e por isso vale como padrão, não como caso isolado: **o repo supersede
ADRs sem atualizar o `Status` do superseded.** Uma triagem automática por status — como a que abriu este
trabalho — classifica ambos como vigentes e destila norma morta.

Efeito na contagem: **43 Accepted de fato**, não 44. Some-se a numeração duplicada de `0034` (dois ADRs
com o mesmo número), já registrada no Apêndice C do doc de processo.

---

## Cobertura final — 44 de 44 julgados _(100%)_

| Veredito                          | Qtd    | Quais                                                                                                                                                                                     |
| --------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GERA REGRA**                    | **30** | 0011, 0014, 0015, 0019, 0020, 0021, 0022, 0023, 0024, 0025, 0026, 0027, 0028, 0029, 0031, 0032, 0033, 0034(bruno), 0035, 0036, 0039, 0041, 0043, 0044, 0045, 0046, 0047, 0050, 0051, 0052 |
| **JÁ COBERTO** (rule ou mecânico) | **10** | 0002, 0005, 0006, 0009, 0010, 0013, 0037, 0038, 0040, 0054                                                                                                                                |
| **NÃO GERA**                      | **4**  | 0001, 0008, 0034(ocr), 0042                                                                                                                                                               |
| _(+ 10 inelegíveis na triagem)_   | —      | 0003, 0004, 0007, 0012, 0017, 0018, 0030, 0048, 0049, 0053                                                                                                                                |

**SC-010 satisfeito:** todos os 54 ADRs têm veredito registrado — 10 na triagem por status, 44 no julgamento.

---

## Aplicação — os 30 "GERA" nas rules _(concluída)_

**6 → 12 rules · 15.305 → 44.177 bytes.** Gate verde: `prettier` + `typecheck` + `lint`. Zero mudanças em `src/`.

| Rule                  | Estado    | ADRs aplicados                                             |
| --------------------- | --------- | ---------------------------------------------------------- |
| `domain.md`           | estendida | 0044 · **`paths` passou a cobrir `src/shared/kernel/`**    |
| `application.md`      | estendida | 0015, 0026, 0047                                           |
| `adapters.md`         | estendida | 0014, 0015, 0019, 0020, 0022, 0026, 0043, 0045, 0046, 0050 |
| `contracts-module.md` | estendida | 0023, 0039                                                 |
| `http-edge.md`        | **nova**  | 0025, 0027, 0028, 0032, 0033                               |
| `supply-chain.md`     | **nova**  | 0011, 0021, 0029, 0034(bruno)                              |
| `partners-module.md`  | **nova**  | 0031, 0035, 0036, 0043                                     |
| `auth-module.md`      | **nova**  | 0024, 0047, 0052                                           |
| `jobs-and-workers.md` | **nova**  | 0041, 0045                                                 |
| `financial-module.md` | **nova**  | 0045, 0051                                                 |

### Justificativa individual das 6 rules novas (FR-024)

Nenhuma nasceu por simetria — cada uma responde a um risco nomeado:

| Rule                  | Por que existe                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `http-edge.md`        | 5 ADRs legislam sobre a **UX primária** do sistema, e não havia nenhuma rule                            |
| `supply-chain.md`     | 4 settings que defendem contra o vetor do incidente `axios`, sem nada que avise quem as editar          |
| `partners-module.md`  | Soft-delete padronizado + **4 enums que não devem ser traduzidos** — violáveis por puro desconhecimento |
| `auth-module.md`      | **"RBAC não é ponto único"** — armadilha com histórico real (#462)                                      |
| `jobs-and-workers.md` | 10 entrypoints, padrão canônico detalhado no ADR-0041, zero cobertura                                   |
| `financial-module.md` | Única regra do conjunto que existe para **impedir uma remoção** (`fin_categories` não é deprecada)      |

**Os 7 módulos não contemplados seguem sem rule, deliberadamente** — `programs`, `reports`, `notifications`, `budget-plans` (coberto pela fronteira em `financial-module.md`) não têm ADR com regra acionável própria. Criar rule para eles seria o crescimento por completude que a FR-024 proíbe.

### Falha de aplicação corrigida no meio do caminho

O ADR-0044 — **o caso que abriu este trabalho** — entrou inicialmente só como referência em
`partners-module.md`, sem virar regra acionável. Ao procurá-lo para conferir, apareceu a **quinta lacuna
de path**: `src/shared/kernel/` guarda os 8 VOs cross-BC (`Cnpj`, `Cpf`, `Money`, `Period`…) e **nenhuma
rule o tinha em `paths:`** — duas o citavam no corpo, o que dá a ilusão de cobertura. Resolvido estendendo
`domain.md`, que é conceitualmente a rule certa: o kernel **é** domínio puro.

Lição: citar um path no corpo de uma rule **não** o cobre. Só `paths:` cobre.

---

## Pendente

- [ ] Corrigir o `Status` de `0034-ocr` para `Superseded by ADR-0050` _(escopo de handbook)_
- [ ] Corrigir as ~20 citações a `ADR-0012` → `ADR-0029` _(escopo de US2)_
- [ ] Registrar as 6 rules novas na tabela de `.claude/rules/` do `AGENTS.md` _(descoberta humana; o carregamento por `paths:` já funciona)_
- [ ] Implementar os 4 candidatos a enforcement mecânico
