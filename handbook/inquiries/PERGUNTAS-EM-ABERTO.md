[← Voltar ao README de Inquiries](./README.md)

# ❓ Perguntas em Aberto

> Checklist executivo das perguntas pendentes nas inquiries de estado **`open`** e **`blocked`**. O estado
> canônico vive no frontmatter de cada arquivo — este documento **não** é fonte de verdade de estado, é
> recorte de _o que ainda falta responder_. Para contexto, fundamentação e alternativas pesadas, sempre
> voltar à inquiry-fonte linkada em cada bloco.

- **Última revisão da prosa:** 2026-09-01 — sessão de debate do ambiente de dados: entrada da [0035](#inquiry-0035--duas-normas-que-a-medição-contradiz) e medição de 3 dos 4 itens do Drizzle 1.0 na [0026](#inquiry-0026--assíncrono-human-in-the-loop-drizzle-10-e-bruno--ts), com o gatilho refinado para duplo (revisões anteriores em 2026-08-17 e 2026-08-07)

<!-- BEGIN:generated -->

- **Inquiries cobertas:** 13 de 36 — [0011](./0011-auditoria-fiscal-cross-periodo.md) · [0012](./0012-bff-managed-api-gateway-vs-fastify.md) · [0014](./0014-schema-legado-vs-modelo-alvo.md) · [0015](./0015-charset-drizzle-roadmap.md) · [0019](./0019-hard-delete-tripwire-sem-superficie.md) · [0026](./0026-async-human-in-the-loop-and-drizzle-1-0.md) · [0027](./0027-teses-orfas-de-branches-contaminadas.md) · [0028](./0028-edd-da-po-melhorias-m1-m4-e-relatorios-nibo.md) · [0030](./0030-deadman-switch-nunca-vigiou.md) · [0031](./0031-deadlock-na-reserva-atomica-de-remessa.md) · [0032](./0032-titulo-remetido-fronteira-do-agregado.md) · [0035](./0035-norma-de-migration-e-proibicao-de-odku.md) · [0036](./0036-onde-a-documentacao-deve-viver.md)
- **Total de perguntas em aberto:** **59**

As demais 23 estão `decided` (19), `deferred` (3, com gatilho declarado) ou `superseded` (1) — nenhuma
espera resposta de alguém. Ver [`INDEX.md`](./INDEX.md).

<!-- END:generated -->

---

## Visão geral

| Inquiry | Estado | Aguardando | Bloqueia | # |
| :--- | :--- | :--- | :--- | ---: |
| [0011](#inquiry-0011--auditoria-fiscal-cross-período) | `blocked` | Banca interna (squad) | Schema de `core.fin_documentos` no marco M3; promoção do [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) a `Accepted` | 7 |
| [0012](#inquiry-0012--bff-api-gateway-managed-vs-fastify) | `blocked` | Banca + DevOps (Codebit) + dono do legado | Ponto de entrada HTTP; ADR-0018 candidato; possível supersede do [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md) | 7 |
| [0014](#inquiry-0014--schema-legado-vs-modelo-alvo) | `blocked` | Banca interna + P.O. | Migração do Financial Core; revisão do ADR-0017; BC ausente de Planejamento Orçamentário | 9 |
| [0015](#inquiry-0015--charsetcollate-por-tabela-no-drizzle) | `blocked` | **Upstream** (`drizzle-team/drizzle-orm`) | Nada agora — mantém dívida de edição manual em toda migration nova | 3 |
| [0019](#inquiry-0019--tripwire-de-hard-delete) | `blocked` | P.O. + decisão de infra/segurança | Gap #5 do relatório de cobertura; acoplada a RBAC e à [0018](./0018-auditlog-transversal-todos-bcs.md) (`deferred`) | 4 |
| [0026](#inquiry-0026--assíncrono-human-in-the-loop-drizzle-10-e-bruno--ts) | `open` | Gatilho declarado — só (c) é medível hoje | Épico de aprovação por e-mail; major do ORM; possível supersede do ADR-0038 | 4 |
| [0027](#inquiry-0027--teses-órfãs-de-branches-contaminadas) | `open` | Dono do repo — escolher o que vira trabalho | Descarte das 7 branches; 2 ADRs novos; ticket de auto-expire | 6 |
| [0028](#inquiry-0028--o-edd-da-po-m1m4--relatórios-nibo) | `open` | P.O./consultoria + spikes do TL | Escopo comercial (~470h dev + ~350h do bundle P0); M1 e M4 | 7 |
| [0030](#inquiry-0030--o-dead-mans-switch-que-nunca-vigiou) | `open` | Ninguém — falta desenho, não decisão | Supersede do [ADR-0042](../architecture/adr/0042-deadman-switch-redundant.md); detecção de job morto segue descoberta | 2 |
| [0031](#inquiry-0031--deadlock-na-reserva-atômica-de-remessa) | `open` | **Nada — o gatilho de fechamento está cumprido.** Falta decidir se vira `decided` | PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814); a proteção contra dupla emissão da [#789](https://github.com/ERP-Bem-Comum/core-api/issues/789) não entra em produção; piloto VAN (#756) | 0 |
| [0032](#inquiry-0032--título-remetido-pertence-ao-documento) | `open` | P.O. — a forma da recusa na tela; as 4 saídas já estão decididas | ADR novo sobre a fronteira `Document`↔`Payable`; a Fatia B do ajuste de nota, cuja decisão de base era esperar o merge do PR [#814](https://github.com/ERP-Bem-Comum/core-api/pull/814) — premissa vencida, ele já está integrado; a `.claude/rules/domain.md`, que passa a mentir sobre o código assim que a S1 entrar | 4 |
| [0035](#inquiry-0035--duas-normas-que-a-medição-contradiz) | `open` | Dono do repo — as duas saídas mexem em norma, não em código | Anti-padrão nº 4 do `CLAUDE.md`; §"Padrão de upsert" do [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — nenhuma bloqueia código hoje | 4 |
| [0036](#inquiry-0036--onde-a-documentação-deve-viver) | `open` | Dono do repo + o MCP `acdg-skills` de volta ao ar, para inventariar o que já indexa | Nada de código — decide o layout do repositório: 1.442 arquivos (84 % do volume) e 707 citações do harness | 2 |

---

## Inquiry-0011 — Auditoria fiscal cross-período

> **Origem:** [`0011-auditoria-fiscal-cross-periodo.md`](./0011-auditoria-fiscal-cross-periodo.md) §7 e Apêndice D.5
> **Aberta em:** 2026-05-07 · **Destinatário:** banca interna de arquitetura
> **Por que importa:** a chave de correlação entre o legado e `core.fin_documentos` precisa existir **antes**
> do schema do marco M3 — adicionar coluna depois custa migration; adicionar hoje custa uma linha.
> **Hipótese de trabalho do autor:** **D agora, B como solução-alvo no gatilho.**

⚠️ **Ler §7 → Apêndice D → Apêndice A nessa ordem.** O Apêndice D (2026-05-14) mudou a base empírica de
7.3 e 7.5: o schema real do legado **não tem campos de NFe** (chave de 44 dígitos, número, série, modelo).

- [ ] **7.1.** Existe padrão estabelecido na literatura para "auditoria cross-período sob Strangler Fig", ou cada equipe inventa do zero? Newman trata Reporting Database (p. 115) mas não o caso cross-temporal de migração.
- [ ] **7.2.** Reporting Database (Newman) vs. Read Model CQRS (Vernon) é diferença real ou superficial no nosso caso? Em ambos projetamos via worker, o consumidor é externo ao domínio e o schema é versionado — a diferença está só em **onde o database vive**, ou há propriedade arquitetural mais profunda?
- [ ] **7.3.** A chave `cnpj_emitente + numero_documento_original` tem armadilhas (CNPJ reorganizado, numeração reiniciada, série fiscal)? _Parcialmente vazia após o Apêndice D — esses campos não existem no legado._ Reconhecida em §C.9 como **fora do corpus técnico** (validar com contabilidade).
- [ ] **7.4.** Sob Hipótese C, qual a recomendação para o **bootstrap dos dados pré-existentes** — ETL one-shot, eventos sintéticos no `legacy.outbox`, ou projeção lendo direto do legado? Os trade-offs estão documentados ou cada equipe escolhe ad hoc?
- [ ] **7.5.** Latência aceitável de Read Model para reporting fiscal — lag de minutos vs. segundos vs. imediato diante de um auditor. Também **fora do corpus técnico** (§C.9).
- [ ] **7.6.** **Pergunta principal.** A recomendação da banca é **A**, **B**, **C**, **D** ou híbrido? Em que sequência temporal?
- [ ] **7.7.** _(nova, Apêndice D.5)_ Dada a ausência de campos fiscais no legado, a **Hipótese D refinada** (`id_legado + tipo + createdAt` como tripla simbólica, legado preservado read-only) continua sendo a recomendação — ou o achado desloca a deliberação para C ou B?

> 📎 **Se a banca confirmar a D refinada:** revisar o [ADR-0017](../architecture/adr/0017-correlation-keys-cross-period-audit.md) para "chaves simbólicas" e ajustar as 3 colunas; documentar a política de "legado read-only frozen" em [`../architecture/01-migration-strategy.md`](../architecture/01-migration-strategy.md) §6; registrar no [`../CHANGELOG.md`](../CHANGELOG.md).

---

## Inquiry-0012 — BFF: API Gateway managed vs. Fastify

> **Origem:** [`0012-bff-managed-api-gateway-vs-fastify.md`](./0012-bff-managed-api-gateway-vs-fastify.md) §6 e §9.7
> **Aberta em:** 2026-05-07 · **Última atualização:** 2026-05-22 · **Destinatário:** banca + DevOps + dono do legado
> **Por que importa:** define a fronteira de entrada e pode `supersede` o [ADR-0005](../architecture/adr/0005-thin-bff-gateway.md).

ℹ️ **O [ADR-0021](../architecture/adr/0021-aws-primary-magalu-pbe-supersedes-0007.md) fechou a premissa cross-cloud** (AWS-único em produção + MagaluCloud como PBE interno). Isso **resolveu a pergunta 4** e tornou o §4.2 superseded — mas, por §9.6, **não mexe** no argumento de design: a escolha A/B/C continua canônica pela fundamentação Newman do §3.

- [ ] **Decisão central.** Hipótese **A** (API Gateway managed substitui o BFF Fastify), **B** (API Gateway na frente do BFF) ou **C** (API Gateway + ALB direto)? O autor inclina para A; o diagrama do DevOps já a adota **de fato**, sem ADR formal.
- [ ] **6.1. Quem aceita a mudança no legado?** Adicionar `setGlobalPrefix('api/v1')` no `main.ts` é **uma linha** — confirmado pela análise do schema (TypeORM 0.3 + NestJS) —, mas contradiz o "não editar" do legado. Exige OK do dono e janela coordenada com o frontend (`NEXT_PUBLIC_API_URL` é build-time).
- [ ] **6.2. Qual autenticação no API Gateway?** Lambda authorizer validando JWT, Cognito, ou mTLS interno? Pode caber em ADR próprio ou no ADR-0018.
- [ ] **6.3. Como o Gateway termina no `core-api`?** IP público vs. **VPC Link** (→ NLB privado → subnet privada, sem IP público). A boa prática AWS é a segunda. Confirmar com DevOps.
- [x] ~~**6.4. Conectividade cross-cloud até o legado no GCP?**~~ **Resolvida em 2026-05-22** — não aplicável. Produção é single-cloud; legado e `core-api` no mesmo VPC, comunicação por security group.
- [ ] **6.5. Custo por requisição** (≈ US$ 3,50/milhão REST + transferência). Desprezível para volume ERP típico, mas validar com a Codebit contra estimativa de tráfego.
- [ ] **9.7-4.** _(novo)_ Ponto de entrada do **PBE MagaluCloud**: MGC-i, MGC-ii ou MGC-iii (§9.4)? Pode virar inquiry separada ou apêndice do ADR-0018.
- [ ] **9.7-5.** _(novo)_ Ratificar o reaproveitamento de `fake-stcpclt` + `fake-bradesco` (originais da [0013](./0013-local-dev-simulator-and-ci.md)) dentro do PBE MagaluCloud.

> 📎 **Se a banca aprovar a Hipótese A:** abrir o ADR-0018 candidato (`Proposed`); marcar o ADR-0005 como `Superseded`; reescrever [`../architecture/02-system-topology.md`](../architecture/02-system-topology.md) §3 e §5 com o runtime real; registrar no [`../CHANGELOG.md`](../CHANGELOG.md).

---

## Inquiry-0014 — Schema legado vs. modelo alvo

> **Origem:** [`0014-schema-legado-vs-modelo-alvo.md`](./0014-schema-legado-vs-modelo-alvo.md) §3
> **Aberta em:** 2026-05-14 · **Destinatário:** banca interna + P.O.
> **Por que importa:** o mapeamento das 32 tabelas do dump real revelou que o legado **não modela documento
> fiscal** — só "fluxo financeiro de obrigações". Isso muda a base empírica do ADR-0017 e abre um BC ausente.

⚠️ **O "documento mestre" que esta inquiry cita (`domain/10-mapeamento-legado-schema.md`) não existe mais no
disco** — o diretório `handbook/domain/` virou [`../domain_questions/`](../domain_questions/) e esse arquivo
não migrou. Quem retomar a inquiry precisa reconstruir o mapeamento a partir do dump ou localizar o arquivo.

### Q1 — Chave de correlação cross-período _(impacta ADR-0017 e a [0011](#inquiry-0011--auditoria-fiscal-cross-período))_

Das 3 colunas que o ADR-0017 propõe, apenas **`id_legado`** é preservável a partir do legado real.

- [ ] **Q1.1.** A chave deve ser repensada como **surrogate id + business event timestamp** (`id_legado + createdAt`), em vez de chave fiscal natural?
- [ ] **Q1.2.** O ADR-0017 precisa ser revisado/superseded, ou basta atualizar a justificativa?
- [ ] **Q1.3.** A auditoria cross-período passa a depender de **manter o legado vivo e read-only indefinidamente**? Isso muda o desenho do Strangler Fig.

### Q2 — `categorization` e o BC ausente de Planejamento Orçamentário

A tabela `categorization` tem 10 FKs e é o **hub analítico do legado** — é onde as regras de rateio orçamentário estão implícitas. O modelo alvo não tem equivalente.

- [ ] **Q2.1.** Existe um **BC "Planejamento Orçamentário"** que deveria estar no handbook e foi omitido? _(Confrontar com [`../domain_questions/financeiro/02-context-map.md`](../domain_questions/financeiro/02-context-map.md).)_
- [ ] **Q2.2.** Ou é funcionalidade transversal a ser descontinuada/repensada (orçamento vivendo em `budget_plans` ligado a `programs`, categorização virando evento derivado)?
- [ ] **Q2.3.** Sem decidir Q2, **não é possível migrar o Financial Core** — `payables` e `receivables` perdem sentido analítico sem a categorização.

### Q3 — `contracts` legado → "Contrato Mãe + Aditivos"

O legado representa hierarquia por `parentId` (self-FK), sem tabela de aditivo, sem status de homologação, sem histórico de mudança com causa.

- [ ] **Q3.1.** Bootstrap one-shot criando 1 Contrato Mãe + N aditivos sintéticos "homologados" a partir do snapshot?
- [ ] **Q3.2.** Ou legado vivo para contratos anteriores ao corte, modelo novo só pós-go-live? _(Mais aderente ao Strangler Fig, mas exige UI que apresente ambos.)_

### Q4 — Primeiro vertical slice

- [ ] **Q4.1.** A banca confirma **Identity & Access** (`users` + `collaborators`, ~5 tabelas folha do grafo) como primeiro slice, ou prefere começar pela **Integração Bancária** (Bradesco/CNAB)?

---

## Inquiry-0015 — Charset/collate por tabela no Drizzle

> **Origem:** [`0015-charset-drizzle-roadmap.md`](./0015-charset-drizzle-roadmap.md) §2 e §6
> **Aberta em:** 2026-05-18 · **Destinatário:** roadmap upstream do `drizzle-orm` — **não há interlocutor interno**
> **Por que importa:** MySQL 8.4 rejeita FK quando a collation diverge. Hoje o `CHARSET`/`COLLATE` de tabela
> é SQL manual editado após cada `drizzle-kit generate` — disciplina humana como único gate.

✅ **A pergunta 2 (collate por coluna) fechou em 2026-08-05 pelo #636**, sem esperar upstream: `customType` com
`dataType()` devolvendo o tipo verbatim resolve, e os 7 tipos nomeados em `src/shared/persistence/identifier-columns.ts`
cobrem as 119 colunas binárias dos 6 módulos. `db:generate` responde `No schema changes`.

- [ ] **P1.** O `drizzle-orm` tem **charset/collate table-level** no roadmap? Em qual versão? Há issue/PR aberta? _(É esta pergunta que mantém a inquiry aberta.)_
- [ ] **P3.** Quando o suporte chegar, o `drizzle-kit generate` passa a **emitir** `ENGINE=InnoDB DEFAULT CHARSET=…`, ou segue produzindo `CREATE TABLE` sem table options?
- [ ] **P4.** Existe helper community-driven que já faça isso hoje, aceitável até o suporte nativo?

> 📎 **Ação de vigília (sem interlocutor):** revisar a cada bump de minor do `drizzle-orm`, e varrer issues/PRs
> em `drizzle-team/drizzle-orm` por `mysql collate` / `charset table`. Quando a primeira migration `0001_*.sql`
> for emitida, estender `CA-15`/`CA-16` para varrer **todas** as migrations — é o sinal de que a dívida cresceu.
> A [0026](#inquiry-0026--assíncrono-human-in-the-loop-drizzle-10-e-bruno--ts) já pergunta se o 1.0 resolve isso.

---

## Inquiry-0019 — Tripwire de hard-delete

> **Origem:** [`0019-hard-delete-tripwire-sem-superficie.md`](./0019-hard-delete-tripwire-sem-superficie.md) §2 e §6
> **Aberta em:** 2026-05-25 · **Destinatário:** P.O. + decisão de infra/segurança
> **Por que importa:** o gap #5 pede o evento `TentativaDeExclusaoDetectada`, mas a inspeção de `src/` não
> encontrou **nenhuma superfície de exclusão física** — a exclusão é 100% lógica e o port não tem método destrutivo.

- [ ] **1.** O que constitui uma "tentativa de exclusão física" num sistema sem hard-delete?
- [ ] **2.** Onde a violação seria **detectada** — app (port tripwire), banco (trigger é proibido pelo ADR-0020) ou infra/DBA fora do processo?
- [ ] **3.** Para onde vai o alerta? Não há canal SIEM, e o outbox ([ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md)) entrega a outros **módulos**, não a Segurança.
- [ ] **4.** Faz sentido construir o detector antes de existirem a superfície e o ator autenticado (o "Quem" da violação)?

> **Recomendação interna já registrada (não é decisão):** não implementar como evento de domínio. A política
> "documento nunca é apagado fisicamente" é melhor **prevenida** por _least privilege_ no MySQL (`REVOKE DELETE`
> do app user) do que **detectada** por evento — o que a move para o audit log do banco, junto da
> [0018](./0018-auditlog-transversal-todos-bcs.md), e a torna decisão de infra, não ticket de código de módulo.

---

## Inquiry-0026 — Assíncrono human-in-the-loop, Drizzle 1.0 e Bruno × TS

> **Origem:** [`0026-async-human-in-the-loop-and-drizzle-1-0.md`](./0026-async-human-in-the-loop-and-drizzle-1-0.md) §2 e §3
> **Aberta em:** 2026-08-05 · **Destinatário:** investigação interna medida — sem consulta externa
> **Por que importa:** o [ADR-0058](../architecture/adr/0058-runtime-tracks-recommended-lts.md) §3 exige que troca
> estrutural seja justificada por inquiry que **meça**, não que argumente. Esta é o instrumento que ele nomeia.

- [ ] **1.** O outbox + polling atual sustenta um fluxo **human-in-the-loop** (solicitação → e-mail → callback externo → transição de estado), ou o desenho pede fila/workflow engine? _Falta medir: latência do `runLoop`; se o callback é entrada HTTP comum e já cabe; retry e dead-letter; agendamento futuro ("reenviar em 3 dias"); coordenação multi-instância do worker de outbox._
- [ ] **2.** Quais limitações do outbox são reais **neste** volume e quais são teóricas?
- [ ] **3.** O `drizzle-orm@1.0.0` muda alguma premissa de (1), e o que custa em 8 módulos? **Medido em 2026-09-01 — 3 dos 4 itens fechados:** o custo **não** é "8 módulos"; **6 dos 7 breaking changes obrigatórios são inertes** aqui, `relations-v2` não obriga reescrever **nada** (o repo nunca adotou o RQB v1 — zero `relations()`/`db.query.*`), e o `drizzle-kit` **não tem `1.0`**, o que torna o major inexecutável hoje. O que resta é o formato v3 da pasta de migração — 123 `.sql`, 123 snapshots, 7 journals já aplicados em produção. _Falta medir: se collation ganhou suporte de primeira classe (aposentando o `customType`), que cruza com a [0015](./0015-charset-drizzle-roadmap.md)._
- [ ] **4.** Os 242 `.bru` cobrem algo que os 179 `inject` não cobrem, ou são camada duplicada com supply-chain próprio? _Falta medir: quanto é duplicata; o que só o servidor real pega (rede, CORS, helmet, rate-limit); o que se perde sem o app do Bruno; se as 2 exceções de supply-chain saem junto; o custo dos 17 ponteiros históricos._

**Gatilhos declarados — o que destrava cada uma:**

| Troca | Gatilho | Medível hoje? |
| :--- | :--- | :--- |
| (a) assíncrono | o épico de aprovação entrar no roadmap | não — seria especular sobre requisito inexistente |
| (b) Drizzle 1.0 | **duplo (refinado em 2026-09-01):** `drizzle-orm@1.0.0` **e** `drizzle-kit@1.x` ambos em `latest`, ambos cumprida a quarentena de 24h (`minimumReleaseAge`) | não — `drizzle-orm` em `1.0.0-rc.5` (2026-08-12) e **`drizzle-kit` sem `1.0`**; sem o kit, o formato v3 de migração não existe |
| (c) Bruno × TS | nenhum evento externo | **sim, e barato** — cruzar as rotas dos 242 `.bru` com as dos 179 `inject` responde em uma sessão |

⚠️ **A armadilha que (c) precisa evitar:** o ADR-0038 nasceu de 24 de 26 falhas serem `.bru` desalinhados com o
servidor, porque a coleção não tinha runner e apodreceu sem ninguém ver. Trocar Bruno por TS resolve isso **se e
somente se as coleções morrerem junto** — se sobreviverem como documentação, o problema volta com os papéis invertidos.

---

## Inquiry-0027 — Teses órfãs de branches contaminadas

> **Origem:** [`0027-teses-orfas-de-branches-contaminadas.md`](./0027-teses-orfas-de-branches-contaminadas.md) §6 e §8
> **Aberta em:** 2026-08-06 · **Destinatário:** dono do repo
> **Por que importa:** 7 branches carregam commits ausentes da `dev` e **nenhuma é mergeável** — o problema não é
> conflito de linha, é **colisão de identidade** (a `dev` reaproveitou os números ADR-0033/0034/0035/0047).
> A inquiry preserva as teses; o que falta é decidir quais viram trabalho novo contra o código atual.

**Bloqueador para fechar:** escolher quais das quatro teses **não testadas** viram trabalho, e em que ordem.
Nada aqui envolve tocar as branches.

- [ ] **I1.** Refazer as medições de T6a com corte em 2026-08-06 — se a razão `fix:feat` caiu após o trabalho de harness (specs 038–040), a intervenção funcionou; se subiu, a causa-raiz é outra. **Fazer primeiro: é barata e informa o resto.**
- [ ] **I3.** Abrir ADR novo (número livre) para **imagem-base glibc** — tira o racional de T5a do comentário e o põe onde se cita.
- [ ] **I4.** Ratificar ou refutar o **discriminador "exibe vs. consulta"** de T3, e investigar a anomalia `fin_document_timeline`.
- [ ] **I5.** Abrir ticket de **auto-expire de contratos** (T4a) — lacuna funcional com caso reproduzível (CT 0776/2026).
- [ ] **I6.** Decidir o destino da **#131** à luz da spec de T1 — a spec é reaproveitável como _texto_, não como código.
- [ ] **Descarte.** Decidir se as 7 branches podem ser deletadas depois que esta inquiry absorver o conteúdo.

> _(I2 — versionar a topologia real do QA — e I7 — remover os hooks de T2 — constam do programa mas não das
> saídas da inquiry; ver §6 para o quadro completo.)_

---

## Inquiry-0028 — O EDD da P.O. (M1–M4 + relatórios Nibo)

> **Origem:** [`0028-edd-da-po-melhorias-m1-m4-e-relatorios-nibo.md`](./0028-edd-da-po-melhorias-m1-m4-e-relatorios-nibo.md) §6 e §7
> **Aberta em:** 2026-08-06 · **Destinatário:** P.O./consultora Alessandra + spikes do TL
> **Por que importa:** trava ~470h de escopo comercial (M1–M4 + ~350h do bundle P0).

✅ **A suspeita que abriu a inquiry não se confirmou.** As 13 alegações com citação de arquivo/linha **conferem
todas** com o HEAD — o EDD descreve o código atual com precisão de linha. A recomendação é **aceitar a camada
verificada e descartar a §0** (herdada do `AGENTS.md`, aposentado em 2026-08-03), em vez de aceitar ou rejeitar
em bloco. O que trava escopo são as decisões abaixo, não o documento.

- [ ] **D1.** Escopo real da **M2** — o override já existe e foi confirmado; falta **medir o que sobra**. _(TL)_
- [ ] **D2.** **V-Expenses**: API, webhook ou arquivo? _Intocada — **bloqueia a M4 inteira**._ _(spike + cliente)_
- [ ] **D3.** Fallback do regime de **Competência** quando `competencia` é nula. _(P.O.)_
- [ ] **D4.** Mapa de **reclassificação contábil** das categorias. _(P.O./consultoria)_
- [ ] **D5.** **Portador**: referência a colaborador/parceiro ou cadastro próprio? _Gap confirmado real._ _(TL)_
- [ ] **D6.** Spike de **segurança do magic-link** (M1). _(TL)_
- [ ] **D7.** _(acrescentada pela verificação)_ Reavaliar a §5.2 à luz do precedente `ReconciliationAllocation` (#141/#247) **antes** de travar as 40h da fundação — a estimativa está superestimada.

**Ainda pendentes, fora das decisões:** devolver à P.O. que a §0 está desatualizada (pedindo que futuras versões
separem camada verificada de camada herdada) e decidir se as 4 melhorias viram issues `enhancement · P0`.

> ⚠️ **D3 e D4 bloqueiam os dois relatórios Nibo. D2 e D6 são spikes que precisam acontecer antes de travar orçamento.**

---

## Inquiry-0030 — O dead-man's switch que nunca vigiou

> **Origem:** [`0030-deadman-switch-nunca-vigiou.md`](./0030-deadman-switch-nunca-vigiou.md) §5 e §7
> **Aberta em:** 2026-08-17 · **Destinatário:** ninguém — não espera resposta de terceiro, espera **desenho**
> **Por que importa:** o mecanismo do ADR-0042 foi construído inteiro (emissor Go com HMAC, dois planos de
> ingestão, dois workflows, contratos de dados) e **nunca recebeu um único ping** — `deadman/history.jsonl`
> ficou em 0 linhas do início ao fim, porque o emissor jamais foi implantado. O auditor rodou 23 vezes e
> escreveu 22 vereditos, todos em bootstrap. Em 2026-07-24 parou até de rodar, quando a proteção da `main`
> passou a recusar o `git push` do keep-alive — e ficou **24 dias vermelho sem ninguém notar**, porque o
> único canal por onde ele se manifestava era justamente esse push. Código removido em 2026-08-17.

**Bloqueador para fechar:** não há pergunta a responder nem terceiro a consultar — falta **desenhar a
substituição**. O ADR-0042 segue `Accepted` e **não superado**: não decidimos parar de detectar job morto,
decidimos parar de manter um mecanismo que nunca detectou. O ponto cego fica descoberto até lá.

- [ ] **D1.** Desenhar a substituição atendendo aos cinco requisitos da §5 — com destaque para os dois que
      mataram a tentativa anterior: **o vigia precisa de quem o vigie** (silêncio não pode ser
      indistinguível de "tudo bem") e **custo de operação compatível com o valor** (o desenho antigo pedia
      emissor compilado, deploy próprio, Object Storage e dois workflows para vigiar **um** job — foi caro
      demais para ser terminado). Vira ADR novo com `supersedes: [ADR-0042]`, e esta inquiry fecha nele.
- [ ] **D2.** Decidir o destino das issues abertas do épico #67 que descrevem o mecanismo removido
      (#70, #71, #72 e a #368 dos 14 falsos positivos).

> _(A §5 da inquiry pede explicitamente para reabrir a rejeição de SaaS de heartbeat: o ADR-0042 a
> descartou pesando controle, custo e privacidade contra um custo de construção que se assumiu pagável — e
> que, medido agora, nunca foi pago.)_

---

## Inquiry-0031 — Deadlock na reserva atômica de remessa

> **Origem:** [`0031-deadlock-na-reserva-atomica-de-remessa.md`](./0031-deadlock-na-reserva-atomica-de-remessa.md) §4 e §6
> **Aberta em:** 2026-08-21 · **Destinatário:** Gabriel — não espera resposta de terceiro, espera **escolha** entre quatro alternativas já medidas
> **Por que importa:** a reserva do PR #814 fecha a janela TOCTOU da #789 (mesmo título em duas remessas =
> pagamento em dobro), mas duas emissões concorrentes entram em **deadlock 1213** — medido em **20/20
> rodadas** contra MySQL 8.4.11 real. A causa é o `SELECT … FROM fin_remittances WHERE id = ? FOR UPDATE`
> do ramo de criação, que busca uma linha **inexistente** e por isso trava o **vão** (gap lock) em vez do
> registro; o `INSERT` da concorrente precisa de _insert-intention_, que conflita com esse vão. O código do
> gap lock é **pré-existente** — o PR só alongou a espera entre pegá-lo e chegar ao INSERT. Comportamento é
> **fail-safe** (nenhuma gravação dupla em 35 rodadas), mas o operador recebe "banco indisponível" em vez de
> "o título já está em outra remessa", e emissão legítima morre por ruído de concorrência.

**Bloqueador para fechar: nenhum.** O gatilho declarado no cabeçalho da inquiry era *"existir decisão
sobre qual das quatro alternativas adotar, com o efeito colateral do braço escolhido medido"* — e as duas
partes estão cumpridas desde 24/08: braço **A** decidido e aplicado, verificado com contrafactual (40
rodadas, 0 deadlocks), efeito colateral medido no ramo de update (sem ciclo novo; custo só de cauda) e a
rota contra o hard replace refutada. **Todas as caixas fechadas.**

⚠️ **Uma inquiry `open` com zero perguntas é uma contradição a resolver, não um estado.** O que falta é a
decisão editorial de promovê-la a `decided` — e as duas lacunas que restam pertencem a outros lugares: o
`delete()` com `CASCADE` (não medido, rota distinta) e a classificação do `1451`, que já é a `S3` da
[0032](#inquiry-0032--título-remetido-pertence-ao-documento).

- [x] **D1.** ~~Escolher entre as quatro alternativas da §4.3~~ — **braço A** (inverter a ordem de
      aquisição), decidido e aplicado em 2026-08-23 na branch `chore/integra-frentes-abertas`: o
      `FOR UPDATE` sobre `fin_payables` subiu para o topo da transação do `save`, antes da busca em
      `fin_remittances`. **Verificado em 2026-08-24** contra MySQL 8.4.11 real: 40 rodadas, **0
      deadlocks**, 40/40 perdedoras com o erro de negócio — e o contrafactual (só a ordem desfeita)
      deadlockando no mesmo instrumento, que é o que autoriza ler o zero como correção.
- [x] **D2.** ~~Medir o efeito colateral do braço (A)/(B)~~ — **medido em 2026-08-24**. O ramo de
      **update** travando `fin_payables` não cria deadlock novo, não gera lock-wait e não bloqueia o
      INSERT de um título novo (20/20 passaram). O custo é de **cauda**: mediana igual (119ms vs
      103ms), pior caso ~3× (428ms vs 140ms) — com N=20, ordem de grandeza, não número fino. A razão
      é o modo do lock: `X,REC_NOT_GAP` sobre os registros pedidos, sem gap com que a
      insert-intention da concorrente pudesse conflitar.
- [x] **D5.** ~~Medir o `save` de update × hard replace do documento~~ — **medido em 24/08 e
      REFUTADO**. 0 deadlocks em 20 rodadas, controle positivo em 6/6 na mesma bancada, e o
      contrafactual `pre` (sem lock algum em `fin_payables` no update) dando resultado idêntico: o
      braço A não mudou nada neste caminho. O ramo de update só faz `UPDATE fin_remittances` e nunca
      insere em `fin_remittance_payables`, logo nunca pede lock em `fin_documents` — sem essa aresta
      não há ciclo. **O ciclo é privativo do ramo de criação**, e o efeito colateral do braço A está
      medido até o fim.
- [x] **D3.** ~~Reforçar o teste `a emissão que perde a corrida não deixa rastro algum`~~ — a cegueira
      foi **confirmada** (verde em 8 de 8 rodadas com deadlock acontecendo), mas o remédio já existia:
      o irmão `duas emissões do mesmo título: exatamente uma grava, a outra perde com nome próprio`
      exige o erro nominal e ficou **vermelho nas mesmas 8**. Em vez de teste novo, os dois ganharam
      a anotação de que **não são duplicata** — um fixa atomicidade, o outro fixa o desfecho.
- [x] **D4.** ~~Corrigir as duas afirmações falsas no comentário de `remittance-repository.drizzle.ts`~~ —
      **feito em 2026-08-23**, na branch `chore/integra-frentes-abertas`. O comentário agora diz que a
      citação do Refman §17.7.3 só vale porque **aqui** o registro é encontrado, atribui o deadlock ao gap
      do passo 1 (id inexistente) e troca a promessa sobre o plano de execução pelo que foi medido:
      `fin_payables_status_idx`, `supremum + 3 registros` com next-key.

> _(As duas afirmações erradas citavam o Refman **corretamente**. O erro foi aplicar a passagem certa ao
> ramo errado — e ambas foram "verificadas" por leitura, nunca por medição. Ver §3.6 e §3.8.)_

---

## Inquiry-0032 — Título remetido pertence ao documento?

> **Origem:** [`0032-titulo-remetido-fronteira-do-agregado.md`](./0032-titulo-remetido-fronteira-do-agregado.md) §5 e §6
> **Aberta em:** 2026-08-23 · **Destinatário:** P.O. (decisão de produto, pendente) e Gabriel (execução das saídas decididas)
> **Por que importa:** um título já enviado ao banco não pode ser apagado por um `save` do documento — e a
> recusa precisa **dizer ao operador o quê e por quê**, não devolver erro genérico. A decisão de produto
> registrada é parcial ("deixe explicado no ERRO que lançarmos que é recusa e por quê; no front a P.O.
> poderá nos corrigir"), e a segunda pergunta — o que o operador deveria ver ao corrigir uma nota cujo
> título já foi remetido — segue sem resposta da P.O.

**Bloqueador para fechar:** as quatro saídas abaixo já estão **decididas** e esperam execução, não decisão.
O que ainda espera terceiro é a forma da recusa na tela. A decisão de base de 23/08 — a Fatia B esperar o
merge do PR #814, para não resolver conflito à mão na região onde a ordem dos locks se decide — **deixa de
valer nesta branch**, onde o #814 já está integrado.

- [ ] **S1.** Converter `DocumentError` inteiro para tagged error (invariante carrega evidência; validação
      simples fica nulária). Custo medido: **4** comparações por string — `generate-remittance.ts:85` e
      `bulk-update-due-date.ts:38,39,40`. ⚠️ Não converter pontualmente: string e objeto na mesma union
      forçam `typeof e === 'string'` em todo consumidor e quebram o exhaustive switch.
- [ ] **S2.** Atualizar `.claude/rules/domain.md` — ela prescreve string literal union e passaria a mentir
      sobre o código. Não é ADR, pode ser atualizada; mas deliberadamente, não como efeito colateral.
- [ ] **S3.** Classificar `1451` em `driver-error.ts` — o destino é o erro de recusa **com payload**, não um
      503 genérico. **Medido em 24/08:** chamando o repositório direto, o hard replace de documento com
      título em remessa viva falha `1451` **10 de 10 sem concorrência alguma** — é estado, não corrida.
      `driver-error.ts` declara `1213` e `1062`, não `1451` (conferido). ⚠️ O caminho HTTP **está
      guardado** (`adjust-document.ts:246` consulta e o domínio recusa com nome próprio), então o que
      resta é a janela entre a guarda, que roda FORA da transação, e o `DELETE`: se uma remessa nascer
      sobre aquele título nesse intervalo, o operador recebe `document-repository-failure` genérico
      existindo uma recusa nomeada a dois passos. **Severidade: média, latente — perde-se a mensagem,
      nunca o dado.**
- [ ] **S4.** `withDeadlockRetry` no `remittance-repository` — rede, não correção. ⚠️ A política atual é
      `maxAttempts: 3` **sem jitter**: duas transações que colidiram no mesmo instante voltam juntas.

---

## O que bloqueia o quê

```
0014 Q1 ──(muda a premissa)──► 0011 ──► ADR-0017 Accepted ──► schema core.fin_documentos (M3)
0014 Q2 ─────────────────────────────────────────────────► migração do Financial Core
0012 A/B/C ──► ADR-0018 (Proposed) ──► ADR-0005 Superseded ──► reescrita 02-system-topology §3/§5
0019 ──(espera)──► RBAC/identidade + canal SIEM ──► junto da 0018 (deferred)
0028 D2/D6 ──(spike)──► orçamento de M1 e M4      0028 D3/D4 ──► os dois relatórios Nibo
0026 (a),(b) ──(gatilho)──► nada hoje             0026 (c) ──► medível agora, decide o ADR-0038
0027 I1 ──(barata, informa o resto)──► reordena o próprio programa I3–I6
0015 ──► upstream drizzle-orm — sem interlocutor, só vigília
```

**Duas cadeias concentram o bloqueio real:** a fiscal (`0014 Q1 → 0011 → ADR-0017 → M3`) e a de borda
(`0012 → ADR-0018`). Ambas esperam a mesma banca interna há **3 meses**. As demais ou esperam terceiro externo
(0015, 0028) ou esperam um gatilho que ninguém precisa destravar (0026).

---

## Como atualizar este arquivo

1. O estado canônico é o `state:` do frontmatter da inquiry, validado por [`tests/cleanup/inquiry-hygiene.test.ts`](../../tests/cleanup/inquiry-hygiene.test.ts) contra o conjunto fechado `open · blocked · decided · deferred · superseded`. Este arquivo **segue** aquele campo, nunca o contradiz.
2. Inquiry que sai de `open`/`blocked` → remover o bloco daqui e atualizar a contagem do topo.
3. Inquiry que entra em `open`/`blocked` com perguntas pendentes → adicionar bloco referenciando a fonte.
4. Pergunta respondida antes do fechamento → marcar `[x]` e riscar o texto, preservando o registro de que existiu (ver 6.4 da [0012](#inquiry-0012--bff-api-gateway-managed-vs-fastify)).
5. Atualizar **Última atualização** no topo.

---

## Inquiry-0035 — Duas normas que a medição contradiz

> **Origem:** [`0035-norma-de-migration-e-proibicao-de-odku.md`](./0035-norma-de-migration-e-proibicao-de-odku.md) §2 e §5
> **Aberta em:** 2026-09-01 · **Destinatário:** dono do repo — as duas saídas mexem em norma escrita, não em código
> **Por que importa:** nenhuma das duas produz defeito hoje. O custo é o de toda norma ficcional — quem lê o
> absoluto, não encontra a exceção escrita, e ou obedece contra a técnica ou desvia sem declarar. As duas têm a
> mesma forma: uma solução real generalizada para "sempre", que a prática depois teve de contrariar por razão
> técnica legítima.

- [ ] **(a1)** Reescrever o anti-padrão nº 4 do `CLAUDE.md` — hoje _"escrever migration à mão"_ é anti-padrão, e **46 das 123 migrations (37,4 %) foram editadas à mão**, por quatro limitações medidas do gerador (ordem por dependência, `ENGINE`/`CHARSET` que o Drizzle não expõe, fusão de cláusulas para `INPLACE, LOCK=NONE`, backfill entre DDLs). A norma proposta: _"gerar sempre, editar quando necessário, e **declarar** a edição"_ — o padrão que a `contracts/0020_busy_doctor_spectrum.sql` já pratica em 15 linhas de comentário.
- [ ] **(a2)** Se (a1) for aceita: o gate que cobra a declaração (marca de edição ⇒ comentário) entra em `tests/cleanup/`, com allowlist que nasce cheia e esvazia por fatia? _39 das 46 já têm comentário — a distância é curta._
- [ ] **(b1)** A proibição global de `ON DUPLICATE KEY UPDATE` na camada de agregado se sustenta **por uniformidade de padrão**, mesmo sem o risco do manual? _Medido: **0 dos 47 call sites** reúnem a condição do Refman ("tables with multiple unique indexes"); 44 são sobre tabela só-PK._ Se sim, o motivo escrito em `document-repository.drizzle.ts:8-12` precisa ser corrigido — hoje ele cita o manual, e o manual não sustenta o absoluto.
- [ ] **(b2)** Se (b1) for não: ADR novo que `supersede` a §"Padrão de upsert" do [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md), declarando a condição real (tabela com ≥ 2 uniques colidíveis no mesmo caminho de escrita). _ADR aceito não se edita._

⚠️ **Correção de citação, independente da decisão:** o docblock de `document-repository.drizzle.ts` usa a numeração do Refman **8.0** — cita "§13.2.6.2" e "§15.7" (na 8.4: §15.2.7.2 e §17.7) e, em `:20`, "§15.7.2.4", que **na 8.4 é "SET RESOURCE GROUP Statement"**. O texto invocado sobrevive; a paráfrase é que omite a condição.

**O que NÃO se decide aqui:** o custo do substituto de ODKU em contenção — não medido, e exige banco com dado.

---

## Inquiry-0036 — Onde a documentação deve viver

> **Origem:** [`0036-onde-a-documentacao-deve-viver.md`](./0036-onde-a-documentacao-deve-viver.md) §4 e §5
> **Aberta em:** 2026-09-02 · **Destinatário:** dono do repo — move 84 % do volume documental e reescreve 707 citações do harness
> **Por que importa:** o critério que decide o destino de cada pasta não é "isso é documentação?", e sim **"algum
> agente precisa `grep`ar isso?"** — Discussions e Issues são invisíveis para busca local. `handbook/reference/` é o
> caso extremo dos dois lados: quase imóvel (6 commits em 90 dias) e o mais acoplado de todos (707 citações em
> `.claude/`). Tirá-lo limpa toda busca no repositório; tirá-lo errado cega 12 agentes de uma vez.

- [ ] **(a)** Destino do `handbook/reference/` — 1.061 arquivos, 30 MB. Repo separado + submodule (o `grep` sobrevive, o clone emagrece, custa reescrever 707 caminhos) **ou** migrar para o MCP `acdg-skills`? _Bloqueado: o servidor está fora do ar (`ENOTFOUND mcp-server.tailf5e6ca.ts.net`), e decidir sem inventariar o que ele já indexa é escolher no escuro._
- [ ] **(b)** Destino do `handbook/specs/` — 381 arquivos, 2 citações, 4 commits/90d. Provável mesmo caminho de (a), mas o acoplamento é 350× menor: pode sair antes, e sozinho.

**O que NÃO se decide aqui:** o que já foi executado em 02/09 — `context/` removido com lápide declarada, `decisions/` promovido a `handbook/decisions/`, e o datado/episódico destinado a Discussions.

---

> ⚠️ Este arquivo é mantido à mão e **nenhum gate o cobre** — a versão anterior ficou 3 meses divergindo do disco
> sem que nada acusasse. Ao mexer numa inquiry `open`/`blocked`, passe aqui no mesmo commit.

> 🔁 Índice executivo — a fonte de verdade continua sendo cada inquiry individual.
