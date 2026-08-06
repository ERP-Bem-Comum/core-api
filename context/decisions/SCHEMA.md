# Formato dos registros de decisão (`context/decisions/*.yaml`)

Contrato do formato usado para destilar as decisões do projeto em registros auditáveis por máquina.
Um arquivo YAML por ADR de origem, nomeado `ADR-NNNN.yaml`.

**Status:** proposta da Fase 0, revisão 2 — validada em duas amostras (`ADR-0020`, `ADR-0026`).
Aguarda gate humano antes da extração dos 53 ADRs restantes.

---

## 1. A ideia central: três planos, nunca misturados

O erro que este formato existe para impedir é tratar **decisão registrada** como **fato do sistema**.
São coisas diferentes, e a diferença entre elas é o achado mais valioso do inventário.

| Plano     | Campo      | Pergunta que responde                   | Quem é a autoridade |
| --------- | ---------- | --------------------------------------- | ------------------- |
| Declarado | `declared` | O que o documento diz de si mesmo?      | o `.md` de origem   |
| Realidade | `reality`  | O que `src/` faz hoje?                  | o código            |
| Regra     | `rule`     | O que vale no harness daqui pra frente? | **o dono do repo**  |

Os três divergem com frequência. `ADR-0026` é o caso de prova: declara read/write split de pools
como decisão aceita e transversal; o código implementa a costura em 2 módulos e a omite justamente
onde o próprio ADR dizia que o ganho apareceria.

## 2. A extração propõe; ela não legisla

A extração pode **sugerir** `rule.text` — marcando `rule.status: proposed` e a `rule.disposition`
que ela recomenda. O que ela não pode é tratar a sugestão como vigente: só `rule.status: accepted`,
por decisão humana, torna a regra norma.

Consequência prática: um registro recém-extraído tem toda alegação em `proposed` ou `pending`, e
**nenhuma** em estado vigente. Um agente que leia o arquivo sabe que ali há proposta, não lei.

## 3. A regra não se dobra ao código (invariante de autoridade)

Quando `reality` divergir de `rule`, existem exatamente duas saídas: **consertar o código** ou
**escalar ao humano**. Nunca uma terceira — enfraquecer a regra para o trabalho em curso passar.

> Um agente **MUST NOT** editar `rule.text`, `rule.status`, `rule.disposition` ou `applies_to` para
> fazer a própria tarefa passar. Divergência encontrada durante uma tarefa é achado a registrar, não
> licença para emendar a norma.

Isto vale inclusive quando a regra parece errada. Regra errada se corrige por decisão explícita,
registrada, fora do fluxo da tarefa que topou nela — nunca no meio dela. É a mesma lógica da
política de regressão zero: a saída não é reclassificar o vermelho, é endereçá-lo.

**Enforcement.** Hoje esta invariante é texto, e texto não bloqueia. A forma mecânica seria um hook
`PreToolUse(Edit|Write)` que recusa alteração em `context/decisions/*.yaml` quando o turno também
altera `src/` — barrando exatamente o movimento "amolece a regra para o meu diff passar". Não foi
implementado; fica como decisão sua.

## 4. Guardas anti-alucinação

Invariantes de preenchimento. Cada uma existe porque a violação dela produz um registro que **parece**
verificado e não é:

1. **Nenhuma alegação sem `source_lines`.** Obriga abrir o `.md` e citar posição. Mata a alegação
   escrita de memória.
2. **Evidência de presença é ANCORADA.** Duas formas, conforme o tipo de arquivo: `path:linha` para
   código e config; **`arquivo.md §seção`** para documento em prosa — onde a seção é âncora mais
   durável que a linha, porque sobrevive a edição do texto. Observação de ausência não tem o que
   citar, então declara-se com prefixo: `ausência:` quando nada foi encontrado, `nota:` para ressalva
   de escopo. Prosa solta, sem âncora e sem prefixo, não é evidência.
3. **Nenhum veredito afirmativo com `evidence` vazia.** Qualquer `reality.verdict` diferente de
   `unverified` exige pelo menos uma evidência ancorada.
4. **`unverified` é o default honesto.** Não conferi ⇒ `unverified` com `verify` preenchido. Nunca
   `holds` por plausibilidade.
5. **`holds_in` / `absent_in` obrigatórios em `partial`.** "Parcialmente verdade" sem dizer onde é
   afirmação vazia. Os dois campos aceitam **rótulo de escopo**, não só nome de módulo: módulo
   (`contracts`), componente (`core-api`, `bff`, `etl`) ou subsistema. Alegação transversal delimita
   pelo componente onde foi verificada — é o que distingue "vale onde olhei" de "vale em tudo".
6. **Vínculo por nome não é vínculo.** `provenance` só recebe ticket/issue cujo conteúdo foi lido.
   Coincidência de nome vai para `note`, não para a lista.
7. **Norma não nasce de decisão NUNCA sancionada.** Uma alegação não chega a `rule.status: accepted`
   se o ADR de origem estiver `declared.status_normalized: proposed`. Promover alegação extraída de
   um ADR `Proposed` cria norma vigente apoiada em documento que ainda pode mudar — e a norma não tem
   como acompanhar a mudança.

   Só `proposed` bloqueia. `superseded` e `deprecated` **foram** sancionados um dia e depois
   substituídos: promover suas alegações — tipicamente com `drop` — é justamente como o acervo se
   limpa, e foi o que fechou 10 das 21 contraditas em 2026-08-05. Bloqueá-los impediria o trabalho
   que a Fase 1 existe para fazer.

   A guarda existe porque o defeito já aconteceu **no acervo**, não em hipótese: o `ADR-0051`
   (`Accepted`) declarava vigente o §D1 do `ADR-0048`, que seguia `Proposed` há três semanas. Ver
   `ADR-0051-C6` e o gate `tests/cleanup/adr-status-chain.test.ts`, que cobre a mesma classe entre
   ADRs. Esta guarda é o mesmo princípio uma camada abaixo: entre o ADR e a alegação extraída dele.

   Saída quando a alegação vale mas o ADR não foi sancionado: **ratificar o ADR primeiro**. Nunca
   promover a alegação e "resolver o ADR depois" — é assim que a cadeia inverte.

## 5. Toda alegação verificável carrega o comando que a verifica

Regra 5 do [`../INDEX.md`](../INDEX.md). `reality.evidence` registra o que foi encontrado **e quando**;
`reality.verify` é o comando que qualquer pessoa (ou o CI) roda para re-checar. Evidência sem comando
envelhece em silêncio — foi o mecanismo exato da regra fantasma de read/write split.

Comandos assumem `fish` a partir da raiz do repo, com globs entre quotes.

## 6. Toda alegação normativa declara como virar teste

`verify` audita o código que **já existe** — é grep, olha para trás. TDD precisa do oposto: um teste
que **falha antes** da regra valer. São coisas diferentes e o registro carrega as duas.

O bloco `testability` existe para que a regra chegue no W0 pronta para virar RED. Ele força a
pergunta que separa regra de prosa: _qual teste falha se isto for violado?_ Alegação que não
responde é `unfalsifiable` — e alegação `unfalsifiable` **não pode virar rule** sem antes ser
`narrow`/`replace` para uma forma testável.

`ADR-0026-C3` é o exemplo: _"introduzir a réplica é mudança de configuração, não de código"_ é uma
afirmação sobre esforço futuro. Não há teste possível. O conteúdo verificável dela é outro — "todo
módulo aceita `readerUrl` opcional" — e esse sim vira RED estático.

### `enforced_by` — o que já é mecânico não vira texto

Regra 1 do [`../INDEX.md`](../INDEX.md): se teste, `eslint`, `tsc`, `semgrep` ou hook já garantem, a
alegação **não** precisa virar diretiva escrita — a verificação é a documentação. `enforced_by` lista
o caminho desses mecanismos, e o gate confere que cada um existe de fato no repo.

Isso não é hipotético: o repositório já enforça dois invariantes do `ADR-0020` por AST, em
[`.semgrep/rules.yml`](../../.semgrep/rules.yml) (`mysql-enum-forbidden`, `mysql-json-forbidden`,
ticket `SEMGREP-ADR-ENFORCER`), com gate em CI. O mecanismo existe — está 2 regras fundo. Toda
alegação `testable` + `layer: static` deste inventário é candidata natural à terceira.

Consequência prática: `enforced_by` não vazio e `rule.disposition: adopt` significam "vale, e já é
cobrado" — não gera linha nova em `.claude/rules/`, só referência ao mecanismo.

---

## 7. Referência de campos

```yaml
id: ADR-0026 # chave estável, = nome do arquivo
title: string # título curto, sem o número
source: path # o .md de origem, relativo à raiz
decided_on: YYYY-MM-DD # data que o documento declara

declared: # TRANSCRITO do .md, nunca julgado aqui
  status: string # literal do documento, incluindo prosa ("Accepted (provisório)")
  status_normalized: enum # proposed | accepted | rejected | deprecated | superseded
  supersedes: [ADR-NNNN]
  superseded_by: [ADR-NNNN] # vazio quando a supersessão é parcial — ver claims[].superseded_by
  related: [ADR-NNNN]

assessment: # VEREDITO do harness sobre o documento inteiro
  verdict: enum # realized | partially-realized | unrealized | contradicted | obsolete | unverified
  checked_at: YYYY-MM-DD
  checked_against: sha # commit do src/ contra o qual se verificou
  summary: | # o que um agente precisa saber em 3-6 linhas

extraction:
  state: enum # sample | complete
  covers: string # quando sample, o que ficou de fora

prior_art: # julgamentos anteriores sobre este ADR — insumo, não substituto (§13)
  - source: path # o documento que julgou
    verdict: string # o veredito literal registrado lá
    applied_to: [path] # onde aquele julgamento foi aplicado (rule, código, config)
    gap: | # o que aquele julgamento NÃO fez, e este registro acrescenta

claims: # as afirmações normativas, uma por entrada
  - id: ADR-NNNN-Cn # estável; referenciável por .claude/rules/
    text: | # a alegação em forma imperativa, autocontida
    kind: enum # obligation | prohibition | permission | aspiration
    source_lines: [n, n-m] # onde no .md — obriga citação literal (guarda 1)
    applies_to: [glob] # onde a alegação morde; [] quando transversal
    superseded_by: ADR-NNNN # supersessão POR ALEGAÇÃO (ver §8)

    reality: # o que o código faz HOJE
      verdict: enum # holds | partial | absent | contradicted | exercised | unverified
      holds_in: [module] # obrigatório em partial
      absent_in: [module] # obrigatório em partial
      evidence: [string] # 'path:linha — nota'; vazia só se unverified (guardas 2 e 3)
      verify: | # comando que re-checa o estado atual

    testability: # como isto vira RED no W0 (§6)
      verdict: enum # testable | testable-with-work | unfalsifiable | not-applicable
      layer: enum|null # static | unit | integration | contract | e2e; null se não há teste
      red: | # o teste que falha se a regra for violada — Given/When/Then
      expected_error: string|null # identificador de erro, EN kebab-case, quando aplicável
      blocker: string|null # em testable-with-work: o que falta (fixture, double, harness)
      enforced_by: [path] # mecanismo que JÁ garante isto; [] se nenhum (ver §6)

    rule: # o que vale daqui pra frente (§2, §3)
      status: enum # pending | proposed | accepted — QUEM sancionou
      disposition: enum|null # adopt | narrow | replace | drop — QUAL a decisão
      text: string|null # diretiva imperativa (MUST / MUST NOT); null em pending
      rationale: string|null

findings: [string] # achados que não são alegações (lacunas, drift de índice)
provenance:
  tickets: [TICKET-ID] # só com conteúdo lido (guarda 6)
  issues: [n]
  note: string # coincidências de nome e pistas a confirmar
```

## 8. Supersessão é por alegação, não por documento

`ADR-0024` está `Accepted` com a parte de autenticação superseded pelo `ADR-0055`, e o RBAC vigente.
Um campo `superseded_by` no nível do documento não consegue expressar isso — força escolher entre
marcar o documento todo como morto (perdendo o RBAC vigente) ou como vivo (ressuscitando a authN
substituída). Por isso `superseded_by` existe também dentro de `claims[]`, e é lá que ele manda.

## 9. Enums, com o significado exato

**`reality.verdict`** — o que o código faz:

| Valor          | Significado                                                   |
| -------------- | ------------------------------------------------------------- |
| `holds`        | o código faz o que a alegação diz, em todo o escopo declarado |
| `partial`      | vale em parte do escopo; `holds_in`/`absent_in` obrigatórios  |
| `absent`       | nada no código realiza a alegação                             |
| `contradicted` | o código faz o oposto                                         |
| `exercised`    | para `kind: permission` — a permissão é de fato usada         |
| `unverified`   | ainda não conferido; `verify` preenchido, `evidence` vazia    |

**`testability.verdict`** — se dá para escrever o RED:

| Valor                | Significado                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `testable`           | o RED sai direto, com o que já existe na suíte                      |
| `testable-with-work` | precisa de fixture/double/harness ainda inexistente — ver `blocker` |
| `unfalsifiable`      | não há teste possível como escrita; exige `narrow`/`replace`/`drop` |
| `not-applicable`     | `permission` ou `aspiration` sem obrigação embutida                 |

O par `rule.status` + `rule.disposition` separa **quem sancionou** de **qual é a decisão**. Manter
os dois no mesmo campo impedia expressar o caso mais comum da extração — "sugiro estreitar o escopo"
— porque `proposed` e `narrow` disputariam o mesmo slot.

**`rule.status`** — quem sancionou:

| Valor      | Significado                                                   |
| ---------- | ------------------------------------------------------------- |
| `pending`  | nem a extração se arrisca a sugerir                           |
| `proposed` | **sugestão da extração** — não é norma até um humano promover |
| `accepted` | promovida por decisão humana; **é** norma vigente             |

**`rule.disposition`** — qual é a decisão (`null` enquanto `pending`):

| Valor     | Significado                                                |
| --------- | ---------------------------------------------------------- |
| `adopt`   | vale como está                                             |
| `narrow`  | vale num escopo menor que o declarado                      |
| `replace` | substituída por `rule.text` diferente da alegação original |
| `drop`    | não vale; a alegação fica como registro histórico          |

## 10. Como consultar

Consulta é `grep`, deliberadamente — funciona nesta máquina hoje, sem instalar nada:

```fish
# alegações que o código não realiza; abra nos file:line retornados
grep -n "verdict: \(absent\|contradicted\|partial\)" context/decisions/*.yaml

# o que nenhum humano promoveu ainda (indentação de 6 isola rule.status)
grep -n "^      status: \(pending\|proposed\)" context/decisions/*.yaml

# o que não dá teste — não pode virar rule sem reescrita
grep -n "verdict: unfalsifiable" context/decisions/*.yaml

# alegações que mordem um path que estou editando
grep -l "adapters/persistence" context/decisions/*.yaml

# re-checar uma alegação: o comando mora no próprio registro
grep -A2 "verify:" context/decisions/ADR-0020.yaml
```

Não existe arquivo de índice agregado, e é de propósito: índice derivado que se edita à mão é a
terceira cópia da verdade. Índice aqui é query.

**Validação de sintaxe** usa o prettier que já está no repo — se ele parseia, o YAML é válido:

```fish
pnpm exec prettier --check context/decisions/
```

Consulta estruturada de verdade (filtrar por campo, cruzar arquivos) exigiria `yq`, que **não está
instalado nesta máquina**, ou o pacote `yaml` como `devDependency`. Nenhuma das duas foi feita: é
decisão de supply-chain (ADR-0011) e não cabe a esta fase tomá-la. Existe um `yaml@2.9.0` transitivo
em `node_modules/.pnpm/`, útil para validar estrutura num script pontual, mas **não é dependência
declarada** — qualquer mudança de lockfile pode removê-lo, então não construir nada em cima dele.

## 11. Protocolo de parada

A extração para e reavalia — não empurra — quando:

- uma alegação não cabe em nenhum `kind` ou `verdict` existente;
- um ADR exige campo que o schema não tem;
- a taxa de `unfalsifiable` sobe o suficiente para sugerir que o formato está pedindo do ADR algo
  que ADR não dá;
- duas alegações de ADRs diferentes se contradizem de frente (é decisão, não extração).

Parar cedo custa um turno. Empurrar custa reextração de 55 arquivos.

## 12. Fora de escopo

`handbook/reference/` (1.055 arquivos, 572k linhas) é documentação de terceiros vendorizada —
TypeScript Handbook, Node, Drizzle, MySQL Refman, Fastify, Zod, Bruno, pnpm. Não entra na extração;
cada pasta já tem agente especialista por cima. Aparece aqui no máximo como ponteiro.

## 13. Julgamentos anteriores (`prior_art`)

Este inventário não é o primeiro a julgar os ADRs. A
[destilação da spec 039](../../specs/039-claude-native-harness/adr-rules-distillation.md) julgou os 54,
criou as 12 rules atuais e registrou vereditos por ADR. `prior_art` cita esse trabalho em vez de
refazê-lo — e o `applied_to` é verificado pelo gate, o que pega rule que sumiu com decisão ainda
apontando para ela.

**O que a 039 não fez, e é o que este formato acrescenta:** os três testes dela perguntam se o
aprendizado é acionável, se já é mecânico e se cabe em referência. **Nenhum pergunta se a afirmação
do ADR é verdade no código.** Foi por isso que a spec 040 precisou existir.

O caso do `ADR-0026` mostra as três camadas divergindo, e nenhuma delas totalmente certa:

| Camada                    | O que diz                                                                | Estado real                                          |
| ------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| ADR-0026                  | dois pools, split transversal, "ligar réplica é só config"               | falso em financial/programs                          |
| 039 → `adapters.md:44`    | "norma decidida e ainda não implementada", provado por `grep createPool` | grep ingênuo; a costura existe em contracts/partners |
| 039 → `application.md:17` | read-after-write lê do primário, como norma                              | sem teste, `unverified`                              |

A rule chegou mais perto do certo que o ADR. O que falhou foi a **evidência** dela — um grep que
ninguém re-rodou depois. É exatamente o que `reality.verify` existe para impedir.

## 14. Pendência conhecida

O [`../INDEX.md`](../INDEX.md) descreve `decisions/` como "consequências operacionais" de uma norma
que vive imutável em `handbook/architecture/adr/`. A premissa de trabalho atual é outra — o ADR é
evidência de intenção, não lei, e a regra vigente é a que `rule.text` fixar depois de promovida.
Quando a canonicidade for decidida, `INDEX.md` §`decisions/` e a tabela "O que NÃO vive aqui"
precisam acompanhar, junto com a invariante de autoridade do §3.

(`INDEX.md` também cita `playbooks/`, que não existe — o diretório equivalente é `runbooks/`.)
