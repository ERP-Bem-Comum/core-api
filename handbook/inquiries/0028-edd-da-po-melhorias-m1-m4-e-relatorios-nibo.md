---
inquiry: 0028
title: "O EDD da P.O. (M1–M4 + relatórios Nibo) — o que sobrevive à verificação"
state: open
opened: 2026-08-06
last_reviewed: 2026-08-06
open_outputs: 6  # migrar para issue — ver README §Saídas
---

[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0028: O EDD da P.O. (M1–M4 + relatórios Nibo) — o que sobrevive à verificação

- **Opened by:** Gabriel Aderaldo (Tech Lead)
- **Asked to:** P.O./Consultora Alessandra — documentos recebidos em 2026-08-05/06
- **Impact:** escopo comercial (~470h dev + ~350h do bundle P0) · 4 melhorias P0 · 2 relatórios Nibo · decisões D1–D6

---

## 1. Contexto

A P.O. enviou três documentos:

| Doc | Conteúdo |
| :--- | :--- |
| **DOC 01** | EDD das melhorias M1–M4 + relatórios Nibo, **com comentários do TL em itálico** |
| **DOC 02** | O **mesmo** EDD, sem os comentários |
| **DOC 03** | `MELHORIAS-ESCOPO-ADICIONAL.md` — escopo comercial P0, 304h dev (~350h c/ contingência) |

DOC 01 e DOC 02 são o mesmo texto: são **dois artefatos, uma tese**.

A suspeita registrada pelo TL, nos comentários do DOC 01:

> *"Sinceramente esse documento foi feito em uma versão ANTIGA do codigo e sinto que ele deva ser não
> levado a sério ou até tratado como 'ideia', pois todas suas bases estão ou erradas ou desatualizadas…"*

Essa suspeita é **falsificável**, e cara de errar nos dois sentidos. Se procede, o documento sustenta uma
proposta comercial de centenas de horas sobre premissas falsas. Se não procede, descartá-lo joga fora uma
análise de reuso que o time teria de refazer do zero.

O próprio EDD se oferece ao teste, e é isso que torna a verificação possível:

> **"Fonte da verdade:** a arquitetura atual do core-api (verificada no HEAD em 2026-08-05). Onde o texto e
> o código divergirem, **vence o código** — símbolos e arquivos citados abaixo foram conferidos."

Um documento que cita arquivo e número de linha não pede confiança: pede conferência.

---

## 2. Pergunta(s) feita(s)

```
sinto que ela fez com base em um codigo MUITO desatualizado então vamos precisar tirar
o que ela quer de vários ruidos que existem ok?
```

Operacionalizado em duas perguntas separáveis:

- **P1 (factual):** as alegações `[REUSO]` do EDD descrevem o código do HEAD, ou um estado anterior?
- **P2 (de escopo):** o que, no conjunto, é sinal aproveitável e o que é ruído a descartar?

---

## 3. Método

Cada alegação `[REUSO]` do EDD foi tratada como **predição verificável** sobre o repositório. Onde o
documento cita arquivo **e linha**, a conferência é binária. Onde afirma ausência ("não tem", "sem
rateio"), a verificação exige distinguir **uso de menção** — grep por nome acusa o comentário que
documenta a regra, não só o código que a aplica.

Verificação executada em 2026-08-06 sobre `origin/dev` em `7bf29e16`.

---

## 4. Resultado da verificação

### 4.1 Alegações com citação de arquivo/linha — **13 de 13 conferem**

| § | Alegação do EDD | Verificação no HEAD | |
| :-- | :--- | :--- | :-: |
| M1 | `approve-document.ts` importa `checkApprover` + `ApproverAuthorityReader` | `:12` e `:14` exatamente | ✅ |
| M1 | Comentário documenta o gap **#609** | `:22`, `:48`, `:67` citam #609 | ✅ |
| M1 | `approve()` grava `approvedBy`/`approvedAt` | `:37`, `:57` | ✅ |
| M1 | Padrão de token single-use em `auth/domain/session/password-reset-token.ts` | arquivo existe | ✅ |
| M2 | `reconciliation/types.ts` **linhas 30–32**: `subcategoryRef`, `categoryRef`, `costCenterRef` | **linhas 30, 31, 32** | ✅ |
| M2 | `reconciliation/types.ts` **linhas 68–70**: `treatment`, `categoryRef`, `costCenterRef` | **linhas 68, 69, 70** | ✅ |
| M2 | `confirm-batch.ts` **linhas 17–18** declaram os refs no template | **linhas 17, 18** | ✅ |
| M2 | `confirm-batch.ts` **linhas 56–60** aplicam o override | **linhas 56–60** | ✅ |
| M4 | `cedente/types.ts:11` — `AccountType` inclui `'cartao'` (#206) | **linha 11**, e #206 no `:9` | ✅ |
| M4 | dedup por FITID: unique `(debit_account_ref, fitid)` | `mysql.ts:708` | ✅ |
| M4 | parsers `ofx` / `csv` / `pdf` | os três existem | ✅ |
| §5.1 | `CategoryGroup` = 3 valores, varchar(12) + CHECK | `category-group.ts:8`; `mysql.ts:981,992` | ✅ |
| §6 | CHECK `status <> 'Paid' OR paid_at IS NOT NULL` | `mysql.ts:291`, texto idêntico | ✅ |

**As alegações de ausência também procedem:** `fin_statement_transactions` realmente não tem dimensão de
portador; o módulo `receivables` realmente não existe. As rotas citadas estão vivas —
`/reports/payment-position`, `/reports/cashflow` (+`/chart`), `/reports/realized`.

**As 12 issues citadas têm o status correto:** #603, #135, #438, #502, #604, #411 abertas; #206, #609,
#590, #441, #197 fechadas.

> **Veredito de P1: a suspeita não procede.** O EDD descreve o HEAD com precisão de número de linha. Não
> foi escrito sobre código antigo.

### 4.2 A exceção — e o que ela revela

Uma citação **é falsa**, e o modo de falha é mais interessante que o erro:

> §0: *"Herdados do `AGENTS.md` / constituição / ADRs"*

`AGENTS.md` foi **removido em 2026-08-03** (commit `7ac90494`, *"aposenta o AGENTS.md — o CLAUDE.md volta
a ser a doc canônica"*) — **dois dias antes** da data em que o EDD afirma ter verificado o HEAD.

Isso separa o documento em **duas camadas de confiabilidade**:

- **Camada verificada** (§1–§7, blocos `[REUSO]` com arquivo/linha): conferida de fato, 13/13.
- **Camada herdada** (§0, princípios transversais): escrita de memória/contexto, não conferida. O
  `AGENTS.md` é a prova — nenhuma verificação real o teria citado como vivo.

A distinção é operacional, não retórica: **cite a camada verificada com confiança; trate a §0 como
paráfrase**. Os princípios que ela enuncia (hexagonal, `Result<T,E>`, ADR-0022, ADR-0020, ADR-0051)
continuam corretos — mas por estarem no `CLAUDE.md` e nos ADRs, não porque o EDD os conferiu.

### 4.3 Uma omissão que corrige a estimativa para baixo

§5.2 afirma: *"categorização é 1:1 por título (**sem rateio, verificado**)"* — e propõe construir do zero
o modelo de linhas de alocação, com invariante `Σ(alocações) = valor do título` (RN-15).

A afirmação **está correta** no sentido estrito: não existe rateio de 1 título entre N `{centro, categoria,
valor}`. Mas o repositório **já modela uma primitiva de alocação parcial** que o EDD não menciona:

```ts
// reconciliation/types.ts:96 — #141/#247
export type ReconciliationAllocation = Readonly<{
  payableId: PayableId;
  reconciledValueCents: number;
}>;
```

O eixo é outro (1 transação → N títulos, e não 1 título → N centros), então **não é a mesma feature**. Mas
é o mesmo problema de modelagem — dividir um valor entre N destinos com invariante de soma — já resolvido,
com tradução borda→domínio em `confirm-reconciliation.ts:80-86`. É precedente de desenho reusável.

> Isto é o **inverso** do alerta que o próprio EDD levanta na M2 ("reestimar — o override já existe"). Lá
> ele descobriu reuso e mandou baixar a estimativa; aqui ele **deixou de descobrir** reuso, e a §5.2 (40h
> de fundação) está provavelmente superestimada pelo mesmo motivo.

### 4.4 Sobre o acrônimo "EDD"

O comentário do TL no DOC 01 registra:

> *"Sobre essa alucinação de EDD que pelo visto a IA que a P.O usou, inventou o conceito de EDD ->
> provavelmente ela queria que ele falasse de event driven development, ou seja a tecnica de arquitetura
> ecxagonal."*

**Correção factual, porque ela muda a leitura do documento:** *Engineering Design Document* é termo
corrente da indústria — o gênero de documento que precede implementação de porte, difundido pela prática
de "design docs" do Google e adotado amplamente. Não é invenção do gerador.

Duas observações auxiliares: *event-driven* é **arquitetura orientada a eventos** (EDA), que não é sinônimo
de **hexagonal/ports & adapters** — são eixos ortogonais, e este repositório usa os dois (ADR-0006 para
hexagonal, ADR-0015 para o outbox). E o documento **se declara** no cabeçalho, oferecendo conformar-se a
outro template se o time tiver um.

O registro importa porque descartar o documento como "alucinação" tem custo: junto iriam 13 verificações
corretas e a análise de reuso que sustenta a reestimativa da M2.

---

## 5. Análise — o que é sinal e o que é ruído

### Sinal (aproveitável como está)

1. **O mapa de reuso M1–M4.** Verificado, 13/13. É trabalho de leitura de código que o time não precisa
   refazer.
2. **A reestimativa da M2 (D1).** O EDD identifica que o override já existe e que as 54h orçadas assumiam
   construí-lo. Confirmado: `confirm-batch.ts:56-60` aplica os refs.
3. **O gap de portador (M4).** Real e estrutural. `fin_statement_transactions` não tem a dimensão.
4. **A separação spike-antes-de-número** na M4 e na M1. Metodologicamente correta.
5. **As decisões D3 e D4** (fallback de competência nula; mapa de reclassificação contábil) são
   genuinamente da P.O./consultoria, não de engenharia.

### Ruído (a descartar ou tratar com cuidado)

1. **§0 inteira** — camada herdada, não verificada. O `AGENTS.md` é a prova. Os princípios estão certos por
   outra via; não citar o EDD como fonte deles.
2. **Mistura de engenharia com precificação.** O EDD declara-se "só engenharia" e então carrega tabela de
   horas (§10) que replica o DOC 03. Horas por item são estimativa comercial e envelhecem com o código —
   duas das quais o próprio documento já marca para reestimar.
3. **"Verificada no HEAD" como selo global.** Vale para os blocos com citação; não vale para §0.
4. **§5.2 subestima o reuso** (ver 4.3) — a fundação de 40h merece reavaliação antes de virar número.

### Ruído de terceira ordem: o documento tem prazo de validade curto

O `AGENTS.md` caiu **dois dias** antes da verificação declarada. Nas 24h seguintes ao envio, o merge do
#629 mudou de novo o harness. Um documento que cita linha (`types.ts:30-32`) é preciso hoje e frágil
amanhã — e o próprio EDD reconhece isso ao instruir o TL a *"validar os blocos [REUSO] contra o HEAD
atual (o código anda rápido)"*.

Esta inquiry **é** essa validação, com data: 2026-08-06, `7bf29e16`.

---

## 6. Decisão final

**PENDENTE.** Duas decisões independentes:

**(a) Sobre o documento.** A verificação recomenda **aceitar a camada verificada e descartar a §0** — em vez
de aceitar ou rejeitar em bloco. A suspeita que abriu esta inquiry não se confirmou: o EDD descreve o
código atual com precisão de linha.

**(b) Sobre as decisões D1–D6.** Continuam abertas e são o que efetivamente trava escopo:

| # | Decisão | Quem | Status após esta verificação |
| :-- | :--- | :--- | :--- |
| D1 | Escopo real da M2 (override já existe) | TL | **Confirmado que existe** — falta medir o que sobra |
| D2 | V-Expenses: API · webhook · arquivo? | spike + cliente | intocado — bloqueia M4 inteira |
| D3 | Fallback do regime Competência (`competencia` nula) | P.O. | intocado |
| D4 | Mapa de reclassificação contábil das categorias | P.O./consultoria | intocado |
| D5 | Portador: ref a colaborador/parceiro ou cadastro próprio? | TL | gap confirmado real |
| D6 | Spike de segurança do magic-link (M1) | TL | intocado |

**Acrescento D7:** reavaliar a §5.2 à luz do precedente `ReconciliationAllocation` (#141/#247) antes de
travar as 40h da fundação.

---

## 7. Saídas (outputs concretos)

- [x] Verificação das 13 alegações com citação de linha — todas confirmadas
- [x] Identificação da camada não verificada (§0) via `AGENTS.md`
- [x] Precedente de alocação parcial localizado (§5.2 superestimada)
- [ ] D1 — medir o que sobra da M2 depois do override existente
- [ ] D7 — reavaliar §5.2 contra `ReconciliationAllocation`
- [ ] Devolver à P.O.: §0 desatualizada (`AGENTS.md` aposentado em 2026-08-03); pedir que futuras versões
      separem camada verificada de camada herdada
- [ ] D3/D4 — respostas da P.O./consultoria (bloqueiam os dois relatórios)
- [ ] D2/D6 — spikes antes de travar orçamento de M4 e M1
- [ ] Decidir se as 4 melhorias viram issues `enhancement · P0` (DOC 03 §11 propõe)

---

## 8. Referências

- DOC 01 / DOC 02 — EDD M1–M4 + relatórios Nibo, recebidos 2026-08-06 (idênticos; DOC 01 tem comentários do TL).
- DOC 03 — `MELHORIAS-ESCOPO-ADICIONAL.md`, P0, 2026-07-01 (atualizado 2026-07-29).
- Verificação executada sobre `origin/dev` em `7bf29e16` (2026-08-06).
- `AGENTS.md` removido em `7ac90494` (2026-08-03).
- [ADR-0051](../architecture/adr/0051-taxonomy-owner-budget-plan-scoped.md) · [ADR-0022](../architecture/adr/0022-read-models-via-projection-over-event-stream.md) · [ADR-0020](../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) — citados pela §0 e válidos por conta própria.
- Issues: #603 · #135 · #438 · #502 · #604 · #411 (abertas) · #206 · #609 · #590 · #441 · #197 (fechadas).
- Precedente de alocação: `reconciliation/types.ts:96` + `confirm-reconciliation.ts:80-86` (#141/#247).
