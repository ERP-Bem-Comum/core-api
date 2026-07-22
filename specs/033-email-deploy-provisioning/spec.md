# Feature Specification: Provisionamento de envio de e-mail em deploy (homolog/prod)

**Feature Branch**: `033-email-deploy-provisioning`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Issue #135 — [notifications/infra] provisionar envio de e-mail em deploy — Umbler/SMTP + SPF/DKIM/DMARC + DB + migration + CI. Follow-up operacional da #117: o código do módulo notifications já suporta envio por env; falta a parte de deploy/infra para o envio real funcionar em homolog/prod. DoD: reset de senha envia e-mail real via provider em homolog; SPF+DKIM+DMARC verdes; worker rodando; secrets fora do repo."

> **Nota de atualização de premissas (2026-07-02):** a issue #135 foi escrita antes do ADR-0047
> (`handbook/architecture/adr/0047-transactional-email-via-producer-domain-event.md`) e antes de o
> envio entrar em produção. Desde então: (a) o outbox próprio do `notifications` foi **aposentado** —
> a migration `src/modules/notifications/adapters/persistence/migrations/mysql/0001_bouncy_maddog.sql`
> dropou as tabelas, logo os itens "`NOTIFICATIONS_DATABASE_URL` + migration `0000`" da issue estão
> **obsoletos**; o worker lê os outboxes dos produtores (`auth_outbox`, `par_email_outbox`) via
> `AUTH_DATABASE_URL`/`PARTNERS_DATABASE_URL`; (b) o script é `worker:email-dispatch`
> (não `worker:email`); (c) o `.env.example` consolidado **já existe** na raiz (item já entregue);
> (d) **produção já envia e-mail sem problema, via Amazon SES (SMTP)** — confirmado pelo usuário em
> 2026-07-02 (ver Clarifications), contradizendo a premissa da issue de que o worker nunca subiu em
> deploy. Esta spec cobre o que **resta**: envio real em homolog, auditoria/complemento do DNS de
> autenticação, auditoria e documentação da configuração real de produção, SMTP de teste no CI e
> validação formal de deliverability.

## Clarifications

### Session 2026-07-02

- Q: Qual provider de e-mail está de fato configurado em produção (onde o worker já funciona)? → A: Amazon SES via SMTP — a decisão "Umbler" registrada na issue #135 (2026-06-19) e no runbook 08 §2 está superada para produção e deve ser corrigida na documentação.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Envio real de e-mail em homolog (Priority: P1)

Um usuário do ERP em homolog solicita reset de senha e recebe o e-mail real na sua caixa de correio. Para isso, a operação provisiona uma credencial SMTP própria para homolog no mesmo provider já validado em produção (Amazon SES — credencial distinta por ambiente), configura os secrets de e-mail no ambiente de homolog (fora do repositório, conforme catálogo `handbook/infrastructure/03-secrets-catalog.md` §3.6) e sobe o worker de despacho de e-mail como processo dedicado, com reinício automático.

**Why this priority**: É o que resta do DoD da issue #135 ("reset de senha envia e-mail real via provider em homolog"): produção já envia, mas homolog não — e homolog é o campo de prova das features antes do go-live.

**Independent Test**: Em homolog, disparar o fluxo de reset de senha para uma conta de teste e verificar a chegada do e-mail numa caixa real controlada pela equipe. Não depende da auditoria de DNS (o domínio já entrega em produção) nem de CI.

**Acceptance Scenarios**:

1. **Given** credencial SMTP provisionada e secrets configurados em homolog, **When** o worker de despacho é iniciado, **Then** ele conecta ao provider sem erro de configuração e permanece em execução contínua.
2. **Given** o worker rodando em homolog, **When** um usuário solicita reset de senha, **Then** um e-mail real chega à caixa de destino em até 2 minutos.
3. **Given** o ambiente de homolog, **When** se inspeciona o repositório e o histórico git, **Then** nenhum valor de credencial de e-mail aparece em arquivo versionado.
4. **Given** o worker em execução, **When** o processo cai ou o host reinicia, **Then** o worker volta a rodar automaticamente sem intervenção manual.

---

### User Story 2 - Auditoria e complemento da autenticação de domínio (Priority: P2)

O responsável pela operação audita os registros DNS de autenticação de envio (SPF, DKIM, DMARC) do domínio remetente — que já entrega em produção, logo SPF/DKIM tendem a estar válidos via verificação de domínio no provider — completa o que faltar (tipicamente o registro DMARC) e valida formalmente a deliverability com avaliador externo.

**Why this priority**: A entrega em produção sugere autenticação funcional, mas ninguém validou formalmente as três verificações nem publicou DMARC; sem isso a reputação do domínio fica sem monitoramento e o DoD da issue ("SPF+DKIM+DMARC verdes") segue em aberto.

**Independent Test**: Consultar publicamente os registros DNS do domínio (SPF, DKIM, DMARC) e enviar um e-mail do ambiente com envio ativo para um serviço de avaliação de deliverability (ex.: mail-tester), conferindo o resultado das três verificações e a pontuação.

**Acceptance Scenarios**:

1. **Given** o domínio remetente, **When** se consulta o DNS público, **Then** existe registro SPF autorizando o provider de envio, registro DKIM publicado e registro DMARC (`_dmarc`) com política inicial de monitoramento (`p=none`); o que estiver ausente é publicado como parte desta história.
2. **Given** DNS auditado/completado e propagado, **When** um e-mail é enviado para um avaliador de deliverability, **Then** SPF, DKIM e DMARC constam como aprovados ("verdes") e a pontuação é ≥ 9/10.
3. **Given** DNS auditado/completado, **When** um e-mail de reset de senha é enviado a uma caixa de provedor comum (Gmail/Outlook), **Then** ele chega à caixa de entrada, não à pasta de spam.

---

### User Story 3 - Auditoria e documentação da configuração real de produção (Priority: P2)

O responsável pela operação mapeia e documenta como o envio de e-mail funciona hoje em produção — provider real (Amazon SES via SMTP), onde vivem os secrets, como o worker de despacho é executado e mantido vivo, limites/quota de envio — e corrige a documentação divergente (runbook 08 §2 e issue #135 apontam Umbler, a realidade é SES).

**Why this priority**: Produção funciona, mas o repositório não descreve como — nenhum manifesto de deploy do worker existe no repo e a decisão registrada aponta o provider errado. Sem essa auditoria, qualquer manutenção futura (ou o provisionamento de homolog do US1) parte de documentação enganosa.

**Independent Test**: Ler o runbook atualizado e conseguir responder, sem acesso privilegiado: qual provider, onde estão os secrets, como o worker roda e reinicia, qual a quota de envio — e conferir com um smoke de reset de senha em produção.

**Acceptance Scenarios**:

1. **Given** o envio funcionando em produção, **When** a auditoria termina, **Then** o runbook `handbook/infrastructure/08-email-delivery-runbook.md` documenta o provider real (SES via SMTP), a localização dos secrets, a forma de execução/reinício do worker e os limites de envio.
2. **Given** a divergência conhecida (docs dizem Umbler, produção usa SES), **When** a documentação é corrigida, **Then** nenhuma fonte do handbook/issue permanece afirmando Umbler como provider ativo de envio.
3. **Given** o ambiente de produção, **When** um reset de senha de conta de teste é solicitado, **Then** o e-mail chega à caixa real, autenticado (SPF/DKIM/DMARC aprovados) — smoke que comprova a premissa "funciona sem problema".
4. **Given** o ambiente de produção, **When** se inspeciona a configuração, **Then** o redirecionamento de sandbox de e-mail (destinatário fixo de teste) está **desligado** — e-mails vão aos destinatários reais.

---

### User Story 4 - Testes de integração de e-mail no CI (Priority: P3)

O time de desenvolvimento passa a ter os testes de integração de envio de e-mail executados automaticamente no CI contra um servidor SMTP de teste efêmero (ex.: Mailpit), mantendo o gate correto: esses testes continuam fora do `pnpm test` puro (opt-in `NOTIFICATIONS_INTEGRATION=1`) e passam a rodar num job de integração dedicado.

**Why this priority**: Protege contra regressão no adapter de envio sem depender de validação manual, mas não bloqueia o go-live — o envio real em homolog/prod (US1–US3) entrega o valor principal.

**Independent Test**: Abrir um PR e verificar que o job de CI sobe o SMTP de teste, executa a suíte de integração de notifications e fica verde; verificar que `pnpm test` puro continua sem exigir SMTP.

**Acceptance Scenarios**:

1. **Given** um PR aberto, **When** o CI executa, **Then** existe um job que sobe um SMTP de teste efêmero e roda a suíte de integração de notifications com sucesso.
2. **Given** o gate de camadas da suíte, **When** se roda `pnpm test` sem nenhuma env de opt-in, **Then** nenhum teste exige servidor SMTP disponível (continuam pulados).
3. **Given** o runner de integração (`pnpm run test:integration:notifications`), **When** executado localmente com o SMTP de teste do compose, **Then** a suíte fica verde — mesmo caminho usado no CI.

---

### Edge Cases

- Credencial SMTP inválida ou expirada: o worker deve falhar de forma explícita e diagnosticável (configuração inválida ≠ crash silencioso), sem consumir/perder mensagens enfileiradas.
- Indisponibilidade temporária do provider SMTP: mensagens permanecem no outbox do produtor e são reprocessadas quando o provider volta (comportamento já existente de retry/backoff — validar em homolog, não reimplementar).
- Divergência documentação × realidade: a decisão registrada (issue #135 + runbook 08 §2) aponta Umbler, mas produção usa SES — enquanto não corrigida, a documentação pode induzir provisionamento errado em homolog; a correção (US3) deve preceder ou acompanhar o US1.
- Propagação de DNS: registros publicados/alterados (ex.: DMARC novo) podem levar horas para propagar; a validação de deliverability só é conclusiva após propagação.
- Conflito entre validação real e sandbox: em homolog, o redirecionamento de sandbox (`EMAIL_SANDBOX_TO`, catálogo §3.6 — "só não-prod") redireciona todo e-mail para uma caixa fixa; para o teste de deliverability externo (mail-tester) é preciso desligá-lo temporariamente ou apontá-lo para o endereço do avaliador.
- Limites de envio do provider: quota e taxa de envio do SES (por conta/região) devem ser conhecidas e registradas no runbook antes do go-live; o volume transacional atual é baixo, mas o limite precisa estar documentado.
- Política DMARC evolutiva: começar em `p=none` (monitoramento); endurecimento (`quarantine`/`reject`) fica para depois do período de observação — fora do escopo desta feature.
- Bounces e reclamações: tratamento de bounce/complaint via webhook é escopo da issue #132, não desta (nota: com SES confirmado em produção, a premissa da #132 — "Umbler não tem webhook, usar Resend" — também merece reavaliação, pois o SES tem notificações de bounce via SNS; registrar na #132, não resolver aqui).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A operação MUST provisionar uma credencial SMTP de envio própria para homolog no provider efetivamente usado em produção (Amazon SES via SMTP — confirmado em 2026-07-02), com credencial distinta por ambiente; a decisão anterior "Umbler" (issue #135 / runbook 08 §2) fica superada e sua correção documental é coberta pelo FR-011.
- **FR-002**: Os secrets de e-mail (host, porta, usuário, senha, flags) MUST ser configurados no ambiente de homolog conforme o catálogo `handbook/infrastructure/03-secrets-catalog.md` §3.6, fora do repositório; nenhum valor de credencial pode aparecer em arquivo versionado.
- **FR-003**: O DNS do domínio remetente MUST ter registro SPF publicado autorizando o provider de envio (auditar o existente; corrigir se necessário).
- **FR-004**: O DNS do domínio remetente MUST ter registro DKIM (chave pública fornecida pelo provider) publicado e validando as assinaturas dos e-mails enviados (auditar o existente; corrigir se necessário).
- **FR-005**: O DNS do domínio remetente MUST ter registro DMARC (`_dmarc`) publicado com política inicial de monitoramento (`p=none`) e endereço de relatório definido (publicar se ausente).
- **FR-006**: O worker de despacho de e-mail (`worker:email-dispatch`) MUST rodar como processo dedicado em homolog, com reinício automático em caso de falha, consumindo os outboxes dos módulos produtores (auth e partners); em produção, onde já roda, sua forma de execução MUST ser auditada e documentada (FR-011).
- **FR-007**: O fluxo de reset de senha em homolog MUST entregar um e-mail real numa caixa externa em até 2 minutos após a solicitação.
- **FR-008**: A deliverability MUST ser validada por avaliador externo com SPF, DKIM e DMARC aprovados e pontuação ≥ 9/10.
- **FR-009**: O CI MUST executar a suíte de integração de notifications contra um servidor SMTP de teste efêmero, mantendo o gate atual: os testes de integração continuam fora do `pnpm test` puro (opt-in por env), e o job de integração prova o caminho verde.
- **FR-010**: Em produção, o redirecionamento de sandbox de e-mail MUST estar desligado (e-mails vão aos destinatários reais); em homolog, o sandbox MUST ficar **ligado por padrão** (protege destinatários reais de dados copiados), com desligamento temporário documentado no runbook para a validação externa de deliverability.
- **FR-011**: O runbook de entrega de e-mail (`handbook/infrastructure/08-email-delivery-runbook.md`) MUST ser atualizado com a realidade operacional: provider real de produção (SES via SMTP) corrigindo a decisão Umbler obsoleta, localização dos secrets por ambiente, forma de execução/reinício do worker em cada ambiente, registros DNS publicados (valores não-sensíveis), limites de envio e procedimento de verificação pós-deploy.

### Key Entities

- **Credencial SMTP de envio**: credencial por ambiente no provider (SES), com remetente `no-reply@<domínio>`; vive no gerenciador de secrets de cada ambiente, nunca no repositório.
- **Registros DNS de autenticação**: SPF (autorização de envio), DKIM (assinatura criptográfica) e DMARC (política e relatório) do domínio remetente — publicados no provedor de DNS do domínio.
- **Worker de despacho**: processo que consome os outboxes dos módulos produtores e realiza o envio via provider; já existe no código (`src/workers/email-dispatch/run.ts`) e já roda em produção; passa a existir também em homolog e a estar documentado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Usuário que solicita reset de senha em homolog recebe o e-mail em caixa real em até 2 minutos, em 10 de 10 tentativas de teste.
- **SC-002**: Avaliação externa de deliverability registra SPF, DKIM e DMARC aprovados e pontuação ≥ 9/10.
- **SC-003**: E-mails de teste enviados a provedores comuns (Gmail/Outlook) chegam à caixa de entrada — 0 ocorrências em spam durante a rodada de validação.
- **SC-004**: Worker de despacho permanece em execução contínua por ≥ 7 dias em homolog sem intervenção manual (reinícios automáticos são aceitáveis; ausência de processamento não).
- **SC-005**: Auditoria do repositório não encontra nenhum valor de credencial de e-mail em arquivo versionado ou no histórico da branch da feature.
- **SC-006**: A suíte de integração de e-mail roda automaticamente no CI em todo PR e fica verde, sem exigir SMTP no gate unit (`pnpm test` puro permanece independente de rede).
- **SC-007**: Uma pessoa da equipe, lendo apenas o runbook atualizado, responde corretamente qual provider produção usa, onde estão os secrets e como o worker roda — sem consultar quem operou o deploy.
- **SC-008**: Nenhum documento do handbook ou issue ativa permanece afirmando Umbler como provider ativo de envio após a correção documental.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: nenhum — feature operacional/infra; não altera `src/modules/*` (o código de envio já existe e está completo — ADR-0010, ADR-0047).
- **Novos agregados / Value Objects?**: nenhum.
- **Novos eventos de domínio (outbox)?**: nenhum — consome `PasswordResetRequested` e demais eventos de e-mail já existentes nos outboxes dos produtores.
- **Novos subcomandos de CLI?**: nenhum.
- **Borda HTTP envolvida?**: não.
- **Superfícies tocadas fora de `src/`**: workflows de CI (`.github/workflows/`), runner de integração (`scripts/ci/test-integration.ts` — subir SMTP de teste para a suíte `notifications`), compose (reuso do serviço `mailpit` já existente, `compose.yaml:230`), scripts/manifests de deploy de homolog e documentação de infra (runbook 08, catálogo de secrets §3.6, issue #135/#132).
- **Possíveis violações da constituição (I–VIII)?**: nenhuma identificada.

## Assumptions

- **Provider de envio = Amazon SES via SMTP**, confirmado para produção pelo usuário em 2026-07-02 (Clarifications). Homolog usa o **mesmo provider por default** (domínio já autenticado; zero DNS novo) com credencial própria — _a validar com o humano antes do provisionamento_ (deferido na sessão de clarify). A decisão "Umbler" (issue #135, 2026-06-19; runbook 08 §2) está superada para envio e será corrigida (FR-011). O adapter atual (Nodemailer/SMTP) atende SES sem mudança de código (ADR-0010).
- **Produção já envia e-mail** (dado do usuário), mas o repo não descreve como: não há manifesto de deploy do worker nem registro do provider real. Forma de execução do worker e localização dos secrets em prod são objeto de auditoria (US3), não premissas conhecidas.
- **Estado do DNS**: expectativa de SPF/DKIM válidos via verificação de domínio no SES (produção entrega sem problema); DMARC provavelmente ausente. Não confirmado — a US2 começa pela auditoria (deferido na sessão de clarify).
- **Sandbox em homolog**: default assumido = **ligado** (`EMAIL_SANDBOX_TO` apontando para caixa de teste), desligado apenas temporariamente para o mail-tester — _a validar com o humano_ (deferido na sessão de clarify).
- **Itens obsoletos da issue**: "definir `NOTIFICATIONS_DATABASE_URL` + aplicar migration `0000` do notifications" caíram com o ADR-0047 (migration `0001` dropou as tabelas do módulo; o env não é lido em lugar nenhum de `src/`). O worker usa `AUTH_DATABASE_URL` e `PARTNERS_DATABASE_URL`, já provisionados nos deploys.
- **`.env.example` consolidado já existe** na raiz do repo (seção de e-mail nas linhas 65–87), portanto o item 6 do checklist da issue está entregue e fora deste escopo.
- **Ambientes**: homolog = QA (VPS, deploy via `deploy-qa.yml` + script na VPS); produção = AWS ECS. A equipe tem acesso ao painel DNS do domínio remetente e ao console AWS (SES/Secrets Manager).
- **Retry/backoff e DLQ** do despacho de e-mail já existem no código (ADR-0047) — esta feature só os exercita em ambiente real, não os altera.
- **Fora de escopo**: tratamento de bounce/complaint via webhook (issue #132 — cuja premissa "usar Resend" merece reavaliação com SES confirmado, mas lá), endurecimento da política DMARC (`quarantine`/`reject`), templates/conteúdo de e-mail, alteração de código de domínio ou application, mudança de provider.
