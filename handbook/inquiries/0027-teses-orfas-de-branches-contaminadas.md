[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0027: Teses órfãs — o que 7 branches contaminadas tentavam provar

- **Status:** Open
- **Opened:** 2026-08-06
- **Closed/Decided:** —
- **Opened by:** Gabriel Aderaldo
- **Asked to:** investigação interna (método comparativo sobre o próprio repositório)
- **Impact:** ADR-0033 (colidido) · ADR-0034/0035 (colididos) · ADR-0047 (colidido) · specs 009/026/041/042 · issue #131 · lacuna de auto-expire de contratos

---

## 1. Contexto

Em 2026-08-06, após o merge do PR #629, o repositório local tinha 9 branches além de `dev`/`main`. Uma
(`wip/checkpoint-2026-05-25`) estava inteiramente contida na `dev` e foi deletada sem perda. As 8 restantes
carregavam commits ausentes da `dev` — e a inspeção revelou que **nenhuma delas é mergeável**, por um motivo
que rebase não resolve.

**O problema não é conflito de linha. É colisão de identidade.** Enquanto essas branches dormiam, a `dev`
reaproveitou os números que elas reivindicavam:

| A branch diz | Na `dev` esse número pertence a |
| :--- | :--- |
| ADR-0033 imagem-base Debian bookworm-slim | `0033-api-versioning-v1-legacy-mirror` |
| ADR-0034 infra runtime AWS/Magalu | `0034-adopt-bruno-api-client-cli` |
| ADR-0035 edge Caddy | `0035-partner-territory-soft-delete` |
| ADR-0047 topologia cross-módulo | `0047-transactional-email-via-producer-domain-event` |
| spec 009 auto-expire de contratos | `009-fin-documentos-titulos` |
| spec 010 contagem nos grids | `010-fin-listagem-timeline` |

Busquei o conteúdo dessas branches sob **qualquer outro número** na `dev` (bookworm/Debian/Alpine/Caddy,
cross-module/topologia): nenhum resultado. Os documentos nunca entraram, e os números seguiram em frente.

Daí a pergunta desta inquiry. O código dessas branches está contaminado demais para ser reintegrado — mas
**o raciocínio que elas carregam não está errado por isso**. Uma tese não se torna falsa porque o branch
que a hospedava envelheceu. Este documento separa as duas coisas: descarta o veículo, preserva a hipótese,
e submete cada uma ao único teste que importa — **o que a realidade fez enquanto elas esperavam.**

> **Invariante desta inquiry:** nada aqui autoriza merge, cherry-pick ou reabertura de branch. O produto é
> conhecimento registrado. Qualquer tese que sobreviver ao confronto vira ticket ou ADR **novo**, escrito do
> zero contra o código atual, com numeração livre.

---

## 2. Pergunta(s) feita(s)

```
essas branchs estão contaminadas d+ para serem usadas, porém não quero perder onde tentavam chegar
[…] vamos criar uma inquire para "fazer" um metodo cientifico tradicional e parear resultados,
tentar refutar ou até investigar eles […] vamos manter a ideia e testa-la, mas sem corromper o que temos!
```

Operacionalizando: para cada branch, **(a)** qual era a tese, **(b)** que caminho ela seguiu, **(c)** a que
resultado chegou, e **(d)** o que a evidência disponível hoje faz com essa tese — corrobora, refuta, ou
deixa em aberto.

---

## 3. Método

Cada branch foi tratada como um **experimento interrompido**. O procedimento:

1. **Isolar a tese** — ler o documento de argumento que a branch adicionou (`spec.md`, ADR, épico), não a
   mensagem de commit. Mensagem de commit descreve o que foi feito; a tese está no documento.
2. **Extrair a previsão** — toda tese de arquitetura afirma algo sobre o futuro ("se adotarmos X, então Y").
3. **Confrontar com a `dev` de hoje** — a `dev` avançou ~2 meses sem essas branches. Ela é o **grupo de
   controle natural**: o que aconteceu quando a tese *não* foi aplicada?
4. **Emitir veredito falsificável**, com o comando/arquivo que sustenta cada um.

O passo 3 é o que dá força ao exercício. Não estamos julgando as teses por plausibilidade — estamos
perguntando se o mundo se comportou como elas previram.

### Escala de veredito

| Veredito | Significado |
| :--- | :--- |
| **Corroborada** | A realidade fez o que a tese previu — inclusive por outro caminho. |
| **Refutada** | A realidade fez o contrário. A tese estava errada, ou o contexto mudou sob ela. |
| **Absorvida** | O trabalho entrou na `dev` por outra rota. Nada a recuperar. |
| **Não testada** | A lacuna que a tese apontava **persiste**. Ninguém provou nem refutou. |

---

## 4. As teses, uma a uma

### T1 — Observabilidade do outbox de e-mail (`026-email-outbox-observability`, 7 commits, só-local)

**Problema observado.** Dois produtores de outbox de e-mail (`auth_outbox`, `par_email_outbox`) alimentam o
worker `email-dispatch`. O estado de cada envio existe no banco, mas — nas palavras da spec — *"não há
nenhuma forma de um operador enxergar se os e-mails estão saindo, falhando ou travados"*.

**Tese.** Um canal de e-mail sem superfície de observação não é confiável em go-live, mesmo que funcione.
Confiança operacional exige poder *responder* "o convite saiu?", não apenas torcer para que tenha saído.

**Método.** Três histórias em prioridade decrescente: (P1) endpoint HTTP admin sob RBAC com status por
mensagem e agregados por produtor, sem vazar corpo/PII; (P2) métricas + log estruturado do `WorkerStats` por
iteração; (P3) tabela DLQ dedicada com listagem e reprocesso idempotente.

**Resultado alcançado.** Spec completa (specify→clarify→plan→tasks), mais implementação em `auth` e
`partners` e permissões `outbox:read` / `outbox:reprocess`.

**Confronto.** A **issue #131 segue OPEN**. A lacuna que motivou a tese não foi fechada por nenhum outro
caminho.

> **Veredito: Não testada.** A dor descrita continua real e sem cobertura. A tese não foi refutada — foi
> abandonada. É a candidata mais forte a virar ticket novo.

---

### T2 — O harness degradou e precisa nascer dos ADRs (`chore/rules-and-specs-overhaul`, 4 commits, remota)

**Tese.** As `.claude/rules/` divergiram do código real; devem ser reconstruídas a partir dos ADRs, e a
pipeline W0→W3 deve ser aposentada em favor das primitivas nativas.

**Confronto.** Comparei as specs homônimas contra a `dev`:

| Spec | Branch vs `dev` |
| :--- | :--- |
| `040-rules-match-code-reality` | **idêntica** |
| `038-retire-pipeline-w0w3` | `dev` mais avançada (branch é predecessora) |
| `039-claude-native-harness` | `dev` mais avançada |

> **Veredito: Absorvida** — quanto às specs. A tese venceu e já é o plano corrente.

**Mas há um resíduo não absorvido, e ele tem evidência de campo.** A branch também deletava
`.claude/hooks/inject-ticket-context.sh` e `.claude/hooks/subagent-stop-validate.sh`. Esses hooks **continuam
vivos na `dev`**. Durante a própria sessão que produziu esta inquiry, o hook injetou em cada prompt o
contexto de tickets fechados e sem relação com a tarefa (`FIN-UNDO-RECON-DESTINATION`,
`REP6-STATUS-DISPLAYSTATUS`), consumindo espaço de contexto para descrever trabalho encerrado dias antes.

> **Veredito do resíduo: Corroborada por observação direta.** O ruído que a branch queria remover foi
> observado em ação. Custo mecanicamente mensurável, remoção de baixo risco.

---

### T3 — O discriminador "exibe vs consulta" (`docs/adr-0047-cross-module-topology`, 1 commit, só-local)

**Problema observado.** Quando o módulo A precisa de um dado de B, o repositório usa duas topologias —
leitura síncrona via `public-api` (ADR-0032) e projeção local mantida por outbox (ADR-0015/0022) — escolhidas
caso a caso. Cada instância virou ADR (0043/0045/0046), mas, nas palavras do documento, *"nunca houve a regra
geral que diz quando cada topologia é a correta"*. O efeito: casos estruturalmente parecidos receberam
topologias diferentes, e *"a assimetria parece inconsistência/gambiarra mesmo quando cada peça está
localmente correta"*.

**Tese.** Existe **um único discriminador** que resolve todos os casos: *A apenas **exibe** o dado, ou A
**consulta** por ele?* Se exibe (decora linha já selecionada por critérios próprios de A) → read port
síncrono. Se consulta (ordena/filtra/busca/pagina sobre o campo) → projeção local, porque um predicado de
`ORDER BY`/`WHERE` só desce para o SQL paginado de A se o campo morar local.

**Método.** ADR `Proposed` estendendo 0006/0015/0022/0032, ancorado em Vernon (*IDDD* p.464 sobre
consistência eventual como escolha deliberada, e p.382 sobre observador leve no mesmo processo), com
classificação dos 6 fluxos cross-módulo existentes sob a regra.

**Resultado alcançado.** A regra classifica corretamente os 6 fluxos, ratifica as projeções existentes como
*instâncias* e não exceções, e isola **uma anomalia**: `financial` → `fin_document_timeline` faz escrita
síncrona na transação do save, desviando do ADR-0022.

**Confronto.** O número 0047 foi tomado por outro ADR. A regra nunca foi ratificada — e o ADR estava
`Proposed`, que por precedente deste repositório **não promove alegação a norma**. A anomalia que ele
apontou não foi investigada.

> **Veredito: Não testada.** Alto valor conceitual, custo baixo (é um documento), e traz de brinde uma
> anomalia concreta e verificável. Precisa de número novo e de ratificação humana.

---

### T4 — Contrato vencido não se finaliza sozinho (`feat/backlog-residual-sdd`, 16 commits, remota)

**Problema observado.** Caso concreto: **CT 0776/2026**, fim de vigência 2026-06-10, exibido como
"Em Andamento" no dia 10/06 e nos seguintes. A transição para "Finalizado" existe, mas só dispara manualmente.

**Tese.** Status que depende de ação humana para refletir a passagem do tempo **distorce a visão
operacional** — um contrato vencido segue contando como vigente.

**Método.** Sweep agendado no worker de outbox, reusando `Contract.expire()` já existente (sem duplicar
regra de domínio), com corte D+1 calculado no fuso de Brasília (UTC-3 fixo, sem DST desde 2019), instantes
persistidos em UTC. Alternativa *derivar status na leitura* foi explicitamente **rejeitada**: geraria estado
divergente — banco em `Active`, evento nunca disparado, UI mostrando algo que o domínio não é.

**Confronto.** Busquei `expire-scheduler` e `findExpirable` na `dev`: **zero arquivos**. A segunda spec da
mesma branch (contagem nos grids) **foi entregue** por outro caminho — `PAR-AGG-CONTRACT-COUNT`, o último
ticket fechado do repositório.

> **Veredito: Não testada** (auto-expire) · **Absorvida** (contagem nos grids).
> A branch mistura uma tese viva e uma morta. O auto-expire é lacuna funcional com caso reproduzível.

---

### T5 — Fundação de DevOps (`feat/devops-foundation`, 19 commits, só-local)

A branch mais densa, e a única cujas teses **a realidade já testou**. Três sub-teses com vereditos
diferentes — o que a torna o material mais instrutivo do conjunto.

#### T5a — Imagem-base glibc, não musl (ADR-0033 da branch)

**Tese.** A escolha de tooling restringe a escolha de libc: `@typescript/native-preview` (tsgo, ADR-0009)
distribui binários nativos **só na variante glibc**; em Alpine/musl o `pnpm install` quebra com
`ERR_PNPM_NO_RESOLUTION_MATCHED`. Logo, `bookworm-slim` sobre Alpine, pinada por digest.

**Confronto.** O `Dockerfile` da `dev` **hoje** usa `node:24.15-bookworm-slim`, e carrega em comentário o
mesmo racional, incluindo o mesmo código de erro.

> **Veredito: Corroborada.** A decisão venceu e chegou ao código — mas **por outro caminho, e o documento se
> perdeu**. O racional sobrevive como comentário de Dockerfile em vez de ADR citável. É o caso mais limpo de
> "tese certa, veículo perdido": não há nada a reimplementar, e sim um ADR a escrever para que a razão pare
> de morar num comentário.

#### T5b — PROD em EC2+Compose+RDS+S3, QA na Magalu como espelho (ADR-0034 da branch)

**Tese.** Duas infras gêmeas por container, diferindo só nos endpoints managed, com custo como critério de
primeira ordem (organização sem fins lucrativos).

**Confronto.** A arquitetura de deploy real divergiu: **PROD roda em AWS ECS** (não EC2 + Compose) e **QA
roda numa VPS** (não Magalu). A premissa de restrição — container always-on com outbox poller, descartando
serverless — **continua válida**; o que não se realizou foi a topologia proposta.

> **Veredito: Refutada.** Registrar como refutada tem valor próprio: impede que alguém a ressuscite achando
> que é a decisão vigente. O que sobrevive é a *análise de forças* (always-on, RW split, S3-compatível,
> custo), não a conclusão.

#### T5c — Caddy como edge único com HTTPS automático (ADR-0035 da branch)

**Tese.** Dois deployables Node precisam de terminação TLS, redirect e security headers na borda; Caddy 2.x
resolve com ACME automático, `reverse_proxy` por host e `trusted_proxies`.

**Confronto — e aqui está o achado mais interessante da inquiry.** O `compose.yaml` versionado da `dev` tem
**zero** ocorrências de Caddy. Mas o deploy de QA executado em 2026-08-06 subiu o container
**`erp-bem-comum-qa-caddy-1`**, saudável.

> **Veredito: Corroborada na prática, ausente do versionamento.** A tese venceu na realidade **sem nunca ter
> sido registrada** — o Caddy vive no compose editado à mão no host do QA, que sofre drift conhecido em
> relação ao repositório. Isso conecta T5c a um problema operacional independente: a topologia real do QA não
> está sob controle de versão. O mesmo deploy expôs o outro lado dessa moeda — o run anterior falhou porque
> o `--wait` esperava por `outbox-contracts`, container que o repositório **já aposentou** ao consolidar 6
> workers em 3.

---

### T6 — O harness não verifica a si mesmo (`feat/pipeline-wave-override`, 2 commits, remota)

Duas specs, ambas de 2026-07-29, ambas com numeração livre hoje (041/042 não existem na `dev`).

#### T6a — spec 041: a regressão é mensurável

**Tese.** A percepção *"estamos errando e criando muitas regressões"* **não é impressão** — tem assinatura
numérica no repositório:

| Sinal | Medição (2026-07-29) |
| :--- | :--- |
| Razão `fix:feat` | mai/2026: 6/55 (10,9%) → jun: 37/228 (16,2%) → jul: **40/103 (38,8%)** |
| Volume | 1.125 commits/12 meses · 10 reverts · 256 PRs desde 2026-05-01 |
| Tickets vs specs | 544 tickets de pipeline · **34** specs formais |

**Método.** Deliberadamente **diagnóstico, não correção**: enumera hipóteses *falsificáveis*, cada uma com o
critério de evidência que a confirmaria ou refutaria. A P1 é binária e precede todas: *quando um ticket é
marcado `closed-green`, isso significa que o código foi revisado e testado, ou virou carimbo?*

> **Veredito: Não testada — e repetível hoje.** Esta é a única tese do conjunto que é **um experimento
> executável**. As medições têm data e método; refazê-las em 2026-08-06 diria se a tendência continuou,
> estabilizou ou reverteu — e a resposta vale independentemente do destino da branch.

#### T6b — spec 042: regra que não bloqueia não vale

**Tese.** *"O harness verifica o código, mas não verifica a si mesmo."* Toda regra declarada bloqueante é
atravessável sem consequência e sem notificação. O critério de sucesso não é escrever mais scripts — é
**reduzir a superfície de regra que depende de alguém escolher lê-la e obedecê-la**.

**Método.** Parte do que já funciona (`.semgrep/rules.yml` para ADR-0020, `check-commit-trailers.ts` para
ADR-0054, `only-allow-pnpm.ts` para ADR-0012, `no-restricted-syntax` no ESLint) e propõe estender esse
padrão à camada normativa ainda em prosa.

> **Veredito: Corroborada.** É a filosofia que o repositório vinha seguindo e continuou seguindo — o plano
> corrente 040 converte o que é mecanizável em teste em vez de texto. A tese não precisa da branch para
> viver; ela já venceu.

---

### T7 — `feat/http-contract-detail-contractor` (8 commits, só-local)

`git rev-list --count feat/devops-foundation..feat/http-contract-detail-contractor` retorna **0**.

> **Veredito: sem tese própria.** Subconjunto exato de T5, mesmo merge-base, mesmos patches. Descarte sem
> perda de informação.

---

## 5. Pareamento dos resultados

| # | Tese | Veredito | Evidência decisiva |
| :--- | :--- | :--- | :--- |
| T5a | Imagem-base glibc | ✅ **Corroborada** | `Dockerfile` da `dev` usa `bookworm-slim` com o mesmo racional |
| T6b | Regra precisa bloquear | ✅ **Corroborada** | plano 040 em execução segue a filosofia |
| T2* | Hooks injetam ruído | ✅ **Corroborada** | observado em ação nesta sessão |
| T5c | Caddy no edge | ⚠️ **Corroborada, não versionada** | `erp-bem-comum-qa-caddy-1` roda; `compose.yaml` não o conhece |
| T5b | PROD EC2+Compose / QA Magalu | ❌ **Refutada** | PROD é ECS; QA é VPS |
| T2 | Rules a partir dos ADRs | 🔄 **Absorvida** | specs 038/039/040 já na `dev` |
| T4b | Contagem nos grids | 🔄 **Absorvida** | `PAR-AGG-CONTRACT-COUNT` fechado |
| T1 | Observabilidade do outbox | ❓ **Não testada** | #131 OPEN |
| T3 | Discriminador exibe/consulta | ❓ **Não testada** | ADR-0047 tomado; regra nunca ratificada |
| T4a | Auto-expire de contratos | ❓ **Não testada** | zero `expire-scheduler` na `dev` |
| T6a | Regressão mensurável | ❓ **Não testada, repetível** | medições de 2026-07-29 refazíveis |
| T7 | — | — | subconjunto de T5 |

**Leitura do pareamento.** Três teses foram corroboradas *sem que a branch fosse mergeada* — a ideia
venceu por conta própria e o veículo virou peso morto. Uma foi refutada pelos fatos. Duas foram absorvidas.
As quatro restantes apontam lacunas que **ninguém fechou**, e é aí que mora o valor recuperável.

O padrão mais instrutivo é T5a + T5c juntas: **decisão técnica correta pode chegar ao código sem que o
registro a acompanhe.** Em T5a o racional sobrevive num comentário de Dockerfile; em T5c a topologia
sobrevive num compose que não está sob versionamento. Nos dois casos o sistema "sabe" algo que o
repositório não consegue citar — que é precisamente o modo de falha que T6a mediu e T6b propôs corrigir.

---

## 6. Programa de investigação

Ordenado por razão valor/custo. **Nada aqui envolve tocar as branches** — cada item é trabalho novo contra
o código atual.

| # | Investigação | Custo | O que decide |
| :--- | :--- | :--- | :--- |
| I1 | **Refazer as medições de T6a** com corte em 2026-08-06 | baixo | Se a razão `fix:feat` caiu após o trabalho de harness (038-040), corrobora que a intervenção funcionou. Se subiu, a causa-raiz é outra. |
| I2 | **Versionar a topologia real do QA** | médio | Fecha T5c e o drift do compose; elimina a classe de falha do `outbox-contracts` fantasma. |
| I3 | **ADR novo para imagem-base glibc** (número livre) | baixo | Tira o racional de T5a do comentário e o põe onde se cita. |
| I4 | **Ratificar ou refutar o discriminador de T3** | baixo | Regra geral para topologia cross-módulo + investigar a anomalia `fin_document_timeline`. |
| I5 | **Ticket para auto-expire (T4a)** | médio | Lacuna funcional com caso reproduzível (CT 0776/2026). |
| I6 | **Retomar #131 a partir da spec de T1** | alto | A spec já existe e é reaproveitável como *texto*, não como código. |
| I7 | **Remover os hooks de T2\*** | baixo | Custo de contexto observado; risco baixo. |

**Ordem sugerida:** I1 antes de tudo — é barata e informa o resto. Se a regressão medida por T6a estabilizou,
o programa muda de prioridade.

---

## 7. Decisão final

**PENDENTE.** Esta inquiry preserva o raciocínio; ela não decide o que fazer com ele.

O que já está decidido e executado:

- `wip/checkpoint-2026-05-25` deletada (contida na `dev`, zero perda).
- As 7 branches restantes **permanecem intactas e não mergeadas**. Nenhum código foi movido.
- Nenhuma numeração de ADR ou spec foi reivindicada por este documento.

Bloqueador para fechar: escolher quais das quatro teses **não testadas** viram trabalho, e em que ordem.

---

## 8. Saídas (outputs concretos)

- [x] Inquiry-0027 criada com as 7 teses, método e vereditos
- [x] `INDEX.md` atualizado
- [ ] I1 — remedição de `fix:feat` com corte 2026-08-06
- [ ] ADR novo (número livre) para imagem-base glibc — T5a
- [ ] ADR novo (número livre) para o discriminador exibe/consulta — T3
- [ ] Ticket de auto-expire de contratos — T4a
- [ ] Decisão sobre #131 à luz da spec de T1
- [ ] Decisão sobre o descarte das 7 branches após esta inquiry absorver o conteúdo

---

## 9. Referências

- Branches inspecionadas (locais, **não mergeadas**): `026-email-outbox-observability`,
  `chore/rules-and-specs-overhaul`, `docs/adr-0047-cross-module-topology`, `feat/backlog-residual-sdd`,
  `feat/devops-foundation`, `feat/http-contract-detail-contractor`, `feat/pipeline-wave-override`.
- Issue [#131](https://github.com/ERP-Bem-Comum/core-api/issues/131) — observabilidade do outbox de e-mail (OPEN).
- [ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md) · [ADR-0015](../architecture/adr/0015-mysql-outbox-pattern.md) · [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) · [ADR-0032](../architecture/adr/0032-transient-http-composition-read-until-bff.md) — estendidos pela tese T3.
- [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) — roadmap tsgo que origina a restrição de libc em T5a.
- [Inquiry-0023](./0023-typescript-7-native-spike.md) · [Inquiry-0024](./0024-adr-format-for-llm-agents.md) — antecedentes do diagnóstico de harness (T6).
- Vernon, Vaughn. *Implementing Domain-Driven Design*, p.382 e p.464 — base canônica de T3.
- Caso de domínio de T4a: contrato **CT 0776/2026**, fim de vigência 2026-06-10.
