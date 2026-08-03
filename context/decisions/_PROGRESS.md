# Progresso da extração dos registros de decisão

Estado da destilação dos ADRs para `context/decisions/*.yaml`. Contrato do formato em
[`SCHEMA.md`](./SCHEMA.md). Gate em [`tests/decisions/decision-records.test.ts`](../../tests/decisions/decision-records.test.ts).

**Extração CONCLUÍDA em 2026-07-31** — 55 de 55, sem lacuna e sem registro órfão. O que vem a seguir
não é mais extração: é o **gate humano** da Fase 1 da [spec 040](../../specs/040-rules-match-code-reality/plan.md),
em que o dono do repo revisa os vereditos e promove alegação a `rule.status: accepted`. Nenhuma das 293
foi promovida — por desenho (`SCHEMA.md` §2/§3).

**Como retomar (se voltar a extrair):** ler `SCHEMA.md`, olhar a tabela abaixo, e seguir o checklist.
Rodar o gate ao fim de cada lote.

**Continuação do trabalho (2026-07-31, tarde) — o hardening de `.claude/`:**
o inventário virou insumo de uma auditoria do harness. Dois documentos novos, nenhuma decisão tomada:

- [`context/HARNESS-AUDIT-2026-07-31.md`](../HARNESS-AUDIT-2026-07-31.md) — auditoria das 12 rules
  (169 afirmações: 11 falsas, 31 imprecisas, 20 órfãs, 23 redundantes), dos 15 agentes (12 mentem sobre o
  projeto) e das 44 skills (9 sem substrato). Inclui a linha do tempo de maturidade e as **10 decisões
  pendentes**, com as 4 opções da Decisão 1 já levantadas.
- [`handbook/inquiries/0024-adr-format-for-llm-agents.md`](../../handbook/inquiries/0024-adr-format-for-llm-agents.md)
  — pesquisa sobre como ADRs estão sendo usados como contexto de agente. Reformula a pergunta do
  hardening: o campo convergiu numa **separação de artefatos**, não numa hierarquia de autoridade.

**Lacuna deste inventário achada pela auditoria:** `ADR-0041.prior_art.applied_to` deveria incluir
`.claude/rules/jobs-and-workers.md`, e `ADR-0045`/`ADR-0051` deveriam incluir
`.claude/rules/financial-module.md` — a `adr-rules-distillation.md:388-389` declara essa linhagem e eu
registrei só `adapters.md`.

---

## Estado

|                         |                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADRs no disco           | 55 arquivos · **cobertura 55/55**, sem lacuna e sem registro órfão                                                                                                                  |
| Extraídos               | **55 de 55 — COMPLETO** (`0001`–`0056`; `0016` reservado e nunca escrito)                                                                                                           |
| Alegações registradas   | **293** — 285 `proposed`, 8 `pending`; **nenhuma promovida**                                                                                                                        |
| Realidade               | 158 `holds` · 56 `partial` · 34 `unverified` · 21 `contradicted` · 21 `absent` · 3 `exercised` — revisado no cruzamento com a `.pipeline/`                                          |
| Testabilidade           | 235 `testable` · 30 `testable-with-work` · 15 `not-applicable` · 13 `unfalsifiable`                                                                                                 |
| Disposição sugerida     | 164 `adopt` · 58 `drop` · 43 `narrow` · 20 `replace`                                                                                                                                |
| Supersessão parcial     | 8 alegações em 5 documentos — `0024` (4, pelo `0055`), `0002` (1, pelo `0009`), `0012` (1, pelo `0029`), `0025` (1, pelo `0033`), `0031` (1, pelo `0035`); os cinco seguem vigentes |
| `realized` sem ressalva | **15** ADRs — `0013`, `0023`, `0027`, `0029`, `0030`, `0032`, `0035`, `0037`, `0038`, `0039`, `0040`, `0043`, `0045`, `0052`, `0054`                                                |
| Já com enforcement      | **43** alegações                                                                                                                                                                    |
| Gate                    | **4964** asserções, verde em `722b0371`                                                                                                                                             |
| Versionado              | **não** — nada deste trabalho está commitado (decisão de 2026-07-31)                                                                                                                |

---

## Decisões tomadas em 2026-07-31

| Questão                | Decisão                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relação com a spec 039 | **Absorver os vereditos** — a 039 entra como `prior_art` citado; este inventário acrescenta `reality` + `testability` + `enforced_by`, que é o que ela não fez |
| Colisão do `ADR-0034`  | **Renumerado** — o de OCR virou [`ADR-0056`](../../handbook/architecture/adr/0056-ocr-port-adapter.md), com `Status` corrigido para `Superseded by ADR-0050`   |
| `ADR-0016`             | **Deixar reservado**, apenas registrar o vínculo com a alegação que ele bloqueia (`ADR-0020-C9`)                                                               |
| Commit                 | **Não commitar ainda** — segue sem rede até haver mais lotes prontos                                                                                           |

### O que a absorção da 039 significa na prática

A [destilação da 039](../../specs/039-claude-native-harness/adr-rules-distillation.md) já julgou os 54
ADRs (10 inelegíveis por status, 44 com veredito: 30 "gera regra", 10 "já coberto", 4 "não gera") e
**criou as 12 rules atuais**. Não se re-deriva nada disso — cita-se em `prior_art`, com o `applied_to`
verificado pelo gate.

Os três testes da 039 perguntam se o aprendizado é acionável, se já é mecânico e se cabe em
referência. **Nenhum pergunta se a afirmação do ADR é verdade no código** — por isso a spec 040
existe, e é essa a lacuna que este inventário fecha.

Duas falhas concretas da 039, já registradas nos dois ADRs extraídos:

- **Não olhou `.semgrep/`.** O Teste B enumerava "eslint/tsc/hook/CI"; o gate `.semgrep/rules.yml`
  existe desde 2026-07-23 (#548) e cobre duas proibições do `ADR-0020`. A 039 (2026-07-31) não
  menciona semgrep em nenhum ponto, e `adapters.md:27` reescreveu como texto o que já era barrado por AST.
- **Vereditos sem confronto com `src/`.** O caso do `ADR-0026` é o exemplo: o `adapters.md:44` chegou
  mais perto do certo que o próprio ADR, mas provou o "não implementado" com um `grep createPool`
  que devolve 7+ ocorrências.

### A colisão do `0034` era uma de quatro

`context/SESSION-2026-07-31.md:101` registra que essa era a **quarta** colisão de numeração do
repositório, e nomeia outra ainda aberta: a branch `docs/adr-0047-cross-module-topology` propõe um
`0047` que já existe (`0047-transactional-email-via-producer-domain-event`). Essa não bloqueia a
extração — vive em branch, não na árvore — mas a chave `ADR-NNNN` deste formato só permanece única
enquanto ninguém repetir o padrão.

**Candidato a gate:** teste que falhe se dois arquivos de `handbook/architecture/adr/`
compartilharem prefixo numérico. Quatro reincidências é padrão, não acidente — e é barato de barrar.

**Atualização (2026-08-03): RESOLVIDO.** A colisão de `inquiries/0011` foi desfeita renumerando a
watchlist para [`0025`](../../handbook/inquiries/0025-typedarrays-immutability-tc39-watchlist.md) —
quem estava no índice manteve o número, mesmo critério do `ADR-0034`. O gate proposto abaixo existe:
`tests/cleanup/handbook-numbering.test.ts` barra colisão de prefixo em `adr/` e `inquiries/` e compara
disco × índice dos ADRs. Registro original do achado, preservado:

**Atualização (lote 5): a doença não é só dos ADRs.** `handbook/inquiries/0011` estava **duplicado** —
`0011-auditoria-fiscal-cross-periodo.md` (no índice) e `0011-typedarrays-immutability-tc39-watchlist.md`
(fora dele). Mesma mecânica do `ADR-0034`: arquivo posterior pegou número ocupado e nunca entrou no
índice. São agora **duas colisões confirmadas no handbook** mais uma em branch (`ADR-0047`). O gate
proposto deve cobrir `handbook/inquiries/` também, e comparar disco × índice nos dois diretórios.

---

## Ordem dos lotes

Cadeias de supersessão primeiro: um ADR superseded só faz sentido lido em par com quem o substituiu.

| Lote   | ADRs                                             | Por quê                                                                                  |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| ~~1~~  | ~~`0003`+`0014`, `0004`+`0015`~~                 | **CONCLUÍDO** — isolamento de database e outbox                                          |
| ~~2~~  | ~~`0024`+`0055`~~                                | **CONCLUÍDO** — supersessão parcial; 4 de 11 alegações do `0024` superseded              |
| ~~3~~  | ~~`0007`+`0021`, `0018`~~                        | **CONCLUÍDO** — topologia cloud; `0018` fechou a cadeia do `0020`                        |
| ~~4~~  | ~~`0056`+`0050`~~                                | **CONCLUÍDO** — o `0050` é o ADR mais bem implementado do inventário                     |
| ~~5~~  | ~~`0001`, `0002`, `0005`, `0006`, `0009`~~       | **CONCLUÍDO** — fundacionais; ver o achado da fronteira sem rede no `ADR-0006-C4`        |
| ~~6~~  | ~~`0008`, `0010`–`0013`, `0017`, `0019`~~        | **CONCLUÍDO** — integrações e infra; ver a contradição de mesma data no `ADR-0008`       |
| ~~7a~~ | ~~`0025`, `0027`, `0028`, `0032`, `0033`~~       | **CONCLUÍDO** — cluster de borda HTTP; verificado contra a `http-edge.md` que os destila |
| ~~7b~~ | ~~`0022`, `0023`, `0029`, `0030`~~               | **CONCLUÍDO** — read-models, ciclo de vida, pnpm 11, Valkey                              |
| ~~8a~~ | ~~`0031`, `0035`, `0036`, `0043`, `0046`~~       | **CONCLUÍDO** — partners; o `0043` tem o melhor mecanismo de contrato do acervo          |
| ~~8b~~ | ~~`0044`, `0045`, `0047`, `0048`, `0051`~~       | **CONCLUÍDO** — financial e taxonomia; o `0047` tem o melhor follow-through do acervo    |
| ~~8c~~ | ~~`0034`, `0037`–`0042`, `0049`, `0052`–`0054`~~ | **CONCLUÍDO** — processo, RBAC, deploy e política de IA; fecha o inventário              |

---

## Cruzamento com a `.claude/.pipeline/` (2026-07-31)

Terceiro plano da auditoria: o ADR diz (`declared`), o código faz (`reality`), e a `.pipeline/` mostra
**o que foi efetivamente trabalhado**. 549 tickets, 482 com `000-request.md`, 463 `closed-green`, 21
`open`, 3 `in-progress`, 3 `superseded`.

### O que a comparação PROVOU

- **86 de 86 tickets citados nos registros existem.** Todos os nomes que eu havia mencionado em
  `provenance.note` sem ler conferem no disco. Dois eram invenção e foram corrigidos:
  `PARTNERS-SUPPLIER-OUTBOX` (ADR-0043 — não existe; os reais são `PAR-SUPPLIER-EVENTS`,
  `PAR-OUTBOX-INFRA`, `WORKER-SUPPLIER-PROJECTION`) e `CTR-DOCKERFILE-MYSQL` (ADR-0020 — já estava
  marcado como "verificar"; confirmado inexistente).
- **`provenance.tickets` preenchido em 33 dos 55 registros, 104 vínculos** — o campo existia vazio por
  desenho desde o início.
- **52 dos 55 ADRs são citados por pelo menos um ticket.** Os mais citados: `0006` (71), `0020` (62),
  `0014` (50), `0031` (26), `0024` (20).

### O que a comparação REFUTOU

- A hipótese agregada "o que tem ticket acontece" (ver tabela na seção de achados) — **contagem de
  tickets não prediz aderência**, e é levemente inversa.
- Dois vereditos meus, ambos por **busca mal-formada**, ambos flagrados pelo NOME de um ticket:
  1. **`ADR-0041-C4`** (`holds` → `exercised`): `CTR-SWEEPER-JOB-LOCK` fechou **um dia depois** do ADR e
     implementou a coordenação multi-instância pela opção B (`ctr_job_runs` + `INSERT IGNORE`). Meu grep
     usou o vocabulário do ADR (`GET_LOCK`, `job_executions`) e a implementação usou o outro nome.
  2. **`ADR-0048-C7`** (`absent` → `partial`): 4 dos 5 endpoints de dashboard existem. Eu procurei um
     MÓDULO chamado `dashboard`; o ADR escrevia `…/dashboard/kpis` com o prefixo elidido.
- Um achado consolidado ("mapa de tradução se implementa melhor que endpoint") caiu junto com o
  veredito 2.

### Varredura das 21 alegações `absent`: existe ticket para o item?

Feita depois das duas correções de veredito, para saber se as ausências restantes são drift ou fila.
**Resultado: 19 confirmadas sem nenhum ticket, 1 com evidência corrigida, 1 não-acionável. Zero
vereditos novos invertidos.**

| alegação                     | item                              | ticket para o item                                                              |
| ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `0006-C7`                    | `core.audit_log` no Shared Kernel | **nenhum** (`BGP-UPDATED-BY-AUDIT` é coluna `updated_by`, outro assunto)        |
| `0008-C1`                    | `BradescoRestAdapter` + CNAB      | **nenhum** — e a decisão mudou fora do ADR (cliente exige VAN/CNAB)             |
| `0009-C3`                    | `tsgo --noEmit` paralelo no CI    | **nenhum**                                                                      |
| `0011-C6`                    | permission model do Node          | **nenhum**                                                                      |
| `0017-C2`                    | `idx_correlacao_legado`           | **nenhum** (os três `LEGACY-ID` são coluna `legacy_id`, não o índice composto)  |
| `0021-C5`                    | pipeline de release PBE→AWS       | **nenhum**                                                                      |
| `0021-C6`                    | "PBE não exercita 100%"           | — observação, não acionável                                                     |
| `0022-C6`                    | projeção de AuditLog              | **nenhum** (diferido por identidade/RBAC)                                       |
| `0030-C2`                    | Valkey                            | **nenhum** (diferido)                                                           |
| `0042-C4`                    | 2º auditor independente (D2)      | **nenhum** para o item; `DEADMAN-AUDIT-FALSE-FIRED` (in-progress) é o adjacente |
| `0044-C5`                    | as 6 descrições "14 dígitos"      | **nenhum** — o MECANISMO tem (`CORE-CNPJ-ALPHANUMERIC`, tocou só o VO)          |
| `0053-C1`                    | classe de permissão sensível      | rejeitado — mas a evidência estava incompleta (ver abaixo)                      |
| `0053-C2` `0053-C3`          | lista no catálogo · precedente    | rejeitado, coerente                                                             |
| `0055-C1,C3,C4,C5,C6,C8,C10` | Cognito (7 alegações)             | **nenhum implementa**; `AUTH-JWT-KEY-BOOT-GUARD` é pré-requisito, épico #603    |

Três coisas que a varredura acrescentou:

- **`ADR-0044-C5` é o contraexemplo limpo da hipótese de item.** `CORE-CNPJ-ALPHANUMERIC` (closed-green)
  tocou **somente** `src/shared/kernel/cnpj.ts` — e o W1 registra até a limpeza da referência stale a
  `tax-id.ts`, confirmando meu achado. As seis descrições de borda não estavam no escopo e não têm ticket
  próprio. **Ticket para o mecanismo não arrasta a consequência declarada.**
- **`ADR-0055` é ausência por fase não iniciada, com pré-requisito entregue.**
  `AUTH-JWT-KEY-BOOT-GUARD:4` declara "Bloqueia: Fase 3 do ADR-0055 (cutover do Cognito) · Épico: #603".
  Sete alegações `absent` que são fila, não drift.
- **`ADR-0053-C1`: a permissão sensível não ficou órfã — foi gate e foi REBAIXADA.** Ver a correção
  detalhada no registro. `REPORTS-DEMOGRAPHICS-GATE-ALIGN` (closed-green) desceu o gate de
  `/reports/team/demographics` para `collaborator:read` porque **"a tabela mostra mais e exige menos"**:
  `GET /reports/team` serve linha por pessoa COM NOME, raça, gênero e idade sob `collaborator:read`,
  enquanto os gráficos, que mostram só contagens sem ninguém identificável, exigiam
  `collaborator:read-sensitive`. O gate dedicado protegia o dado **menos** sensível dos dois.

### O que a comparação ENSINOU sobre o método

- **A armadilha nº 6 e nº 7 de grep ingênuo do inventário, e as duas primeiras que inverteram um
  veredito.** As cinco anteriores foram falso-negativos que eu peguei antes de registrar. Estas duas
  passaram porque a busca herdou o vocabulário do documento auditado — o ADR nomeia `GET_LOCK` e
  `ctr_job_executions`, a implementação escolheu a outra opção; o ADR escreve `…/dashboard/`, eu li como
  módulo. **Buscar pelos termos do ADR confirma o ADR, não a realidade.**
- **Anotação de adiamento obsoleta engana ativamente uma auditoria.** Os três comentários que eu havia
  elogiado como "o adiamento melhor executado do inventário"
  (`contract-repository.drizzle.ts:344`, `.in-memory.ts:99`, `domain/contract/repository.ts:71`) dizem
  "fica para F-Plus" e estão stale desde 2026-06-17. Foram eles que me convenceram da ausência. É a
  única classe de comentário desatualizado que afirma ausência onde há implementação.
- **O índice da própria pipeline apodreceu, e com data.** `_METRICS.md` diz "Total: 83 tickets" e foi
  tocado por último em **2026-05-27**; o disco tem 549. É o diagnóstico do `ADR-0040` ("a mesma verdade em
  3 lugares, mantida manualmente") acontecendo dentro do diretório que o ADR queria substituir por
  GitHub Issues.
- **Comentário obsoleto que afirma garantia mais forte que o código: DUAS ocorrências independentes, logo
  é padrão.** A primeira é o `ADR-0041-C4` (três comentários "fica para F-Plus" sobre mecanismo
  implementado). A segunda está em `reports/adapters/http/plugin.ts`, e é pior em espécie: a linha 193 diz
  "Gate dedicado: dado sensível LGPD (Art. 5º II) — `collaborator:read` sozinho não abre (CA7)", a linha
  197 diz "Mesmo gate da tabela (`collaborator:read`), NAO o `readSensitive`", e a 203 executa o gate
  genérico. **Duas afirmações contraditórias a quatro linhas de distância, e a stale promete proteção de
  categoria especial da LGPD que a rota não aplica.** A porta
  (`reports/application/ports/team-demographics-read.ts:8`) também segue desatualizada.
  Candidato direto a regra: comentário que afirma um gate MUST citar o identificador de permissão que a
  rota realmente usa.
- **Existe um QUARTO plano de evidência que este inventário nunca abriu: `handbook/incidents/`.**
  Descoberto pela referência do `CORE-WORKER-CONSOLIDATION-DEPLOY`. O post-mortem
  `0001-prod-rds-connection-exhaustion-2026-07-10.md` documenta **56 de 60 conexões** no RDS de produção,
  severidade Alta, "proximidade de indisponibilidade total", detecção por DBA via `SHOW FULL PROCESSLIST`
  com salto de 14→52, mitigação manual. É a origem exata da reversão de topologia do `ADR-0041` — que eu
  havia inferido de um comentário de código. **Um inventário que confronta ADR × código × ticket ainda
  perde o plano onde as decisões são corrigidas pela realidade operacional.**
- **Um ticket `in-progress` fecha um achado meu com dados que o código não tinha.**
  `DEADMAN-AUDIT-FALSE-FIRED` (issue #368) nomeia as 14 issues de falso-positivo em DUAS ondas — 8
  fechadas em 08/07 e 6 em 28/07 — e localiza **três defeitos** no YAML. Ou seja: disparou, fecharam,
  disparou de novo. Meu registro do `ADR-0042` sabia do sintoma pelo comentário do workflow; não sabia
  que havia reincidência nem ticket ativo.

---

## Achados que atravessam ADRs

Coisas que só aparecem lendo mais de um registro. Nenhuma é decisão tomada — são candidatas.

- **Supersessão perde o raciocínio — mas só nas duas mais antigas.** _(refinado no lote 3.)_ Das
  quatro cadeias extraídas, duas perderam e duas preservaram. Perderam: `0003`→`0014` (o `0014` não
  tem consequências, alternativas nem gatilhos) e `0004`→`0015` (perdeu as três consequências
  negativas do outbox). Preservaram: `0007`→`0021` e `0018`→`0020`, ambos com seção própria de
  consequências, alternativas e gatilhos — e o `0020` chega a herdar os mapeamentos canônicos
  nominalmente ("preservados de ADR-0018").
  As duas que perderam são **as mais antigas, ambas de 2026-04-28, com decider único**. As que
  preservaram são posteriores e têm decisor duplo. Não é regra do formato: é passivo das duas
  primeiras. Candidato mais estreito do que o originalmente proposto: reafirmar ou revogar
  explicitamente negativas e gatilhos ao superseder — e sanear retroativamente só `0014` e `0015`.
- **Gatilho de reavaliação, onde existe, funciona.** Dois dispararam e geraram o sucessor: o `:117`
  do `0024` ("se um IdP corporativo entrar em cena") gerou o `0055`, e o gatilho #1 do `0018`
  ("MySQL gerenciado provisionado e o esforço de manter SQLite ultrapassar o ganho") gerou o `0020`.
  Reforça o item acima: o problema não é o mecanismo, é a ausência dele em `0014` e `0015`.
- **Argumento vivo dentro de documento morto.** A rejeição de TypeORM e Prisma existe SÓ no `0018`
  (superseded), e as consequências negativas de multi-cloud SÓ no `0007` (superseded). Se alguém
  propuser Prisma ou multi-cloud amanhã, o contra-argumento está marcado como morto. `superseded`
  significa "não é mais a norma", nunca "não serve mais para nada".
- **`.claude/rules/*.md` NÃO é enforcement.** Distinção fixada no lote 3: rule é texto que o agente
  lê e pode ignorar; `enforced_by` é mecanismo que barra (teste, semgrep, hook, lint). Rule entra em
  `prior_art.applied_to`, nunca em `enforced_by`. O caso-limite é a `ADR-0021-C2`: a restrição de
  LGPD do PBE está instruída em `supply-chain.md:48` e enforçada por ninguém.
- **Collation sem critério.** `utf8mb4_bin` aparece 160 vezes contra 65 de `utf8mb4_unicode_ci`, e o
  `ADR-0014` só permite a segunda. As duas coexistem sem regra escrita, e JOIN entre collations
  diferentes é erro de runtime no MySQL. Ver `ADR-0014-C8`.
- **Dead-letter em 3 dos 7 outboxes.** `auth`, `budget-plans`, `programs` e `par_email` contam
  tentativas e não têm destino para o evento que esgota. Exigência atravessou duas supersessões
  (`0004`→`0015`) e não chegou inteira. Ver `ADR-0015-C7`.
- **Duas contradições frontais entre fontes normativas.** O `0015` exige `payload JSON` nativo e o
  `0020` proíbe coluna JSON; o `0015` exemplifica eventos em PT e a tabela de idioma do `AGENTS.md`
  fixa EN. Nos dois casos o código segue o certo e o ADR seguiu dizendo o errado.
- **A 039 declara 100% de cobertura e não julga o `ADR-0055`.** A decisão de diretoria mais recente
  (Cognito, 2026-07-29) não aparece em nenhum ponto da destilação commitada em 2026-07-31, e
  **nenhuma das 12 rules menciona Cognito**. A `auth-module.md:9` segue dizendo que a federação "foi
  adiada". É o mesmo defeito que a própria 039 documentou para o `ADR-0012`. A contagem dela (54)
  bate com a numeração, não com o diretório — sinal de lista montada uma vez e nunca reconciliada.
  Candidato a gate: teste que compare o índice do README com os arquivos no disco.
- **Norma superseded que ainda governa o código é estado legítimo.** As 4 alegações substituídas do
  `0024` ficaram `narrow`/`replace`, não `drop`, porque o corte do `0055` não começou —
  `external_subject` e `aws-jwt-verify` não existem. `drop` diria ao agente que o código atual está
  errado, o que é falso. Só um formato com "declarado × realidade × regra" expressa isso.
- **O que já é mecânico não estava sendo reconhecido.** 7 das 69 alegações têm enforcement
  (semgrep, suíte de cleanup, e2e com `readonly_bi` SELECT-only) e nenhuma delas era citada como
  coberta pela destilação anterior.
- **Citar o ADR no ponto onde ele morde é o que faz verificação custar um grep.** _(lote 4.)_ O
  `ADR-0050` é o mais bem implementado do inventário e não por acaso: o código o referencia
  exatamente onde a decisão pega — `document-reader.ts:5` ("Recebe BYTES, nunca URL (ADR-0050,
  anti-SSRF)"), `cascade.ts:8` e `:39`, `types.ts:2` ("MINIMIZADO (LGPD)"). Onde a citação existe,
  confirmar a alegação levou segundos; onde não existe, levou várias buscas. Candidato: exigir
  referência ao registro de decisão no ponto de aplicação, não no topo do arquivo.
- **Permissão condicional cuja condição foi satisfeita sem ninguém registrar.** _(nova classe de
  drift, lote 4.)_ O `ADR-0050` autoriza `unpdf` "só se o in-house não bater a métrica 12/12 no W0".
  O `unpdf` está instalado, é o fallback ativo do cascade, e a métrica de fato não bate — três
  fixtures fiscais reais marcadas `todo` do #388. A condição foi cumprida **de fato e não de
  direito**: em lugar algum está escrito "a métrica não foi batida, o fallback entrou". Permissão
  condicional sem registro de ativação vira permissão simples por decurso — e a dependência já
  vazou para um segundo caminho (parser de extrato bancário) que este ADR não cobre.
- **A doutrina viva aponta em massa para um ADR superseded.** _(lote 6.)_ **~18 arquivos** citam o
  `ADR-0012` como normativo — `AGENTS.md` (na seção `IMPORTANTE`, a primeira coisa que um agente lê),
  `README.md`, `docs/`, 3 agentes, 2 hooks, 3 skills, a constitution — contra **2** que citam o
  `ADR-0029` vigente. O conteúdo do `0029` ESTÁ aplicado, então não há violação de norma: o defeito é
  puramente de REFERÊNCIA, e é a forma mais silenciosa de drift. Pendência aberta desde a spec 039.
- **Contradição entre dois documentos vigentes da MESMA data.** _(lote 6.)_ O `ADR-0021` (2026-05-22)
  afirma que "a VM Windows com STCPCLT fica confirmada em AWS"; o
  `context/planning/BRADESCO-EVITAR-WINDOWS.md:4`, também de 2026-05-22, registra que a P.O. consultou
  o gerente do banco e **não há trilho que exija Windows**. O `ADR-0008` segue `Accepted` com "VAN via
  Windows VM" **no título**. Nenhum dos três é `Proposed`. Classe pior que status desatualizado: o
  título propaga o erro em toda citação.
- **`Proposed` com prazo que venceu, e o assunto decidido no código.** _(lote 6.)_ O `ADR-0017` exige
  três chaves de correlação e declara que "a janela se fecha quando o desenho do schema de
  `core.fin_documentos` começar". O schema existe com UMA das três — e o comentário em
  `financial/schemas/mysql.ts:167` decide o contrário do ADR, com razão escrita: "a correlação é por
  `legacy_id`, nunca por `document_number`". A decisão existe, está fundamentada, e vive num comentário
  de schema. O ADR nunca foi promovido nem rejeitado.
  Fecha o par com o `ADR-0007`: dos quatro `Proposed` do acervo, o único que funcionou tinha
  **checklist explícita de promoção**. `Proposed` sem critério vira limbo; com prazo, vira perda.
- **Regra sem critério não é cumprida.** _(lote 6.)_ O `ADR-0011` manda pinar "deps críticas" e nunca
  definiu o que é crítica. Resultado: `mysql2` (driver de banco), `@aws-sdk/client-s3` (cliente único
  de storage por `ADR-0019`) e `nodemailer` (adapter de e-mail por `ADR-0010`) entraram **sem pin**,
  enquanto `fastify` e `drizzle-orm` foram pinadas. A regra proposta define por FUNÇÃO, não por nome,
  para não envelhecer a cada dependência nova.
- **O banner do `ADR-0012` é o modelo de supersessão a copiar.** _(lote 6.)_ Faz três coisas que
  nenhum outro superseded do acervo faz juntas: declara o que PERMANECE válido, aponta o sucessor com
  link, e marca qual seção específica está desatualizada. Candidato a exigência do template — e o
  contraste com o `ADR-0056`, que passou dois meses `Accepted` sem aviso nenhum, é o argumento.
- **Read-model completo e sem persistência.** _(nova classe, lote 7b.)_ A Timeline de contrato do
  `ADR-0022` tem domínio, projetor, use case e DTO de borda — e o único adapter do `TimelineRepository`
  é in-memory. **Não é "não implementada": é implementada e volátil.** A rota responde, a trilha
  aparece, e o dado morre no restart. Pior que ausência, porque ausência é visível e isto passa por
  pronto — e a invariante de reconstrutibilidade do mesmo ADR não se aplica a algo que nunca foi
  gravado. Ver `ADR-0022-C5`.
- **O padrão dos quatro `Proposed` fecha.** _(lote 7b.)_ O `0007` tinha **checklist de promoção** e
  virou o `0021`. O `0030` tem **gatilho + âncora no código** (`app.ts:126` cita o ADR e nomeia o
  sucessor) e o adiamento está cumprido — é o único `Proposed` com veredito `realized`. O `0017` tinha
  **prazo sem critério de promoção**: o prazo venceu e a decisão foi tomada num comentário de schema,
  sem promover nem rejeitar o ADR. `Proposed` funciona quando traz o critério de saída; sem ele vira
  limbo, e com prazo vira perda.
- **Três alegações apontam para o MESMO gate de deploy inexistente.** _(lote 7b.)_ `ADR-0030-C3`
  (2ª réplica exige store compartilhado), `ADR-0021-C5` (promoção PBE→produção sem pipeline) e
  `ADR-0055-C12` (guard distribuído antes da 2ª réplica). Nenhuma é verificável em revisão de código;
  todas seriam num gate de pipeline de deploy. É a lacuna de enforcement mais concentrada do acervo —
  e a única onde o conserto é um mecanismo, não três regras.
- **Contrato de integração tipado é o melhor mecanismo do acervo.** _(lote 8a.)_ O `ADR-0043` separa
  "evento de domínio" de "mensagem de contrato" com um TIPO —
  `supplier-outbox.mapper.ts:20` declara `type PublishableEventType = 'SupplierRegistered' |
'SupplierEdited'`. O domínio emite quatro eventos de supplier; dois atravessam a fronteira, e
  acrescentar um quinto ao domínio **não o publica por acidente** porque o compilador cobra. É o único
  caso do inventário em que uma norma de fronteira é enforçada pelo type system sem nenhum arquivo de
  regra — comparar com o `ADR-0006-C4`, cuja fronteira tem 100% de adesão e zero proteção mecânica.
- **A regra de evolução aditiva foi exercida e funcionou.** _(lote 8a.)_ O `ADR-0043` diz que campo
  novo nunca quebra o v1; o `ADR-0046` é a prova — `outbox.mapper.ts:389` faz
  `JSON.stringify({ ...base, contractorRef })`, spread aditivo, sem bump de `schema_version` e sem
  tocar um evento de domínio. Barato porque o ponto de montagem é o **adapter**, não o domínio: é a
  versão de escrita do que o `ADR-0032` faz na leitura. Mas o ADR só enuncia metade da regra — não diz
  o que **exige** bump, e por omissão "não bumpar" pode ser lido como "nunca bumpar".
- **Escopo que cresce no item que o ADR excluiu nominalmente.** _(nova classe, lote 8a.)_ O `ADR-0036`
  lista "eventos de domínio" entre o que fica **fora do escopo até as regras reais**, e
  `partners/domain/act/events.ts` existe com quatro eventos; `act-number.ts` também está fora dos 7
  campos que ele enumera. É o inverso do padrão comum daqui — em vez de algo dentro do escopo não
  sair, algo explicitamente fora foi construído. Agrava por o ADR ser **provisório**: cada campo e
  evento acrescentado antes das regras de negócio é uma regra decidida por omissão.
- **Duas direções fechadas por uma invariante só.** _(lote 8a.)_ A `ADR-0032-C2` impede `contracts` de
  tocar `par_*` e a `ADR-0046-C2` impede `partners` de tocar `ctr_*`. Duas decisões independentes,
  escritas com quinze dias de diferença, convergindo na mesma regra geral — sinal de que a proibição é
  estrutural e não caso a caso. A redação já proposta na `ADR-0032-C2` cobre as duas.
- **Convenção de nome de constraint padroniza-se sozinha até não padronizar.** _(lote 8a.)_ Seis
  tabelas `par_*` têm o CHECK de coerência do soft-delete; cinco se chamam
  `*_active_consistency_chk` e a de collaborators, `par_collaborators_soft_delete_chk`. O
  **constraint** existe em todas; a **convenção**, não. Custou uma varredura errada: procurar só pelo
  sufixo majoritário concluiu que `par_collaborators` não tinha soft-delete. Tinha, com outro nome —
  quinta armadilha de grep ingênuo do inventário.
- **Achados do lote 8c — processo, RBAC e deploy.** _(último lote.)_
  - **Um ADR afirmou como fato uma atualização que não fez.** O `ADR-0034` (Bruno) diz na seção de
    referências "§Status atualizado: SUPORTE → ADOTADO" a respeito do agente; hoje
    `.claude/agents/bruno-api-client-expert.md` diz "Status: suporte (sem ADR de adoção)" em cinco pontos
    (`:18`, `:30`, `:63`, `:250`, `:276`) e o `AGENTS.md:117` repete "**suporte, sem ADR**". Três dias
    depois, o `ADR-0037` fez a mesma classe de tarefa e a doutrina acompanhou (`AGENTS.md:132` e `:169`
    citam o ADR pelo número). Classe nova: **ADR que declara feito o que não foi.**
  - **Aderência de 100% em 266 arquivos, sem nenhum mecanismo.** Nenhum `.bru` começa com `#`
    (`ADR-0038-C5`). Teste de seis linhas, aderência já total, e a falha atual é um `Expected end of input`
    que não diz qual arquivo. Melhor custo-benefício de enforcement do inventário.
  - **Contradição dentro de um único arquivo.** `scripts/e2e/bruno-all.sh:8` diz que `z-pending-fixes`
    "NÃO bloqueia" e `:99` diz "deve PASSAR após os 5 fixes". Os fixes entraram, a pasta virou suíte de
    regressão e o rótulo ficou — uma suíte cujo vermelho, por rótulo, ninguém precisa tratar.
  - **A topologia do `ADR-0041` foi revertida por limite de conexões.** Ele pede "um entrypoint por
    responsabilidade" (Parnas); `src/workers/runner/run.ts:3` agrupa em três por `WORKER_GROUP`,
    "cortando tasks Fargate e pools contra o RDS". O isolamento LÓGICO sobrevive; caiu a inferência de que
    isolamento lógico exige processo próprio. **Decisão certa na razão, errada na unidade** — e a correção
    veio de produção, não de revisão de arquitetura.
  - **O detector de ausência já falhou aberto.** `deadman-audit.yml:78` registra que "o bash inline que
    decidia isso gerou 14 issues `sem sinal há 0h`". A lógica segue inline num workflow de 172 linhas, sem
    `scripts/deadman/` — bug conhecido, documentado no lugar certo, em código não testável na forma atual.
    E a D2 (2º auditor) segue `absent`: quem decide "está morto" é um provedor só, que também provê o
    keep-alive contra a suspensão de 60 dias.
  - **"Redundância na ingestão não é redundância na decisão"** (`ADR-0042` D2) e **"o RBAC parecia ter
    ponto único e tinha cinco"** (`ADR-0052-C3`, quatro `authorize` embutidos fora do wrapper) são a mesma
    lição em domínios diferentes: ponto único é hipótese a verificar, não propriedade a assumir.
  - **O invariante mais explícito do `ADR-0049` está violado no módulo que ele designou como rigoroso.**
    Invariante 2 proíbe formatação de apresentação no core; `budget-plans/adapters/http/budget-plan-csv.ts:39`
    faz `toLocaleString('pt-BR', { currency: 'BRL' })` e `plugin.ts:149` serve como `text/csv`. E o §Rollout
    diz "aplicar a régua rigorosamente a budget-plans". O descarte da 039 por status (`Proposed`) deixou de
    fora um ADR com seção intitulada "Invariantes (normativo)" — sete cláusulas MUST/MUST NOT, uma delas
    violada e detectável por um grep. **É o argumento mais concreto do inventário para a tese da spec 040.**
  - **O único `Rejected` do acervo é exemplar como artefato.** O `ADR-0053` manteve o argumento íntegro e
    ganhou §Desfecho com data, autoria, justificativa em quatro pontos e gatilhos — declarando o propósito:
    "para que a exposição de dado sensível no período seja rastreável como **escolha informada, não como
    descuido**". Ele até antecipou a própria rejeição como alternativa nomeada. Sobra a registrar:
    `collaborator:read-sensitive` ficou no catálogo (`permission-catalog.ts:33`) sem a classe que o
    protegeria — permissão com nome de sensível e sem proteção extra.
  - **Guarda protegida contra o próprio apagamento.** `rbac-mode.ts:14`: "um refactor que apague o
    `stderr.write` no server.ts não pode passar sem um teste vermelho". Único caso do inventário em que um
    mecanismo de AVISO tem teste próprio — e o raciocínio é exato, porque aviso sem teste é removível por
    qualquer limpeza de log, e aí o modo degradado volta a ser silencioso.
  - **Gate honesto sobre o indecidível.** `commit-policy.yml` (`ADR-0054`) separa o que dá para provar do
    que precisa ser declarado: FORMATO do `Assisted-by` é cobrado em todo PR; COMPLETUDE, só quando o PR se
    declara assistido pela label. Compare com `ADR-0038-C2` ("`.bru` executado antes do commit"), mesmo
    problema sem essa saída — ficou `unfalsifiable`.
  - **Três acoplamentos documentais à nomenclatura W0→W3**, todos inofensivos hoje e todos apontando para
    um processo em saída (spec 038): a DoD do template de issue (`ADR-0040`), o §3 do `ADR-0054` e o
    §Guardas do mesmo. E dois ADRs da mesma semana (`0040`, `0041`) com header `Accepted` e seção
    "## Decisão (proposta)" — molde copiado de um para o outro.
- **A FORMA VERBAL prediz a realização melhor que a importância do conteúdo.** _(consolidado ao fim da
  extração — o padrão mais forte do inventário, confirmado em 5 casos.)_ O que é escrito como
  **invariante** se cumpre; o que é escrito como **recomendação, consequência ou gatilho** não. Casos:
  `ADR-0017` (`Proposed` com prazo e sem critério de promoção — prazo venceu, decisão foi tomada num
  comentário de schema); `ADR-0044` (consequência com gatilho que JÁ disparou — o CNPJ alfanumérico
  circula desde 07/2026 e seis descrições de borda dizem "14 dígitos"); `ADR-0047` §5 (todas as
  invariantes cumpridas — atomicidade, anti-enumeração, não logar payload — e a única recomendação, "TTL
  curto e expurgo pós-processamento", não existe em nenhum ponto do repo); `ADR-0034` (dois gatilhos de
  saída da exceção de `trustPolicyExclude`, nenhum observado); `ADR-0053` (gatilho relativo — "se a janela
  se estender além do previsto" — e o previsto não está escrito, com dado pessoal sensível exposto na
  janela). **Implicação para a fase de regras:** o que precisa ser cobrado deve ser escrito como MUST com
  âncora no código, nunca como consequência ou recomendação.
- **⚠️ HIPÓTESE REFUTADA no agregado (2026-07-31, cruzamento com a `.pipeline/`).** Testei "o que tem
  ticket acontece" contra os 549 tickets, medindo aderência por alegação × número de tickets que citam o
  ADR no `000-request.md`:

  | tickets citando o ADR | ADRs | `realized` | alegações | aderência |
  | --------------------- | ---: | ---------: | --------: | --------: |
  | 0                     |    3 |          2 |         9 |   **78%** |
  | 1–2                   |   19 |          8 |       102 |       54% |
  | 3–9                   |   17 |          2 |        80 |       59% |
  | 10+                   |   16 |          3 |       102 |   **51%** |

  A correlação é **levemente inversa**, e os dois ADRs com ZERO tickets citando-os (`0035`, `0054`) são
  ambos `realized`. Explicação plausível: os ADRs mais citados são os fundacionais transversais (`0006` com
  71 tickets, `0020` com 62, `0014` com 50), que têm mais alegações e superfície mais ampla — mais
  oportunidade de ficar parcialmente cumprido. **Contagem de tickets não prediz aderência.**
  A versão de ITEM da hipótese (abaixo) segue de pé, mas com um contraexemplo: o `ADR-0044-C5` tem ticket
  (`CORE-CNPJ-ALPHANUMERIC`, closed-green) e a consequência das seis descrições "14 dígitos" segue
  não-feita — ticket para o mecanismo não arrasta a consequência declarada.

- **O que tem TICKET acontece; o que depende de disciplina, não.** _(no nível do ITEM — 4 casos, 1
  contraexemplo.)_ O
  `ADR-0047` é o melhor follow-through do acervo e é o único com **tabela de fatiamento** (tickets
  nomeados, escopo por módulo) — `AUTH-DOMAIN-OUTBOX` aparece literalmente em `mysql.ts:354`. O
  `ADR-0037` concluiu a única remoção faseada que terminou, e tem ticket citado no `AGENTS.md:169`
  (`CLI-RETIRE-EMBEDDED`). No `ADR-0049`, os módulos FORA da lista de "rollout rigoroso" implementaram o
  contrato (batch-by-id nasceu dos cards #350/#357/#358) e `budget-plans`, o alvo rigoroso, é o único que
  viola o invariante 2. E os dois itens declarados abertos que foram fechados — HMAC do `ADR-0042` e
  check do `Assisted-by` (`ADR-0054`) — vieram de ticket posterior (#549), não de lembrança.
- **Adiamento com ÂNCORA NO CÓDIGO se cumpre; adiamento que mora só no ADR, não.** _(consolidado.)_ O
  `ADR-0030` cita o sucessor em `app.ts:126` e é o único `Proposed` com veredito `realized`. Em contraste,
  os adiamentos sem âncora (gatilhos de saída do `ADR-0034`, expurgo de outbox do `ADR-0047` §5) não foram
  feitos nem revisados.
  **Corolário aprendido na comparação com a `.pipeline/` (ver abaixo):** a âncora tem de ser **removida
  quando o adiamento termina**. O `ADR-0041-C4` tinha as três melhores âncoras do acervo e o mecanismo foi
  implementado no dia seguinte por outro caminho — as âncoras ficaram, e me fizeram registrar `holds` numa
  ausência que não existe.
- **Citar o ADR no ponto de aplicação torna auditoria um grep.** _(consolidado — 9 casos.)_ `0020`,
  `0027`, `0032`, `0039`, `0041`, `0043`, `0046`, `0049` e `0050` têm a referência dentro do código que
  os cumpre. **Todos de junho ou depois; nenhum dos fundacionais de abril.** A prática apareceu sozinha e
  nunca foi normatizada — é a candidata a regra com o menor custo de adoção de todo o inventário.
- **Decisão `Accepted` construída sobre uma `Proposed`.** _(nova classe, lote 8b.)_ O `ADR-0051`
  (Accepted, 2026-07-15) declara "§D1 segue válido" e "este ADR **não reabre** essa decisão" a respeito
  do `ADR-0048`, que segue `Proposed` / "aguardando ratificação" desde 2026-06-23. É ratificação **por
  referência**, sem tocar o documento ratificado. No código a fronteira é coerente; o que quebra é a
  rastreabilidade — quem abrir o `0048` amanhã não sabe se pode confiar nele. Pior que o limbo do
  `ADR-0017`, porque lá o `Proposed` só envelhecia e aqui ele é **carregado como fundamento**. Gate
  barato: comparar o status de todo ADR citado como vigente. Ver `ADR-0051-C6`.
- **O que é escrito como recomendação não se cumpre.** _(consolidado, lote 8b — terceira confirmação.)_
  Vale para o `Proposed` sem critério de saída (`0017`), para a consequência com prazo (`0044` — seis
  descrições dizem "14 dígitos" e o CNPJ alfanumérico circula desde 07/2026) e agora para a recomendação
  dentro de uma seção de invariantes (`0047` §5 — "TTL curto e expurgo pós-processamento", e não existe
  expurgo de outbox em nenhum ponto do repo). No mesmo `0047`, tudo o que foi escrito como invariante
  (atomicidade, anti-enumeração, não logar payload) está cumprido. **A forma verbal prediz a
  realização** melhor que a importância do conteúdo.
- **Follow-through é o que separa o `0047` de todos os outros.** _(lote 8b.)_ Ele previu um custo alto
  ("o `auth` ainda NÃO tem outbox — é o maior custo desta decisão") e o custo foi pago; planejou uma
  aposentadoria e ela foi executada (`notifications/.../mysql.ts:5` — "foi APOSENTADA"); listou três
  tickets e os nomes aparecem nos comentários do código (`AUTH-DOMAIN-OUTBOX` em `mysql.ts:354`). O que
  o diferencia é estrutural: **é o único do lote com tabela de fatiamento** — tickets nomeados, escopo
  por módulo. Vale como hipótese para a fase de regras: ADR que fatia se implementa.
- **Idempotência do outbox não é idempotência do efeito.** _(lote 8b.)_ O worker genérico de-duplica por
  claim (`SKIP LOCKED`) + `markProcessed` na mesma transação — suficiente no `ADR-0045`, cujo efeito é um
  upsert idempotente. No `ADR-0047` o efeito é um e-mail: se o SMTP aceita e o `markProcessed` falha, a
  linha volta para retry e o e-mail sai duas vezes. O código **reconhece** a janela
  (`outbox-worker.ts:95` escreve em stderr exatamente nesse caso) mas registrar não é prevenir. O
  `ADR-0022-C3` usa tabela de processados; o caminho de e-mail não tem equivalente.
- ~~**Mapa de tradução se implementa melhor que endpoint.**~~ _(lote 8b — **REFUTADO** no cruzamento com a
  `.pipeline/`.)_ Os três mapas de ACL do `ADR-0048` estão no código, um ao pé da letra
  (`payment-position-projection.ts:94`) — isso segue verdade. Mas eu concluí que o D3 "não existe, nem o
  módulo" porque procurei um MÓDULO chamado `dashboard`; **quatro dos cinco endpoints existem**, em
  `financial/adapters/http/plugin.ts:1785,1803,1821` e `reports/.../plugin.ts:407`, com a forma
  `…/dashboard/<widget>` que o ADR prescreve. O `…` resolveu-se em dois prefixos de módulo, cada widget no
  módulo dono do dado. **A tese de "duas taxas de realização" não se sustenta: os endpoints também foram
  construídos, por cards próprios (`DASH-F1`, `DASH-F4`, `DASH-F5`, todos closed-green).**
- **Uma decisão do acervo se apoia em dado medido, não em princípio.** _(lote 8b.)_ O `ADR-0051` marca a
  linha "as 2 categorias `ajuste` são `Estorno` e `Ajuste de conciliação`" com "← o fato decisivo deste
  ADR", e é literal: ela derruba a alternativa (A), porque uma projeção da árvore do plano não tem onde
  pôr um estorno. Os outros ADRs decidem por princípio e acertam; este decide por **contraexemplo**, e o
  resultado é mais difícil de reabrir por engano — quem quiser unificar tem de dizer onde vive o
  `Estorno`.
- **Divergência de CONJUNTO é a mais difícil de auditar.** _(lote 8b.)_ O R-5 do `ADR-0048`:
  `{contractRef IS NULL} ⊇ {paymentType=NO_CONTRACT}`, logo o relatório "Fornecedores sem Contrato"
  mostra MAIS fornecedores que o legado — corretamente, pelo critério novo. Nenhum teste pega, porque não
  é erro; e a primeira conferência contra o legado vira caça a bug inexistente. Daí a cláusula proposta:
  divergência de conjunto tem de ser declarada no **contrato de saída**, não só no ADR.
- **Citar o ADR no ponto de aplicação é o que torna auditoria um grep.** _(consolidado, lote 8a.)_ Cinco
  ADRs têm a referência dentro do código que os cumpre — `0020`, `0027`, `0032`, `0046` e `0050`. Todos
  de junho ou depois; **nenhum** dos fundacionais de abril. A prática apareceu sozinha e nunca foi
  normatizada — é candidata a regra com custo de adoção quase zero.

---

## Checklist por ADR

1. **Ler o arquivo inteiro.** Nunca citar de memória (anti-padrão #12 do `AGENTS.md`).
2. **Transcrever `declared`** — status literal, incluindo prosa (`"Accepted (provisório)"`).
3. **Buscar o veredito na 039** e registrar em `prior_art`, com `applied_to` real (conferir onde a
   regra aterrissou, não deduzir da tabela final da 039).
4. **Extrair `claims`** — uma afirmação normativa por entrada, com `source_lines`.
5. **Verificar `reality`** pelo que for barato (grep, teste existente). Não conferido ⇒ `unverified`
   com `verify` preenchido. Nunca `holds` por plausibilidade.
   - Evidência de **diretório** não tem número de linha e por isso não passa na Guarda 2. Escrever
     como `nota: o diretório <caminho>/ existe — …`, mantendo o caminho no texto. A guarda **não**
     foi afrouxada para aceitar caminho sem linha: exigir `path:linha` de arquivo é o que ela protege.
6. **Procurar `enforced_by`** — varrer `tests/`, **`.semgrep/rules.yml`**, `eslint.config.js`,
   `.claude/hooks/`. O que já é mecânico não vira texto (regra 1 do [`../INDEX.md`](../INDEX.md)).
7. **Avaliar `testability`** — qual teste falha se a regra for violada? Sem resposta ⇒
   `unfalsifiable`, e a alegação não pode ser adotada sem reescrita.
8. **Propor `rule`** — `status: proposed` sempre. Nunca `accepted`: promover é ato do dono do repo.
9. **Registrar `findings`** — lacuna, drift, contradição, pendência envelhecida.
10. **`provenance` só com conteúdo lido.** Coincidência de nome vai para `note`.
11. **Rodar o gate** ao fim do lote:
    `node --test --experimental-strip-types --no-warnings tests/decisions/decision-records.test.ts`

## Parar e reavaliar quando

Ver [`SCHEMA.md`](./SCHEMA.md) §11. Em resumo: alegação que não cabe nos enums, ADR que exige campo
inexistente, taxa de `unfalsifiable` subindo, ou contradição frontal entre ADRs. Parar custa um turno;
empurrar custa reextrair 55 arquivos.

Já disparou **cinco** vezes, e nas cinco o formato mudou:

1. `rule.decision` virou `rule.status` + `rule.disposition` — não dava para expressar "sugiro
   estreitar o escopo" com um campo só.
2. `existing_test` virou `enforced_by` como lista — enforcement é semgrep e hook também, não só teste.
3. `prior_art` nasceu ao descobrir a destilação da 039 — o inventário não podia ignorar 44 vereditos
   já registrados.
4. _(lote 5)_ A **guarda 2** passou a aceitar âncora por **seção** (`arquivo.md §3.9`), não só
   `path:linha`. Para documento em prosa a seção é âncora mais durável — sobrevive a edição do texto.
   ⚠️ Mudança de guarda enquanto o próprio trabalho falhava nela, o que o [`SCHEMA.md`](./SCHEMA.md) §3
   proíbe fazer por conveniência. O teste aplicado foi: _eu faria essa mudança se os dados passassem?_
   Sim — numerar linha de uma inquiry de 300 linhas é pior prática que citar sua seção. As outras 7
   evidências que falhavam na mesma rodada eram erro de preenchimento e foram **corrigidas nos dados**,
   não na guarda.
5. _(lote 5)_ `holds_in` / `absent_in` passaram de "lista de módulo" para **rótulo de escopo** —
   módulo, componente (`core-api`, `bff`, `etl`) ou subsistema. Alegação transversal não se delimita
   por módulo, e o formato já usava rótulo de componente desde a `ADR-0014-C4` (`absent_in: [etl]`)
   sem que o schema admitisse.
