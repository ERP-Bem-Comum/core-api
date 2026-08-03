# Auditoria do harness `.claude/` — 2026-07-31

> **Estado: diagnóstico completo, ZERO decisão tomada, ZERO arquivo de harness alterado.**
> As decisões ficaram para o dono do repo. A lista está em [§Decisões pendentes](#decisões-pendentes).
>
> Insumos: o inventário de 55 ADRs em [`context/decisions/`](./decisions/) (293 alegações verificadas
> contra `src/` com evidência `path:linha`) e a pesquisa de formato em
> [`handbook/inquiries/0024-adr-format-for-llm-agents.md`](../handbook/inquiries/0024-adr-format-for-llm-agents.md).

## Método

Três auditorias paralelas (sub-agentes `general-purpose`), cada uma sobre uma fatia de `.claude/`, tendo
como fonte de verdade o inventário + `handbook/architecture/adr/` + `src/`. **Todo achado de maior dano
relatado abaixo foi re-verificado manualmente na sessão principal** — nenhum resultado de agente foi
repassado no valor de face. Nove verificações independentes, todas confirmadas.

---

## 1. `.claude/rules/` — 169 afirmações normativas em 12 arquivos

| Categoria      |  Nº | Significado                                                   |
| -------------- | --: | ------------------------------------------------------------- |
| **SUSTENTADA** |  84 | a alegação de origem se sustenta no código                    |
| **IMPRECISA**  |  31 | claim é `partial`/`unverified` e a rule enuncia como absoluta |
| **REDUNDANTE** |  23 | já barrada por semgrep / eslint / teste / hook                |
| **ÓRFÃ**       |  20 | nenhum ADR decidiu — a rule afirma por conta própria          |
| **FALSA**      |  11 | manda fazer o que o código não faz                            |

**Metade (85 de 169) é falsa, imprecisa, órfã ou redundante.**

Por arquivo (falsa · redundante · sustentada · órfã · imprecisa):

| Rule                  |   F |   R |   S |   Ó |   I | Nota                                                |
| --------------------- | --: | --: | --: | --: | --: | --------------------------------------------------- |
| `adapters.md`         |   1 |   3 |  17 |   5 |   9 | a mais exposta — 13 ADRs de origem                  |
| `application.md`      |   0 |   1 |   3 |   5 |   2 | pior razão sustentada/total                         |
| `domain.md`           |   2 |   6 |   4 |   1 |   0 | 2 caminhos inexistentes                             |
| `testing.md`          |   0 |   6 |   0 |   5 |   0 | **zero** sustentadas; linhagem empírica, não de ADR |
| `financial-module.md` |   0 |   0 |   4 |   0 |   3 | linhagem existe e não foi registrada                |
| `jobs-and-workers.md` |   2 |   0 |  11 |   0 |   0 | as 2 falsas são as mais perigosas do conjunto       |
| `http-edge.md`        |   1 |   0 |  14 |   0 |   5 |                                                     |
| `auth-module.md`      |   1 |   1 |   8 |   1 |   1 | não menciona Cognito (ADR-0055)                     |
| `contracts-module.md` |   0 |   2 |   4 |   2 |   2 |                                                     |
| `partners-module.md`  |   3 |   1 |   8 |   0 |   1 | mais falsas em número absoluto                      |
| `supply-chain.md`     |   0 |   3 |   7 |   1 |   4 |                                                     |
| `api-collections.md`  |   1 |   0 |   4 |   0 |   4 | metade do `paths:` morta                            |

### As 11 FALSAS (todas re-verificadas)

| Rule                     | Afirma                                                            | Realidade                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth-module.md:9`       | "Federação não foi descartada — foi **adiada**"                   | `ADR-0055` (Accepted, 2026-07-29) decidiu Cognito. **`Cognito` aparece em 0 das 12 rules.**                                                                              |
| `jobs-and-workers.md:12` | "um **entrypoint por responsabilidade**"                          | `src/workers/runner/run.ts:3,22,25,35` — 3 processos por `WORKER_GROUP`, consolidado por causa do incidente do RDS                                                       |
| `jobs-and-workers.md:51` | "coordenação multi-instância (**quando chegar**)… o cron garante" | existe desde 2026-06-17: `ctr_job_runs` (`schemas/mysql.ts:505`), `claimJobRun`/`INSERT IGNORE`, usado em `sweeper/run.ts:59`                                            |
| `http-edge.md:49`        | tabela: `/api/v2` = `auth`                                        | os 4 plugins de `auth` estão em `/api/v1` (`server.ts:364,382,390,407`); 11 prefixos `/api/v1` no total                                                                  |
| `partners-module.md:37`  | tabelas `partner_states` / `partner_municipalities`               | os nomes reais são `par_states` (`mysql.ts:377`) e `par_municipalities` (`:404`)                                                                                         |
| `partners-module.md:37`  | "geografias são lookup **sem ciclo de vida**; catálogo read-only" | as duas TÊM ciclo de vida (`active` + `deactivated_at` + CHECK), `mysql.ts:390,419` — o oposto                                                                           |
| `partners-module.md:38`  | "VOs `Cpf`/`Cnpj`/**`Email`** vivem no shared kernel"             | `src/shared/kernel/email.ts` **não existe**; o VO está em `auth/domain/identity/email.ts`                                                                                |
| `domain.md:13`           | `Result` em `src/shared/result.ts`                                | inexistente — o real é `src/shared/primitives/result.ts`                                                                                                                 |
| `domain.md:16`           | branded types em `src/shared/brand.ts`                            | inexistente — o real é `src/shared/primitives/brand.ts`                                                                                                                  |
| `adapters.md:44`         | read/write split "norma decidida e **ainda não implementada**"    | existe em `contracts` e `partners` (`composition.ts:235,238`; `server.ts:201,219`). A prova por `grep createPool` do próprio texto é refutada em `ADR-0026.yaml:270-273` |
| `api-collections.md:31`  | expected-fail "não bloqueia o gate verde"                         | `scripts/e2e/bruno-all.sh:8` diz "não bloqueia" e `:99` diz "deve PASSAR" — o runner **executa** a pasta                                                                 |

### Globs mortos (a rule nunca carrega no arquivo que ela mesma nomeia)

- `api-collections.md` — `scripts/e2e-bruno-*.sh` **não casa com nada**. O runner real é `scripts/e2e/bruno-all.sh`.
  É justamente a metade do `paths:` que apontaria para o arquivo cuja contradição interna produz a única FALSA da rule.
- `supply-chain.md` — a seção PBE manda agir "ao editar config de deploy, **compose** ou connection string",
  e `compose.yaml` (existe na raiz) **não está** no `paths:`.

### Linhagem das 3 rules sem `applied_to` no inventário

- **`testing.md` — genuinamente órfã.** Não aparece em `specs/039-.../adr-rules-distillation.md`. Criada no
  commit `e03a146a` ("checkpoint big-bang"), **antes** do `f976d36b` que reconstruiu as rules a partir dos ADRs.
  Linhagem real é empírica (#521/#535, MySQL 8.4 isolado). Zero afirmações sustentadas por ADR.
- **`financial-module.md` e `jobs-and-workers.md` — linhagem existe, não registrada.**
  `adr-rules-distillation.md:388-389` declara `jobs-and-workers | nova | 0041, 0045` e
  `financial-module | nova | 0045, 0051`, mas os `prior_art.applied_to` do inventário apontam para
  `adapters.md`. **É lacuna do meu inventário, não das rules** — corrigir ao retomar.

### Mecanismos que os ADRs nomeiam e que NÃO existem

- **`no-cross-context-import`** — o `ADR-0006` o nomeia; `grep` em `eslint.config.js` volta vazio.
  Duas rules (`application.md:15`, `contracts-module.md:57`) se apoiam nele.
- As 4 settings de supply-chain (`minimumReleaseAge`, `minimumReleaseAgeStrict`, `trustPolicy`,
  `blockExoticSubdeps`) existem em `pnpm-workspace.yaml:46,49,52,68` e **nenhum teste ou workflow as cobra**.

---

## 2. `.claude/agents/` — 12 dos 15 mentem sobre o projeto

11 dos 15 foram escritos em 2026-05-25 ou antes. Os ADRs **0025 a 0056** — 32 decisões, incluindo toda a
borda HTTP, a aposentadoria da CLI, o RBAC e a política de IA — são posteriores. O diff não-commitado nos
14 arquivos só acrescenta a seção "Memória do agente"; **nenhuma correção de conteúdo**.

| Agente                                                    | Obsoletas | A mais grave                                                                                          |
| --------------------------------------------------------- | --------: | ----------------------------------------------------------------------------------------------------- |
| `contratos-orchestrator`                                  |    **12** | roteia HTTP e e-mail como "reservado Fase 2+, exige novo ADR" — e é o **ponto de entrada único**      |
| `pnpm-workspace-expert`                                   |     **9** | prescreve `"preinstall": "npx only-allow pnpm"` (`:186`) — **`npx` é npm**, bloqueado pelo hook       |
| `docker-compose-expert`                                   |     **8** | "Dockerfile é esqueleto… hoje a CLI roda local" — em produção desde 2026-06-07                        |
| `bruno-api-client-expert`                                 |     **8** | todos os 3 templates `.bru` abrem com `#` — o `ADR-0038` diz que o parser **rejeita**                 |
| `drizzle-orm-expert`                                      |     **7** | manda rejeitar `.onDuplicateKeyUpdate()` citando "ADR-0020 §Padrão de upsert" — **seção inexistente** |
| `nodemailer-email-expert`                                 |     **7** | "Nodemailer 6.x" — o `package.json` traz `^9.0.1`; e desconhece o `resend` em produção                |
| `mysql-database-expert`                                   |     **5** | pool `connectionLimit: 10 + keepAlive` — omite a invariante `maxIdle < connectionLimit`               |
| `mysql2-driver-expert`                                    |     **5** | template com `idleTimeout` **sem `maxIdle`** — a config inerte do `Incident-0001`                     |
| `security-backend-expert`                                 |     **5** | atesta `authorize()` fail-closed como invariante; o `ADR-0052` permite `AUTH_RBAC_MODE=bypass`        |
| `nodejs-runtime-expert`                                   |     **5** | prescreve `src/shared/lifecycle.ts` — **caminho fantasma**                                            |
| `fastify-server-expert`                                   |     **5** | "Type Provider requer ADR" contradiz o próprio §37, que cita o `ADR-0027` já adotado                  |
| `typescript-language-expert`                              |     **2** | `src/shared/brand.ts` — real é `src/shared/primitives/brand.ts`                                       |
| `zod-expert` · `security-frontend-expert` · `w2-reviewer` |         0 | —                                                                                                     |

### Verificados manualmente

- `pnpm-workspace-expert.md:186` = `"preinstall": "npx only-allow pnpm"`. O real:
  `node --experimental-strip-types … scripts/ci/only-allow-pnpm.ts`. ✅ confirmado
- `src/shared/lifecycle.ts` não existe; importado por `fastify-server-expert.md:166` e
  `nodejs-runtime-expert.md:200`. ✅ confirmado
- `ADR-0020` **libera** `ON DUPLICATE KEY UPDATE` (meu registro do 0020 já marcava `exercised`, 9 usos). ✅

### Achados estruturais

1. **13 dos 15 agentes não sabem que `.claude/rules/` existe.** Só `security-backend-expert` e
   `w2-reviewer` citam. Os outros declaram herdar do `CLAUDE.md` — que hoje é um **stub de 14 linhas**
   importando `@AGENTS.md` — e apresentam hierarquias de fonte de 5 a 8 níveis em que "regras por camada"
   não aparece. As 12 rules governam exatamente os diretórios que esses agentes editam.
2. **Dois agentes dão instrução OPOSTA sobre o mesmo ADR.** `mysql-database-expert` lista
   `ON DUPLICATE KEY UPDATE` como permitida (correto); `drizzle-orm-expert` manda reprovar em PR.
3. **Três agentes reintroduzem defeitos conhecidos** se seguidos literalmente: o `npx`, a config de pool
   do incidente, e a reprovação de 9 upserts que rodam em produção.

---

## 3. `.claude/skills/` — 44 skills, 9 sem substrato

**`.claude/skills/skill-base/SKILL.md` e `.claude/shared-references/` NÃO EXISTEM** (✅ verificado).
Nove skills das famílias tutor/theorist/engineer abrem declarando estender o "contrato universal" em
`skill-base/SKILL.md` e citam livros em `../../shared-references/`. A §"Fundamento canônico" dessas nove
está sem base.

Classificação: **22 ATIVA · 1 APOSENTADA · 18 EM-TRANSIÇÃO · 19 ÓRFÃ · 0 FANTASMA.**
A tabela do `AGENTS.md` lista 25; **19 das 44 em disco não estão nela**.

| Classe           | Itens                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **APOSENTADA**   | `application-cli-builder` (331 linhas) — `ADR-0037`; e o orquestrador roteia para ela em **4 lugares** |
| **EM-TRANSIÇÃO** | 15× `speckit-*` (spec 039) + `pipeline-maestro`/`code-reviewer`/`ts-quality-checker` (spec 038)        |
| **ÓRFÃ**         | as 15 `speckit-*`, `issue-report` (normativa por `ADR-0040`!), `w0-red`, `w2-review`                   |

### Inversão futuro/passado

`w0-red` e `w2-review` — as substitutas — são as **únicas untracked**, invisíveis a um clone limpo.
As três do processo velho estão commitadas e listadas na tabela canônica.

### Roteamento colide, e uma família mostra a cura

Na família `clean-code`, duas irmãs declaram **"SEMPRE"** sobre o mesmo território (DRY), uma com
auto-trigger sem pedido explícito. A desambiguação existe, mas só no **corpo** (§Handoffs) — invisível na
hora de escolher. A família `database` resolve o mesmo problema com cláusula negativa:
_"NÃO use para ensinar do zero (`database-tutor`) nem para discutir filosofia (`database-theorist`)"_ —
três exclusões mútuas fechadas. **Prova de que o conserto é barato e só uma família o aplicou.**

E há **quatro** caminhos para "revisa esse código": `code-reviewer`, `w2-review`, `clean-code-reviewer`,
`security-backend-expert`.

### Instruções que o próprio harness bloqueia

`clean-code-reviewer:85` manda rodar `npm run lint` / `npm run typecheck` / `npm test` — barrado por
`.claude/hooks/block-npm.sh` e pelo anti-padrão #10 do `AGENTS.md`.

### O vazamento que sai do repositório

**`issue-report` amarra a Definition of Done ao "gate W3" em três linhas** — `:8` (no `description` do
front-matter, logo carrega em **toda** listagem de skills), `:47` e `:109`. A skill é normativa por
`ADR-0040` e cada invocação **grava** "Definition of Done amarrada ao gate W3" numa GitHub Issue
**pública**. O processo está em aposentadoria (spec 038) e o carimbo sobrevive ao repo.

### Acoplamento ao processo em saída

**34 das 44 (77%)** mencionam `.claude/.pipeline/`, `W0`–`W3` ou `speckit`. Sete citam
`.claude/.pipeline/<TICKET>/` como _"exemplos vivos"_ de domínio/use case/adapter/teste RED — cinco delas
ATIVAS e na tabela canônica. **A US4 da spec 038 evacua 3.436 arquivos**; no dia em que rodar, essas sete
perdem a evidência empírica. `nodejs-fs-scripter` é o caso extremo: o exemplo pedagógico central é uma
função `limparPipelines('.claude/.pipeline')`.

`.claude/.pipeline/` tem hoje **553 entradas** — a evacuação não foi executada.

### Artefatos de suporte fantasma

| Alvo citado como normativo                             | Existe? | Quem cita             |
| ------------------------------------------------------ | ------- | --------------------- |
| `.claude/skills/skill-base/SKILL.md`                   | **não** | 9 skills              |
| `.claude/shared-references/`                           | **não** | 11 skills             |
| `.claude/output-styles/erp-contracts.md`               | **não** | `AGENTS.md:230`       |
| `README.md §🌊 Pipeline 4-wave`                        | **não** | `pipeline-maestro:23` |
| `CLAUDE.md §"Regras invariantes"` / §"Mapa de camadas" | **não** | 6 skills              |

---

## 4. Linha do tempo — o que resistiu

**A curva de maturidade é monotônica de melhora.** Aderência das alegações por mês de decisão:

| Mês              | ADRs | `realized` |      aderência |
| ---------------- | ---: | ---------: | -------------: |
| 2026-04 fundação |   15 |          1 |        **38%** |
| 2026-05          |   14 |          4 |            58% |
| 2026-06          |   19 |          8 |        **67%** |
| 2026-07          |    7 |          2 | 48% → **79%**¹ |

¹ O mergulho de julho é **artefato**: `0055` (Cognito, fase 3 não iniciada, 1/12), `0053` (rejeitado, 1/5)
e `0049` (BFF não entrou, 2/9) puxam por estarem em fila, não por drift. Sem os três: **79%**.

**Resistiu:** as decisões de junho em diante. Seis ADRs com 100% (`0027`, `0029`, `0039`, `0043`, `0045`;
`0024` com 91%). E uma prática que ninguém normatizou apareceu sozinha — **citar o ADR dentro do código
que o cumpre**: nove casos, _todos_ de junho ou depois, nenhum dos fundacionais.

**Não resistiu:** a fundação. E o risco está **invertido** — as rules dependem dos ADRs mais fracos:

| ADR                      | data | aderência | rules que dependem dele           |
| ------------------------ | ---- | --------: | --------------------------------- |
| `0005` thin BFF          | 04   |   **0/4** | `http-edge`                       |
| `0026` read/write split  | 05   |   **0/5** | `adapters`, `application`         |
| `0021` AWS+PBE           | 05   |       1/6 | `supply-chain`                    |
| `0006` modular monolith  | 04   |       2/9 | `contracts-module`, `application` |
| `0014` isolamento DB     | 04   |       2/8 | `adapters`                        |
| `0033` versionamento API | 06   |       1/4 | `http-edge`                       |

`ADR-0026` é o pior caso: `Accepted`, **0 de 5**, alimentando duas rules.

---

## 5. Padrões que atravessam as três camadas

1. **Caminho fantasma.** `src/shared/result.ts`, `src/shared/brand.ts`, `src/shared/lifecycle.ts`,
   `.claude/skills/skill-base/`, `.claude/shared-references/`, `.claude/output-styles/`,
   `scripts/e2e-bruno-*.sh`, `drizzle.config.ts`, `partner_states`. Nas três camadas.
2. **ADR superseded citado como vigente.** `0012` (por `0029`), `0018` (por `0020`), `0024`
   (parcialmente por `0055`), `0007` (por `0021`). Em rules e agentes.
3. **Instrução que o harness bloqueia.** `npx only-allow pnpm`, `npm run lint`.
4. **Anotação obsoleta que afirma garantia mais forte que o código.** Duas ocorrências independentes,
   logo é padrão: os três comentários "fica para F-Plus" do `ADR-0041-C4` (mecanismo existe) e o
   `reports/adapters/http/plugin.ts:193` ("Gate dedicado: dado sensível LGPD… `collaborator:read`
   sozinho não abre") contra a linha 203, que usa o gate genérico. **A stale promete proteção LGPD que a
   rota não aplica.**

Teoria canônica (Uncle Bob, _Código Limpo_, p. 280, §C2 — citação literal via MCP, grounding 6/6):

> Um comentário que ficou velho, irrelevante e incorreto é obsoleto. (…) Comentários obsoletos tendem a
> se desviar do código que descreviam. **Eles se tornam ilhas flutuantes de irrelevância no código e
> passam informações erradas.**

Uma `.claude/rules/` falsa é isso em escala — não é uma ilha, é uma instrução que um agente **obedece**.

---

## Decisões pendentes

Nenhuma tomada. Ordem sugerida — a primeira condiciona as demais.

| #   | Decisão                                                                                            | Depende de |
| --- | -------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **Arranjo de artefatos**: qual é memória (ADR), qual é instrução (rules), e de onde cada um deriva | —          |
| 2   | As **11 FALSAS**: corrigir a partir do código, remover, ou marcar provisórias                      | 1          |
| 3   | As **23 REDUNDANTES**: virar ponteiro para o mecanismo, ou sair do texto                           | 1          |
| 4   | As **20 ÓRFÃS**: legitimar por derivação do código, abrir ADR, ou remover                          | 1          |
| 5   | As **31 IMPRECISAS**: como carregar a ressalva de um claim `partial`                               | 1          |
| 6   | Os **12 agentes obsoletos**: reescrever, congelar, ou remover                                      | 1          |
| 7   | O **`contratos-orchestrator`**: é o ponto de entrada e o pior arquivo                              | 6          |
| 8   | As **44 skills**: aposentadas, em transição, órfãs, e o substrato fantasma                         | —          |
| 9   | **Enforcement**: hook `PostToolUse` / gate de CI para impedir reincidência                         | 1–5        |
| 10  | **Tamanho dos registros**: os 55 do inventário têm 300–500 linhas; o padrão emergente pede ≤ ~200  | —          |

### Opções já levantadas para a Decisão 1 (não escolhidas)

1. **Separar por papel** — ADR imutável = memória do POR QUÊ; rules derivadas do **código** verificado,
   com o ADR como restrição. Divergência = ADR corretivo faltando. É o padrão que o campo convergiu.
   _Custo:_ duas fontes a sincronizar; a rule pode legitimar drift se ninguém abrir o corretivo.
2. **Colapsar** — matar `.claude/rules/` e pôr tudo no ADR com `applies_to` (o "agent-optimized ADR").
   Uma fonte só. _Custo grave:_ quebra a imutabilidade — o ADR passaria a ser editado, e se perde o
   registro histórico do porquê.
3. **Manter derivação do ADR + gate de CI** que falhe quando a afirmação corresponder a claim
   `absent`/`contradicted`. _Custo:_ não resolve a causa e exige manter os 293 registros para sempre.
4. **Mecanismo primeiro** — o que puder ser mecanizado sai do texto; rules só carregam o inauditável.
   Alinhado à diretriz registrada do dono (_"regra que não bloqueia não vale"_). _Custo:_ não responde de
   onde deriva o que sobra, e nenhuma das 11 falsas é mecanizável hoje. Provavelmente complemento, não
   alternativa.

## Trabalho de correção já identificado (fora de decisão)

Itens sem ambiguidade, que não dependem da Decisão 1:

- `context/decisions/ADR-0041.yaml` e `ADR-0045.yaml` / `ADR-0051.yaml`: registrar `applied_to` para
  `jobs-and-workers.md` e `financial-module.md` (lacuna do meu inventário, confirmada em
  `adr-rules-distillation.md:388-389`).
- Os 34 `unverified` do inventário nunca foram confrontados com código nem ticket.
- `handbook/incidents/` — quarto plano de evidência, nunca auditado. O único post-mortem lido explicava
  uma reversão de decisão arquitetural (`ADR-0041`).
- Colisão de numeração: `handbook/inquiries/0011` duplicado; `ADR-0047` duplicado em branch.
