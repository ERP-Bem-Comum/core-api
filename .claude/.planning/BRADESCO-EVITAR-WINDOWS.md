# Linha de pesquisa — Evitar EC2 Windows para integração Bradesco

> **Para:** P.O. do Bem Comum (Gabriel/Ricardo/Alessandra)
> **Status:** ✅ **DECISÃO TOMADA em 2026-05-22 — H₀ confirmado.** P.O. (Alessandra) consultou o gerente Bradesco; **não há trilho que exija Windows** para nosso fluxo CNAB via VAN. As 2× EC2 t3.small Windows do orçamento CodeBit (~US$ 160/mês prod + duplicação em staging) podem ser **retiradas**. Ver §0 abaixo para a evidência integral.
> **Próximo passo (humano):** pedir reorçamento à CodeBit sem Windows; abrir solicitação formal ao Cash Management Bradesco para o convênio CNAB (não passa pelo portal developers).
> **Contexto original:** Orçamento CodeBit AWS de US$ 400,38/mês incluía 2× EC2 t3.small Windows justificados pela necessidade de cliente Bradesco. O material oficial Bradesco em `handbook/guidelines/bradesco_guideline/` já indicava que Windows não era exigido; faltava confirmação do banco.
> **Meta original:** decisão binária — Windows SIM ou NÃO. **Resposta: NÃO.**

---

## 0. Veredito (2026-05-22) — H₀ confirmado pelo banco

### Resumo da consulta

A P.O. Alessandra (Ale) levou as perguntas ao gerente Bradesco do convênio do Bem Comum. Conversa em 22/05/2026 entre 10:49 e 14:21. **Resultado final: nenhuma exigência de Windows em nenhuma camada do fluxo.**

### Achados normativos (citação literal da P.O., reformatada)

1. **CNAB via VAN não passa pelo Portal Developers.** "O CNAB é tratado diretamente pelo setor de **Cash Management / Transmissão de Dados** do banco, e os testes de arquivo não passam pelo portal de desenvolvedores."
2. **Não há credenciais/endpoints/sandbox de API para CNAB.** "Para o cenário de vocês (CNAB), não há necessidade de uma conta no portal de desenvolvedores. O Bradesco não valida o CNAB por uma API de Sandbox."
3. **Validação de arquivo é via ferramenta web única — o Validador Universal:**
   - URL: <https://wspf.banco.bradesco/wsValidadorUniversal/validadorgeral>
   - Função: valida estrutura, posições e blocos do arquivo CNAB texto antes de trafegar pela VAN.
   - Rodável em qualquer browser → **Linux/macOS servem**.
4. **Portal Developers existe APENAS para APIs em tempo real** (JSON, tokens, mTLS). Não tem escopo CNAB. Confirma o trilho D dos PDFs como caminho separado (e também Linux-friendly).
5. **Layout oficial CNAB 240 Multipag** (referência canônica para fluxo de saída/pagamentos):
   <https://assets.bradesco/content/dam/portal-bradesco/assets/pessoajuridica/pdf/4008-523-0687-layout-multipag.pdf>
   - **Fonte local extraída em LaTeX (4085 linhas):** `handbook/guidelines/bradesco_guideline/AI_KNOWLEDGE_BASE/payment_document.tex` — documento `№ 4008-523-687 versão 03`. Manual de Procedimentos Multipag Bradesco. Citação literal da finalidade (linha 17): _"Orientação da montagem do arquivo das empresas que **não utilizam o aplicativo Office Banking Bradesco Plus**."_ → o próprio manual oficial é endereçado a empresas que **não** usam o app Windows desktop. **Evidência documental adicional sustentando H₀.**

### Por que H₀ está confirmado

| Aspecto técnico | Exige Windows? | Por quê |
|:---|:---:|:---|
| Geração do arquivo CNAB texto | ❌ Não | Texto puro — qualquer runtime gera (Node, Python, Java, etc.) |
| Validação pelo Validador Universal | ❌ Não | Ferramenta web — acessível de qualquer browser |
| Transmissão via VAN (Finnet/NDD/ScopusVAN/ProsperItS) | ❌ Não | SFTP/conector da VAN — todas oferecem cliente Linux |
| API HTTPS+mTLS (trilho D para tempo real) | ❌ Não | Portal Developers — TLS padrão, sem dependência de SO |

Nenhum dos 4 trilhos relevantes ao nosso fluxo requer EC2 Windows. **O orçamento CodeBit pode ser reescrito sem as 2× t3.small Windows.**

### Impacto financeiro

- **Economia direta:** ~US$ 160/mês em produção = **~US$ 1.920/ano**.
- **Economia adicional (staging):** duplicação prevista do mesmo custo = **~US$ 1.920/ano**.
- **Total estimado:** ~**US$ 3.840/ano** (~R$ 19k–20k/ano dependendo de câmbio).

### Pendências decorrentes (não-bloqueantes para a decisão)

- [ ] Alessandra abrir solicitação formal ao gerente para iniciar processo de **homologação CNAB com o Cash Management Bradesco** (escopo do convênio).
- [ ] Time técnico escolher a VAN (Finnet/NDD/ScopusVAN/ProsperItS) — fora do escopo deste planning, virará ADR próprio quando módulo Financeiro entrar.
- [ ] Atualizar pedido de orçamento à CodeBit removendo as 2× EC2 Windows + reduzir staging proporcionalmente.

---

## 1. Hipótese a testar

> **H₀:** O ERP Bem Comum **NÃO precisa** de máquina Windows na infra para integrar com Bradesco. Toda a comunicação (boletos, Pix, conciliação) pode ser feita por API HTTPS+mTLS, opcionalmente complementada por SFTP/VAN rodando em Linux.
>
> **H₁ (rival):** Existe alguma exigência contratual, operacional ou técnica do Bradesco para o nosso porte/segmento que **obriga** uso do **Office Banking Bradesco Plus** (app desktop Windows) ou do cliente **STCPCLT** (Windows-only).

A pesquisa termina quando uma das duas for confirmada com fonte oficial.

---

## 2. O que sabemos hoje (resumo dos PDFs)

Material analisado: `handbook/guidelines/bradesco_guideline/AI_KNOWLEDGE_BASE/` (6 PDFs oficiais, ~313 páginas).

### Trilhos de integração que aparecem no material

| # | Trilho | Roda em Linux? | Documentado em |
|---|--------|----------------|----------------|
| **A** | Office Banking Bradesco Plus (app desktop Windows) | ❌ **NÃO** | Manual Multipag, **por exclusão** (linha 18) |
| **B** | VAN externa (Finnet/NDD/ScopusVAN/ProsperItS) + SFTP | ✅ Sim | WebService Bradesco (linha 258 + glossário) |
| **C** | Upload manual no portal NetEmpresa Bradesco | ✅ Sim (não automatiza) | IXC CNAB ("Remessa e Retorno Manual", linha 253) |
| **D** | **API HTTPS direta** (Funcionalidade 175 + API Pix v2) | ✅ Sim, 100% | HubSoft V0/V1/V2, SGP, API Pix, TecnoSpeed |
| **E** | Plataforma SaaS intermediária (HubSoft/SGP/TecnoSpeed/IXC) | ✅ Sim | 4 dos 6 PDFs |

### O que o material PROVA

- **4 dos 6 PDFs** descrevem o **trilho D** (API HTTPS) como caminho moderno.
- **NENHUM** PDF descreve passos de configuração do Office Banking Plus / STCPCLT.
- Manual Multipag linha 18 (citação literal): _"orientar a montagem de arquivos por empresas que **não utilizam o aplicativo Office Banking Bradesco Plus**"_.
- WebService linha 258 (citação literal): _"A conciliação precisa ser feita via CNAB (manual ou VAN)"_ — VAN não é Windows.
- Para Pix, URL oficial é `https://qrpix.bradesco.com.br/v2/` — HTTPS + mTLS, qualquer Linux serve.
- Para registro de boleto via API V2, exigência é apenas **Certificado A1 PFX** + Client ID/Secret.

### O que o material NÃO ESCLARECE (e é a pesquisa)

- **Qual é o canal de transmissão CNAB no nosso convênio?** Os manuais ensinam o LAYOUT, não o TRANSPORTE.
- **A Bradesco oferece SFTP/MFT direto a clientes empresariais sem intermediar via VAN?**
- **Vamos usar CNAB ou só a API?** Se for só API, a discussão sobre VAN/STCPCLT some.

---

## 3. Interlocutores e perguntas — agenda de contato

### 3.1 Gerente da conta Bradesco do Bem Comum (PRIMEIRO contato)

**Canal:** telefone + e-mail.
**Por que primeiro:** ele tem o convênio em mãos e abre chamado para os times técnicos.

> **Roteiro de e-mail/ligação:**
>
> _"Olá [Nome], estamos modernizando o sistema do Bem Comum e queremos validar com vocês qual é o trilho técnico recomendado de integração para nosso convênio. Tenho 5 perguntas objetivas:"_

| # | Pergunta | O que estamos investigando |
|---|----------|-----------------------------|
| 1 | Nosso convênio atual está habilitado para a **funcionalidade 175 — Registro via Webservice**? Se não, qual é o procedimento para habilitar? | Confirmar acesso ao trilho D para boletos |
| 2 | Temos (ou conseguimos) acesso à **API Pix v2** (`qrpix.bradesco.com.br/v2`)? Existe taxa adicional? | Confirmar acesso ao trilho D para Pix |
| 3 | Para arquivos CNAB (folha, tributos, conciliação), o Bradesco aceita transmissão via **SFTP corporativo direto com o banco**, ou **OBRIGA passar por VAN** (Finnet/NDD/ScopusVAN)? | Testar se conseguimos contornar VAN |
| 4 | Vocês têm um produto chamado **TEA — Transferência Eletrônica de Arquivos** ou similar, que ofereça SFTP/HTTPS gerenciado pelo próprio Bradesco para empresas do nosso porte? | TEA é o "MFT corporativo" do Bradesco, alternativa direta à VAN |
| 5 | Há alguma exigência contratual, normativa ou regulatória que **obrigue** uso do **Office Banking Bradesco Plus** (app desktop Windows) para nosso segmento (ONG/Terceiro Setor)? | Atacar diretamente a hipótese rival |

**Resposta esperada para fechar H₀:**
- 1 = Sim / em até X dias úteis após enviar chave pública
- 2 = Sim / processo padrão
- 3 = SFTP direto OK (ou pelo menos VAN é opcional)
- 4 = Sim, temos TEA / produto equivalente
- 5 = **Não há obrigação**

**Resposta que confirma H₁ (precisamos Windows):**
- Qualquer pergunta 1-5 que devolva _"obrigatório usar Office Banking Plus"_.

---

### 3.2 Suporte API Bradesco — `suporte.api@bradesco.com.br`

**Canal:** e-mail (templates já estão em `05_WebService_Bradesco/01_...md` linhas 80-133).

**Quando contatar:** depois que o gerente confirmar habilitação da funcionalidade 175.

> **Assunto:** `INFO | INTEGRAÇÃO | BEM COMUM ASSOCIAÇÃO | <CNPJ>`
>
> **Corpo:**
> ```
> Prezados,
>
> Estamos planejando integração nativa com a API V2 do Bradesco (Registro via Webservice + API Pix v2) para o ERP Bem Comum.
>
> Antes de iniciar a homologação, gostaríamos de confirmar alguns pontos técnicos:
>
> 1. A API V2 do Bradesco (boletos) suporta integralmente:
>    - Registro
>    - Alteração de vencimento
>    - Baixa/cancelamento
>    - Consulta de pagamentos via rotina
>    Sem dependência de qualquer software desktop ou cliente Windows? (Apenas HTTPS + certificado A1 + Client ID/Secret)
>
> 2. Para a API Pix v2 (qrpix.bradesco.com.br/v2), a única dependência é
>    OAuth2 + mTLS com certificado A1 — correto?
>
> 3. Em caso de necessidade de CNAB (folha, tributos), o Bradesco aceita
>    SFTP corporativo direto (sem VAN intermediária)? Existe produto
>    "TEA - Transferência Eletrônica de Arquivos" disponível para nosso convênio?
>
> 4. Há algum cenário documentado em que vocês recomendam o uso do
>    Office Banking Bradesco Plus em detrimento da API V2? Se sim, qual?
>
> Atenciosamente,
> [Nome / Cargo / Telefone]
> ```

**Por que esse e-mail:** força resposta por escrito da própria equipe técnica do banco, que vale como referência oficial.

---

### 3.3 CodeBit (Samuel Augusto Ribeiro)

**Canal:** thread atual de e-mail (em resposta ao orçamento).

> **Mensagem sugerida:**
>
> _"Samuel, antes de validar o orçamento, ajuda a entender o dimensionamento das 2× t3.small Windows — para qual cliente/software específico do Bradesco elas foram planejadas?_
>
> _Nosso material oficial Bradesco (Layout API Pix 2.6.1, HubSoft API V2, SGP, TecnoSpeed PlugBoleto, Multipag CNAB 240) descreve API HTTPS+mTLS como trilho default — o manual Multipag declara explicitamente ser para 'empresas que não utilizam Office Banking Bradesco Plus' (página de visão geral)._
>
> _As Windows foram dimensionadas para:_
>
> _(a) Office Banking Bradesco Plus,_
> _(b) STCPCLT (cliente VAN/transferência),_
> _(c) STCPLinux (versão Linux), ou_
> _(d) outro motivo?_
>
> _Se a integração for via API V2 + API Pix + (eventual) SFTP de CNAB via VAN externa, conseguimos remover as Windows do escopo? Isso impacta diretamente o orçamento (US$ 160/mês × 2 ambientes = US$ 320/mês ≈ R$ 18,8k/ano)."_

**Por que perguntar:** a CodeBit é AWS Solutions, não especialista Bradesco. O Windows pode ter sido um default conservador deles. Forçar a justificativa **antes** de provisionar é responsabilidade fiduciária da P.O.

---

### 3.4 (Se necessário) Comunidade técnica externa

Caso o gerente Bradesco demore ou seja evasivo, validar paralelamente:

| Fonte | O que perguntar | Onde |
|-------|-----------------|------|
| **TecnoSpeed** (PlugBoleto) | "Vocês integram com Bradesco 100% via HTTPS sem Windows na infra do cliente?" | `suporte@tecnospeed.com.br` ou chat do PlugBoleto |
| **NDD** ou **Finnet** (VANs) | "Para Bradesco, vocês recebem arquivos via SFTP a partir de qualquer Linux?" | Site comercial / vendedor |
| **HubSoft** | "API V2 Bradesco exige Windows em algum ponto da integração?" | Suporte técnico |
| **Comunidades** | Procurar "Bradesco STCPCLT Linux", "Bradesco API Pix sem Windows", "Bradesco MFT SFTP empresarial" | Stack Overflow PT, fóruns FEBRABAN, LinkedIn |

---

## 4. Critérios de decisão

Tomar uma decisão binária baseada nas respostas:

### Cenário 1 — H₀ confirmada (NÃO precisa Windows)

**Condições:**
- Gerente confirma funcionalidade 175 disponível **OU** CNAB pode ir via SFTP/VAN direto.
- Suporte API confirma por escrito que API V2 + Pix não dependem de Windows.
- CodeBit confirma que Windows foi default conservador.

**Ações:**
1. Remover 2× t3.small Windows do orçamento (economia: ~US$ 320/mês = R$ 18,8k/ano).
2. Re-pedir orçamento à CodeBit no formato: **2× t4g.small Linux (ARM) + RDS + ALB + S3 + CloudFront**.
3. Provisionar certificado A1 PFX, guardar em S3 cifrado + montar em `/etc/bradesco/cert.pfx` na EC2.
4. Iniciar homologação API V2 + API Pix em paralelo ao desenvolvimento.

### Cenário 2 — H₁ confirmada (precisa Windows)

**Condições:**
- Gerente ou Suporte API afirma textualmente que o convênio só opera via Office Banking Plus.
- Não conseguimos habilitação da funcionalidade 175 em prazo razoável.

**Ações:**
1. Manter Windows **somente em produção** (1×, não 2×) — staging pode rodar com mock do trilho Bradesco.
2. Re-negociar com Bradesco a **mudança de convênio** para um que aceite API V2 (sair do Office Banking Plus é objetivo de médio prazo, não bloqueia agora).
3. Avaliar Lightsail Windows ($16/mês) vs EC2 t3.small Windows ($35/mês) para reduzir custo.
4. Documentar como **dívida técnica explícita** em ADR — depender de Windows no ERP é fragilidade arquitetural.

### Cenário 3 — Híbrido (precisamos SÓ em casos específicos)

Exemplo: API V2 cobre boletos e Pix, mas folha/tributos exigem CNAB via Office Banking.

**Ações:**
1. Provisionar **uma única** Windows pequena (Lightsail $16/mês) só para esses fluxos esporádicos.
2. Modelar adapter dedicado isolado (`OfficeBankingAdapter`) atrás de port — minimiza acoplamento.
3. Avaliar VAN externa como alternativa pra eliminar Windows no médio prazo.

---

## 5. Cronograma sugerido (1 semana corrida)

| Dia | Ação | Responsável |
|-----|------|-------------|
| **D+0 (hoje)** | Enviar e-mail ao gerente Bradesco (perguntas §3.1) | P.O. |
| **D+0** | Enviar e-mail a `suporte.api@bradesco.com.br` (§3.2) | P.O. |
| **D+0** | Responder Samuel (CodeBit) com pergunta §3.3 | P.O. ou Gabriel |
| **D+1 a D+3** | Aguardar respostas (gerente costuma responder em 2-3 dias) | — |
| **D+3** | Se sem resposta do gerente, ligar | P.O. |
| **D+4** | Ligar para TecnoSpeed/NDD pedindo segunda opinião (§3.4) | P.O. ou Gabriel |
| **D+5** | Consolidar respostas + decidir cenário 1/2/3 | Reunião P.O. + Gabriel + Ricardo |
| **D+5** | Responder CodeBit com escopo ajustado | Ricardo (decisão financeira) |
| **D+7** | Liberação do orçamento ajustado para provisionamento | Ricardo |

---

## 6. Documentação a anexar nos e-mails (opcional, mas reforça posição técnica)

- Trecho do **Manual Multipag página visão geral** sobre _"empresas que não utilizam Office Banking Bradesco Plus"_ — está no PDF original em `handbook/guidelines/bradesco_guideline/jun-19-layout-multipag.pdf`.
- Trecho do **TecnoSpeed WebService** linha 258 sobre _"conciliação via CNAB manual ou VAN"_.
- Trecho do **Layout API Pix 2.6.1** sobre OAuth2 + mTLS — manual oficial do Bradesco.

> **Atenção:** os PDFs em `handbook/guidelines/` são **local-only** (com `.gitignore`). Pode citar trechos curtos em e-mails, mas **não anexar o PDF inteiro** — uso restrito. Se a outra parte pedir o documento completo, eles têm cópia oficial pela própria Bradesco.

---

## 7. Como falar com IA depois para acompanhar essa pesquisa

Quando receber respostas, abrir nova sessão no Claude Code dizendo:

> _"Estou retomando a pesquisa documentada em `.claude/.planning/BRADESCO-EVITAR-WINDOWS.md`. Recebi as seguintes respostas: [colar texto]. Me ajuda a interpretar e decidir entre os cenários 1, 2 ou 3."_

Claude vai abrir este arquivo, recuperar o contexto e analisar.

---

## 8. Cenário pessimista (vale ter em mente)

Mesmo que precisemos Windows, o **menor degrau possível** é:

- **1× Lightsail Windows Server 2022 ($16/mês — 1GB RAM)** — apenas para produção.
- Snapshot semanal para AMI ($1-2/mês).
- Acesso via RDP do escritório quando precisar.
- Em **staging**, mock do canal Bradesco (registro fake retorna sucesso).
- Em **dev**, ninguém precisa Windows — usa adapter `InMemory`.

Esse cenário pessimista custa ~**US$ 18/mês** em vez dos US$ 160/mês originais — **economia de 89%** mesmo perdendo a hipótese H₀.

---

## 9. Tabela-resumo para imprimir e levar pra reunião

| Item | Hoje (CodeBit propôs) | Melhor caso (H₀) | Pior caso (H₁ atenuado) |
|------|----------------------|-------------------|-------------------------|
| 2× t3.small Windows | US$ 160/mês | **US$ 0** (removido) | US$ 35/mês (1×, sem staging) |
| 2× t3.small Linux ECS | US$ 30/mês | US$ 24/mês (t4g.small ARM) | US$ 24/mês |
| 2× RDS MySQL t3.small | US$ 50-60/mês | US$ 25/mês (1× Multi-AZ + 1× micro single) | US$ 30/mês |
| NAT Gateway | US$ 32/mês | US$ 3/mês (NAT instance) | US$ 3/mês |
| 2× ALB | US$ 36/mês | US$ 18/mês (1×) | US$ 18/mês |
| API Gateway | US$ 0-10/mês | US$ 0 (substituído por ALB) | US$ 0 |
| **Total mensal AWS** | **~US$ 400** | **~US$ 100-130** | **~US$ 130-160** |
| **Anual (R$ a R$ 5,00/USD)** | **R$ 24k** | **R$ 6-8k** | **R$ 8-10k** |
| **Economia anual vs proposta** | — | **~R$ 16k** | **~R$ 14k** |

---

## Apêndice — termos que a P.O. pode encontrar na conversa

| Termo | Significado |
|-------|-------------|
| **Funcionalidade 175** | Código interno Bradesco para "Registro via Webservice" (API direta de boletos) |
| **Office Banking Bradesco Plus** | App desktop Windows do Bradesco para empresas (legado, ainda usado por contadores) |
| **STCP / STCPCLT** | Sistema de Transferência e Comunicação de Pacotes — cliente Windows do Bradesco para troca de arquivos |
| **STCPLinux** | Versão Linux do STCP — existe mas é menos conhecida e mal documentada |
| **TEA** | Transferência Eletrônica de Arquivos — produto Bradesco de MFT/SFTP empresarial |
| **VAN** | Value Added Network — empresas terceiras (Finnet/NDD/Scopus) que intermediam troca de arquivos com bancos |
| **mTLS** | Mutual TLS — cliente E servidor se autenticam com certificado (padrão da API Pix) |
| **Certificado A1** | Certificado digital em arquivo .PFX (com senha), 1-3 anos de validade — exigência da API V2 e API Pix |
| **CNAB 240 / 400** | Layout de arquivo para troca de cobranças/pagamentos com banco — não é canal, é formato |
| **Convênio** | Acordo formal banco-empresa que define quais funcionalidades a empresa tem acesso |

---

> **Última atualização:** 2026-05-21
> **Próxima revisão:** após receber respostas do gerente Bradesco e suporte.api
