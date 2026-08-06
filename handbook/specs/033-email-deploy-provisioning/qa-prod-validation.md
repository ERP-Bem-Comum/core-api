# Roteiro de validação Q.A. — E-mail transacional em PRODUÇÃO

**Feature**: 033-email-deploy-provisioning · **Issue**: #135 (e reconciliação de #117/#131/#132/#133/#170)
**Criado**: 2026-07-02 · **Executor**: Q.A. · **Duração estimada**: 45–60 min
**Objetivo**: comprovar, por teste caixa-preta, como o envio de e-mail REALMENTE funciona em produção — e responder de vez as dúvidas em aberto do backlog de e-mail.

> ⚠️ **Regras de segurança do teste (ler antes de começar)**
>
> 1. Use SOMENTE contas/caixas de teste controladas pela equipe. NUNCA dispare reset ou convite para e-mail de cliente real.
> 2. O Bloco F (rate-limit) gera respostas de erro de propósito — execute em horário de baixo movimento.
> 3. Ao final, cancele/remova os convites de teste criados (Bloco G do encerramento).
> 4. Anote TUDO na tabela de resultados do fim — cada linha em branco é uma dúvida que continua viva.

## Pré-requisitos

- [ ] Uma caixa **Gmail** de teste e uma caixa **Outlook/Hotmail** de teste, acessíveis pelo Q.A.
- [ ] Uma conta de usuário de teste em produção cujo e-mail seja a caixa Gmail acima.
- [ ] Acesso admin em produção (para convidar usuário / colaborador).
- [ ] Navegador com acesso a: `https://mxtoolbox.com` e `https://www.mail-tester.com` (ferramentas públicas, não tocam no sistema).
- [ ] Cronômetro (o do celular serve).

---

## Bloco A — O e-mail sai? Em quanto tempo? (fluxo reset de senha)

**Mata a dúvida**: worker de despacho está vivo em prod e qual a cadência real de entrega.

1. Na tela de login de produção, clique em **"Esqueci minha senha"** e informe o e-mail da conta de teste (Gmail). **Inicie o cronômetro** ao enviar.
2. Observe a resposta da tela: deve ser a mensagem genérica de sucesso (anote o texto exato).
3. Aguarde o e-mail na caixa Gmail de teste. **Pare o cronômetro** quando chegar.
4. Anote: tempo até a chegada — **esperado ≤ 2 min**. Chegou na **caixa de entrada** ou no **spam**? (anote — vale ponto no Bloco D).
5. Clique no link do e-mail e confirme que a tela de redefinição abre e funciona (troque a senha e desfaça depois, ou apenas confirme que a tela carrega).

**Resultado esperado**: e-mail chega em ≤ 2 min com link funcional. Se NÃO chegar em 10 min → **PARE AQUI** e reporte: worker possivelmente parado (isso já é o achado mais importante do roteiro).

---

## Bloco B — Prova do provider real + autenticação (headers do e-mail)

**Mata a dúvida**: provider de produção é mesmo Amazon SES? SPF/DKIM/DMARC passam de verdade? (Deferred nº 1 e nº 2 da spec 033)

Com o e-mail do Bloco A aberto no Gmail:

1. Menu ⋮ → **"Mostrar original"** (Show original).
2. No topo da página que abre, o Gmail mostra um quadro-resumo. Anote literalmente:
   - **SPF**: PASS/FAIL + o domínio entre parênteses
   - **DKIM**: PASS/FAIL + o domínio (`d=...`)
   - **DMARC**: PASS/FAIL (se aparecer "—", anote "ausente")
3. Na área de texto abaixo (headers crus), use Ctrl+F e procure:
   - `Received: from` → anote o primeiro servidor que aparece de fora (esperado: algo contendo **`amazonses.com`** ou `email-smtp.<região>.amazonaws.com` → confirma SES; se aparecer `umbler`, o provider é outro — anote!)
   - `DKIM-Signature` → anote os valores de **`s=`** (seletor) e **`d=`** (domínio). Pode haver duas assinaturas (uma `amazonses.com`, uma do domínio próprio) — anote ambas.
   - `From:` → anote o remetente completo (esperado: `no-reply@<domínio>` ou similar).
   - `Return-Path:` → anote (mostra para onde voltam os bounces — importa no Bloco G).

**Resultado esperado**: SPF PASS + DKIM PASS; `Received` aponta Amazon SES. **DMARC pode falhar/ausente — se falhar, isso CONFIRMA o gap previsto (DMARC não publicado) e é um achado, não um erro do teste.**

---

## Bloco C — DNS público (nenhum acesso a prod necessário)

**Mata a dúvida**: o que está de fato publicado no DNS do domínio remetente (Deferred nº 2).

No `mxtoolbox.com`, usando o domínio do `From:` anotado no Bloco B (a parte após o `@`):

1. **SPF**: aba "SPF Record Lookup" → digite o domínio. Anote o registro completo (esperado: conter `include:amazonses.com` — se contiver só `include:spf.umbler.com`, anote: SPF não autoriza o SES e o PASS do Bloco B veio de outro mecanismo).
2. **DKIM**: aba "DKIM Lookup" → digite `domínio` + o **seletor `s=`** anotado no Bloco B. Anote se o registro existe e valida.
3. **DMARC**: aba "DMARC Lookup" → digite o domínio. Anote: existe registro `_dmarc`? Qual a política (`p=none` / `quarantine` / `reject`)? Tem endereço de relatório (`rua=`)?

**Resultado esperado**: SPF e DKIM existentes e válidos; **DMARC provavelmente ausente** (gap previsto — anotar é o objetivo).

---

## Bloco D — Nota de deliverability (mail-tester)

**Mata a dúvida**: nota formal SPF/DKIM/DMARC + reputação (SC-002/SC-003 da spec 033).

1. Abra `https://www.mail-tester.com` → ele exibe um endereço único tipo `test-abc123@srv1.mail-tester.com`. **Copie-o.**
2. Em produção, como admin, dispare um **convite de usuário** (ou de colaborador) para esse endereço — é o jeito de enviar e-mail para um destinatário arbitrário. _(Anote qual fluxo usou; esse convite será cancelado no encerramento.)_
3. Aguarde ~2 min e clique em **"Then check your score"** no mail-tester.
4. Anote: **nota (x/10)** e as três linhas de autenticação (SPF/DKIM/DMARC). Tire print da página inteira.
5. De volta às caixas de teste: confirme onde caiu o e-mail do Bloco A no **Gmail** (entrada/spam) e repita um reset para uma conta com e-mail **Outlook** — anote entrada/spam lá também.

**Resultado esperado**: nota ≥ 9/10 e caixa de entrada nos dois provedores. Nota entre 6–8 com desconto de "DMARC ausente" confirma o gap do Bloco C.

---

## Bloco E — Sandbox desligado + os 3 fluxos de envio

**Mata a dúvida**: `EMAIL_SANDBOX_TO` está desligado em prod (Deferred nº 3, invertido para prod)? E os três templates existentes funcionam?

1. Dispare **reset de senha** para a conta Gmail de teste e **convite de usuário** para a caixa Outlook de teste (destinatários DIFERENTES, quase ao mesmo tempo).
2. Confirme: **cada caixa recebeu o SEU e-mail** (Gmail só o reset; Outlook só o convite). Se os dois caírem na MESMA caixa → sandbox está LIGADO em prod (achado grave — anote o endereço que recebeu tudo).
3. Dispare também um **convite de colaborador** (módulo de parceiros/colaboradores) para uma das caixas de teste — é o 3º e último template existente. Confirme chegada e visual.
4. Para os 3 e-mails, anote: assunto, remetente exibido, e se o layout está apresentável (print de cada um — hoje os templates são simples/inline; o visual "de marca" só chega com o PR #303).

**Resultado esperado**: 3 fluxos entregam, cada um ao seu destinatário. Qualquer redirecionamento cruzado = sandbox ligado.

---

## Bloco F — Segurança da borda (anti-enumeração + rate-limit)

**Mata a dúvida**: proteções reais da borda em prod (contexto da #133).

1. **Anti-enumeração**: em "Esqueci minha senha", informe um e-mail que **não existe** no sistema (ex.: `nao-existe-xyz@<dominio-de-teste>`). Anote: a resposta da tela é **idêntica** à do Bloco A? (deve ser). Confirme que **nenhum** e-mail chega em lugar nenhum.
2. **Rate-limit por IP**: repita "Esqueci minha senha" para a MESMA conta de teste, rapidamente, contando as tentativas: 1, 2, 3… **Anote em qual tentativa** a tela/console de rede passa a responder erro (esperado por configuração-padrão: bloqueio a partir da **6ª** dentro de 1 minuto — HTTP 429; se demorar mais, anote o número real: revela o valor configurado em prod).
3. **Flood por destinatário** (documenta o gap da #133): das tentativas ACEITAS no passo 2 (as que passaram antes do 429), conte **quantos e-mails de reset efetivamente chegaram** na caixa Gmail nos minutos seguintes. Anote o número.
4. Aguarde 2 minutos e confirme que o fluxo volta a funcionar normalmente (o bloqueio expira).

**Resultado esperado**: (1) resposta idêntica e zero e-mail; (2) bloqueio próximo da 6ª tentativa; (3) TODOS os aceitos chegam (≈5 e-mails) — isso **confirma** que não há teto por destinatário (#133 procede), só por IP.

---

## Bloco G — Robustez da fila + destino dos bounces

**Mata a dúvida**: mensagem ruim trava a fila? Para onde vai o bounce? Alguém marca algo como devolvido? (#132 e o gap de backoff)

1. Como admin, dispare um **convite de usuário** para um endereço **inexistente num domínio real**: `qa-bounce-teste-20260702@gmail.com` (endereço inválido no Gmail gera devolução).
2. **Imediatamente depois**, dispare um convite para a caixa Outlook de teste (válida).
3. Confirme: o convite **válido chega normalmente** (≤ 2 min) — prova que uma mensagem ruim não trava a fila para as demais.
4. Verifique a caixa do **`Return-Path`** anotado no Bloco B (peça a quem tiver acesso, se não for caixa da equipe): chegou uma mensagem de devolução (bounce) do Gmail? Anote sim/não e quem a recebe.
5. Repita um convite para o MESMO endereço inexistente do passo 1. Ele é aceito de novo pelo sistema? (esperado: **sim** — confirma que não existe suppression list, gap da #132).

**Resultado esperado**: válido entrega; bounce volta para o Return-Path (provavelmente ninguém monitora — anotar!); reenvio a endereço ruim é aceito sem aviso.

---

## Perguntas para quem OPERA a AWS (não é teste — é entrevista de 5 min)

Estas dúvidas não são testáveis por caixa-preta; peça as respostas a quem fez o deploy e anote junto dos resultados (alimentam a US3 da spec 033 — documentação do runbook):

1. O worker `email-dispatch` roda **como**? (serviço ECS dedicado · mesmo container da API · outro)
2. **Onde** vivem `SMTP_HOST/USER/PASS` de prod? (Secrets Manager · env da task definition · outro)
3. Qual **identidade/região SES** está verificada (domínio inteiro ou só o endereço From)? SES está fora do sandbox mode?
4. Qual a **quota de envio** atual da conta SES (envios/24h e taxa/segundo)?
5. O que **reinicia** o worker se ele morrer? (política do ECS service · manual)

---

## Tabela de resultados (preencher e devolver)

| #   | Item                                             | Resultado                      | Evidência (print/valor)  |
| --- | ------------------------------------------------ | ------------------------------ | ------------------------ |
| A   | Reset chega em ≤ 2 min                           | ☐ sim ☐ não (tempo: \_\_\_)    |                          |
| B   | SPF / DKIM / DMARC no Gmail                      | **_ / _** / \_\_\_             | print "mostrar original" |
| B   | Provider no header Received                      | ☐ SES ☐ Umbler ☐ outro: \_\_\_ |                          |
| B   | From / Return-Path                               | **_ / _**                      |                          |
| C   | SPF publicado (conteúdo)                         |                                |                          |
| C   | DKIM (seletor \_\_\_) válido                     | ☐ sim ☐ não                    |                          |
| C   | DMARC existe / política                          | ☐ não ☐ sim, p=\_\_\_          |                          |
| D   | Nota mail-tester                                 | \_\_\_/10                      | print                    |
| D   | Entrada vs spam (Gmail / Outlook)                | **_ / _**                      |                          |
| E   | Sandbox desligado (cada caixa recebe o seu)      | ☐ sim ☐ NÃO                    |                          |
| E   | 3 templates entregam (reset/convite/colaborador) | ☐☐☐                            | prints                   |
| F   | Anti-enumeração (resposta idêntica, zero e-mail) | ☐ ok ☐ falhou                  |                          |
| F   | Rate-limit dispara na tentativa nº               | \_\_\_                         |                          |
| F   | E-mails que chegaram no flood                    | **_ de _** aceitos             |                          |
| G   | Mensagem ruim não trava a fila                   | ☐ ok ☐ travou                  |                          |
| G   | Bounce recebido em (quem?)                       | \_\_\_                         |                          |
| G   | Reenvio a endereço ruim aceito                   | ☐ sim (gap confirmado) ☐ não   |                          |
| —   | 5 respostas da entrevista AWS                    | anexar                         |                          |

## O que cada resultado mata

- **A + E** → fecham as dúvidas "worker em prod" e "sandbox" (spec 033, Deferred 3/4) e provam os 3 fluxos.
- **B + C + D** → fecham "provider real" e "estado do DNS" (Deferred 1/2) e dão o veredito do DMARC — insumo direto da US2 da spec 033.
- **F** → documenta o comportamento real da #133 (rate-limit por IP existe; por destinatário não).
- **G** → documenta os gaps da #132 (sem bounce tracking, sem suppression) com evidência de prod.
- **Entrevista AWS** → alimenta a US3 (runbook 08) e encerra a divergência "Umbler × SES" na documentação.
