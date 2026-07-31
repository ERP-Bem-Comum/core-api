# Feature Specification: Alinhar as regras de agente à realidade do código

**Feature Branch**: `040-rules-match-code-reality`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Validar e corrigir as regras de agente (`.claude/rules/`) contra a REALIDADE do código em `src/`, e criar mecanismo que impeça a divergência de voltar."

---

## O problema, em uma frase

As 12 rules de `.claude/rules/` foram destiladas de **44 ADRs** e **nunca foram confrontadas com o
código**. ADR é decisão; código é fato. Onde a decisão não foi implementada — ou foi implementada de
outro jeito — a rule afirma como vigente algo que não existe, e passa a **induzir regressão em vez de
preveni-la**.

## Contexto medido _(verificado em 2026-07-30)_

### A divergência mais grave já encontrada

`.claude/rules/adapters.md` afirma, como regra vigente:

> "**Dois pools**: comando/mutação → `writer`; query/projeção → `reader`. O pool reader **nunca** emite
> `INSERT/UPDATE/DELETE`."

**Isso não existe no código.** `grep -rn "createPool" src/` mostra que a persistência real usa
`src/shared/persistence/pool-registry.ts` — um registry que resolve um problema **diferente**
(exaustão de conexões: URLs idênticas colapsam em 1 pool por processo). Não há pool `reader` nem
`writer` em lugar algum.

O ADR-0026 **decidiu** o read/write split; o código **não o implementou**. Ao destilar o ADR, tratei
decisão como fato. Um agente que leia essa rule pode tentar "consertar" código correto para usar
pools inexistentes — exatamente a regressão que o aparato deveria impedir.

### Divergências rule ↔ código

| Afirmação da rule                           | Realidade                                                                           | Comando                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| `adapters.md`: dois pools `writer`/`reader` | **Não existe** — só `pool-registry.ts` (problema diferente)                         | `grep -rn "createPool" src/`  |
| `jobs-and-workers.md` cobre jobs e workers  | `paths:` **não alcança** `src/modules/*/worker/` — e há 2 (`contracts`, `partners`) | `ls -d src/modules/*/worker/` |
| Rules assumem `domain/` em todo módulo      | `reports` tem só `adapters/`, `application/`, `public-api/`                         | `ls -1 src/modules/reports/`  |

### Divergências ADR ↔ código _(a origem do problema)_

| ADR    | Descreve                                                       | Realidade                                     |
| ------ | -------------------------------------------------------------- | --------------------------------------------- |
| `0006` | `src/contexts/{documentos,titulos,banco,ocr}`                  | `src/modules/{auth,budget-plans,contracts,…}` |
| `0010` | `packages/shared-kernel/`, `apps/core-api/src/adapters/email/` | Nenhum desses caminhos existe                 |
| `0002` | Node 20                                                        | Node 24 (`0009`)                              |
| `0026` | Read/write split de conexão                                    | Pool registry boot-scoped, sem split          |

### Onde as rules estão corretas _(o mecanismo funciona)_

Nem tudo divergiu — e isso importa para calibrar o esforço:

| Afirmação                                      | Verificação                                                           | Resultado     |
| ---------------------------------------------- | --------------------------------------------------------------------- | ------------- |
| Sem `class` no domínio e no kernel             | `grep -rln "^export class" src/modules/*/domain/ src/shared/kernel/`  | ✅ zero       |
| Zod só na borda                                | `grep -rln "from 'zod'" src/ \| grep -v adapters/http`                | ✅ zero       |
| CLI embutida removida (ADR-0037)               | `ls -d src/modules/*/cli/`                                            | ✅ não existe |
| 5 estados do `Contract` (ADR-0023/0039)        | `grep -n "status:" src/modules/contracts/domain/contract/contract.ts` | ✅ presentes  |
| Shell HTTP em `src/shared/http/` (ADR-0028)    | `ls -1 src/shared/http/` → `app.ts`, `reply.ts`, `errors.ts`          | ✅ conforme   |
| 4 use cases do `auth` com `authorize` embutido | arquivos existem em `application/use-cases/`                          | ✅ conforme   |
| Job com `run.ts` + `config.ts` (ADR-0041)      | `src/jobs/auth/sync-permissions/`, `src/jobs/contracts/sweeper/`      | ✅ conforme   |

**Sinal mais forte de todos:** `src/modules/auth/domain/authorization/permission-catalog.ts` carrega o
comentário _"Dominio e puro: sem throw (rule domain.md)"_ — **o código cita a rule**. As rules são
consultadas de fato, e é justamente por isso que uma rule errada é perigosa.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Nenhuma rule afirma o que o código não faz (Priority: P1)

Como agente editando código, quero que toda afirmação verificável das rules seja verdadeira sobre o
`src/` atual, para não "corrigir" código correto em nome de uma regra que descreve um sistema que não
existe.

**Why this priority**: É a razão da feature. Uma rule errada é pior que rule nenhuma — carrega a
autoridade do aparato e induz mudança errada com confiança.

**Independent Test**: Para cada afirmação verificável das 12 rules existe um comando registrado que a
testa contra `src/`, e todos passam ou têm divergência com veredito registrado.

**Acceptance Scenarios**:

1. **Given** uma afirmação verificável de rule, **When** o comando registrado é executado, **Then** confirma a afirmação ou a divergência está registrada com veredito.
2. **Given** uma divergência, **When** ela é julgada, **Then** o veredito é **regra obsoleta** ou **código em regressão** — nunca "ajustar o código para caber na regra" sem julgamento.
3. **Given** um veredito de código em regressão, **When** registrado, **Then** vira GitHub Issue (ADR-0040), não correção dentro desta feature.

---

### User Story 2 - Os `paths:` cobrem o que a rule pretende cobrir (Priority: P2)

Como agente, quero que a rule carregue quando eu tocar o arquivo que ela governa, para não trabalhar
sem a regra que existia justamente para aquele caso.

**Why this priority**: Uma rule que não carrega é indistinguível de uma rule que não existe. O gap de
`src/modules/*/worker/` foi encontrado por acaso — pode haver outros.

**Independent Test**: Todo diretório de `src/` e `tests/` está coberto por ao menos uma rule, e
nenhuma rule declara `paths:` que não casa com diretório existente.

**Acceptance Scenarios**:

1. **Given** qualquer arquivo de `src/`, **When** se pergunta qual rule o cobre, **Then** existe resposta.
2. **Given** um `paths:` de rule, **When** confrontado com a árvore, **Then** casa com ao menos um arquivo real.
3. **Given** uma estrutura que as rules não previam, **When** encontrada, **Then** está registrada e tem destino decidido.

---

### User Story 3 - Distinguir norma de descrição de estado (Priority: P2)

Como responsável, quero que a auditoria separe o que o ADR **decidiu** (norma, vence) do que ele
**descreve** (estado, envelhece), para não corromper a hierarquia de fontes nem congelar o código numa
foto antiga.

**Why this priority**: Sem essa distinção, a correção vira ou "o ADR está errado, ignore" (destrói a
hierarquia) ou "o código está errado, reescreva" (regressão em massa). O caso do ADR-0026 mostra um
terceiro estado: norma **legítima e ainda não implementada**.

**Independent Test**: Cada divergência ADR↔código está classificada em uma de três categorias, com
tratamento distinto por categoria.

**Acceptance Scenarios**:

1. **Given** um ADR que descreve estrutura inexistente, **When** classificado, **Then** é **descrição envelhecida** — a rule não a reproduz e o código não muda.
2. **Given** um ADR cuja norma não foi implementada, **When** classificado, **Then** é **norma pendente** — a rule diz que é alvo, não estado, ou fica fora da rule.
3. **Given** um ADR cuja norma foi violada pelo código, **When** classificado, **Then** é **regressão** → issue.

---

### User Story 4 - A divergência aparece sozinha da próxima vez (Priority: P3)

Como responsável, quero que a próxima divergência entre regra e código apareça sem depender de alguém
suspeitar, para que o abandono não volte a acumular silenciosamente.

**Why this priority**: Sem isso, esta feature é uma limpeza pontual e o problema volta — foi assim que
o handbook envelheceu.

**Independent Test**: Existe verificação executável que falha quando uma afirmação verificável de rule
deixa de ser verdadeira.

**Acceptance Scenarios**:

1. **Given** o mecanismo instalado, **When** o código passa a violar uma afirmação de rule, **Then** a verificação falha e aponta qual.
2. **Given** uma rule com `paths:` que não casa com nada, **When** a verificação roda, **Then** acusa.

---

### Edge Cases

- ADR cuja norma é legítima mas **ainda não implementada** (caso ADR-0026): a rule deve omitir, ou marcar explicitamente como alvo futuro?
- Rule correta hoje que descreve estrutura de **um só módulo** — vale como regra geral ou é específica?
- Código que viola rule **por decisão deliberada** e não documentada: como distinguir de regressão?
- Afirmação de rule **não verificável mecanicamente** ("a sobreposição é intencional") — fica fora da auditoria automática, mas continua sendo doutrina.
- O que acontece quando um ADR **novo** é aceito e a rule não é atualizada?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Toda afirmação **mecanicamente verificável** das 12 rules MUST ser extraída e listada.
- **FR-002**: Cada afirmação extraída MUST ter um comando registrado que a testa contra `src/`.
- **FR-003**: Cada afirmação MUST receber resultado: confirmada ou divergente.
- **FR-004**: Cada divergência MUST receber veredito explícito — **regra obsoleta**, **norma pendente** ou **código em regressão**.
- **FR-005**: Divergência classificada como **código em regressão** MUST virar GitHub Issue (ADR-0040), e MUST NOT ser corrigida dentro desta feature.
- **FR-006**: Nenhuma rule MUST afirmar como vigente um padrão que o código não implementa.
- **FR-007**: Norma decidida por ADR mas ainda não implementada MUST ser distinguível de norma vigente, onde aparecer.
- **FR-008**: Os `paths:` de cada rule MUST ser verificados contra a árvore real; `paths:` que não casa com nenhum arquivo MUST ser corrigido ou removido.
- **FR-009**: Todo diretório de `src/` MUST estar coberto por ao menos uma rule, ou ter a ausência de cobertura justificada.
- **FR-010**: Estruturas reais não previstas pelas rules MUST ser mapeadas (módulo sem `domain/`, worker dentro de módulo, e o que mais existir).
- **FR-011**: Nenhuma mudança de comportamento MUST ocorrer em `src/` por esta feature.
- **FR-012**: Toda linha de rule corrigida ou acrescentada MUST passar nos três testes da spec 039 (acionável no ponto de edição; não já enforced mecanicamente; referencia o ADR em vez de reproduzi-lo).
- **FR-013**: A auditoria MUST distinguir **norma** (o ADR decide; vence) de **descrição de estado** (o ADR retrata; envelhece).
- **FR-014**: MUST existir verificação executável que falhe quando uma afirmação verificável de rule deixar de ser verdadeira.
- **FR-015**: A verificação MUST rodar no gate de qualidade ou em CI, sem depender de alguém lembrar de executá-la.
- **FR-016**: A entrega MUST NOT conflitar com as specs 038 e 039, ambas em curso e não commitadas.

### Key Entities

- **Afirmação verificável**: sentença de rule que pode ser confirmada ou refutada por um comando sobre `src/`. Ex.: "não há `class` no domínio".
- **Afirmação doutrinária**: sentença de rule que orienta julgamento e não é mecanicamente testável. Ex.: "a sobreposição é intencional". Fica fora da auditoria automática, dentro da doutrina.
- **Divergência**: afirmação verificável que o código refuta.
- **Veredito**: classificação de uma divergência — regra obsoleta, norma pendente ou código em regressão. Determina quem muda.
- **Cobertura de path**: relação entre `paths:` de rule e diretórios reais. Tem dois defeitos possíveis: diretório sem rule, e `paths:` sem diretório.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das afirmações verificáveis das 12 rules têm comando de teste registrado e resultado.
- **SC-002**: Zero rules afirmam como vigente padrão que o código não implementa.
- **SC-003**: 100% das divergências têm veredito registrado, com quem-muda explícito.
- **SC-004**: Zero `paths:` de rule sem correspondência na árvore real.
- **SC-005**: 100% dos diretórios de `src/` cobertos por rule, ou com ausência justificada.
- **SC-006**: `src/` permanece byte-idêntico do início ao fim da entrega.
- **SC-007**: Toda divergência classificada como regressão tem issue aberta e rastreável.
- **SC-008**: Uma violação introduzida de propósito numa afirmação verificável faz a verificação falhar — testado, não presumido.
- **SC-009**: O gate de qualidade permanece verde ao fim da entrega.

## Impacto Arquitetural (core-api)

- **Bounded Contexts afetados**: nenhum. É aparato de processo auditando a si mesmo contra o código.
- **Mudanças em `src/`**: **zero** — invariante (FR-011) e critério de aceite (SC-006). Regressão encontrada vira issue, não commit.
- **Possíveis violações da constituição**: nenhuma. A feature **reforça** a hierarquia de fontes ao separar o que o ADR decide do que ele descreve.

## Assumptions

- As 12 rules de `.claude/rules/` são o alvo. As rules podem ter sido criadas nesta mesma sessão (spec 039) — recém-escrita não significa correta, e a `adapters.md` prova isso.
- ADRs **não** serão editados: são imutáveis. Quando um ADR descreve estado envelhecido, o remédio é a rule não reproduzir a descrição — não corrigir o ADR.
- O código é a referência de **fato**; o ADR é a referência de **norma**. Quando divergem, a pergunta correta é "isto é norma não implementada ou norma violada?" — e as duas têm tratamentos opostos.
- Afirmação não verificável mecanicamente continua valendo como doutrina; sai da auditoria automática, não da rule.
- A verificação nova segue a regra da própria casa: **enforcement mecânico vence texto**. É melhor um teste que falha do que um parágrafo pedindo atenção.
