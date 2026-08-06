---
name: inquiry
description: >
  Consultar ou abrir uma inquiry — o acervo de investigações do core-api em
  `handbook/inquiries/`. Use ANTES de investigar do zero qualquer decisão técnica
  ("qual driver/linter/runtime usar", "por que escolhemos X", "isso já foi
  estudado?"), e SEMPRE que uma pergunta exigir pesquisa antes de decidir, houver
  divergência entre doc e código, ou for preciso pesar 2+ alternativas. Aciona em
  "já pesquisamos isso?", "abre uma inquiry", "por que decidimos assim?", "isso
  contradiz o ADR", "qual o estado da pesquisa sobre X". NÃO é para bug ou ticket
  operacional (`issue-report`), nem para decisão já estável (ADR direto).
---

# inquiry — o acervo de investigação do core-api

29 investigações registradas desde 2026-04. Antes de pesquisar qualquer decisão técnica,
**verifique se ela já foi investigada** — metade das perguntas que parecem novas já têm
resposta com evidência aqui.

## Consultar

```bash
# o índice, com estado e o que cada uma espera
cat handbook/inquiries/INDEX.md

# por tema
grep -ril "<termo>" handbook/inquiries/0*.md

# por estado (o frontmatter é a fonte de verdade)
grep -l "^state: open" handbook/inquiries/0*.md
grep -l "^state: blocked" handbook/inquiries/0*.md
```

## Os cinco estados

| Estado       | Significa                                    | Quem destrava         |
| :----------- | :------------------------------------------- | :-------------------- |
| `open`       | investigação em curso                        | quem trabalha nela    |
| `blocked`    | espera terceiro (banca, upstream, P.O.)      | o terceiro            |
| `decided`    | respondida — o que sobrou virou ADR ou issue | ninguém; está fechada |
| `deferred`   | adiar FOI a decisão, com gatilho declarado   | o gatilho             |
| `superseded` | revisada por outra inquiry                   | —                     |

`tests/cleanup/inquiry-hygiene.test.ts` trava estado inválido e índice fora de sincronia.

## Como o acervo se relaciona com o resto

O erro clássico é tratar um formato como universal. Aqui cada artefato faz uma coisa:

| Artefato                       | Captura                            | Mutável?                         |
| :----------------------------- | :--------------------------------- | :------------------------------- |
| `handbook/architecture/adr/`   | a decisão tomada e seu porquê      | **não** — imutável; supersede-se |
| `handbook/inquiries/`          | o raciocínio ATÉ a decisão         | sim, vive enquanto investiga     |
| `handbook/specs/`              | o que foi especificado por feature | histórico, congelado             |
| `.claude/rules/` · `CLAUDE.md` | a instrução vigente                | sim                              |

Inquiry **decidida** que virou norma aponta para o ADR que gerou. Não duplicar a norma aqui:
a inquiry guarda o caminho, o ADR guarda o destino.

## Abrir uma nova

Copie [`_template.md`](../../../handbook/inquiries/_template.md), pegue o próximo número livre,
preencha o frontmatter e registre no `INDEX.md` (o teste cobra a sincronia).

**Abra** quando: houver dúvida arquitetural que exige pesquisa antes de decidir; doc oficial
divergir da implementação; for preciso pesar 2+ alternativas; ou você precisar explicar essa
decisão a alguém em 6 meses.

**Não abra** para bug ou ticket operacional (use [`issue-report`](../issue-report/SKILL.md)),
regra de negócio com a P.O. (`handbook/domain_questions/`), nem decisão já estável (ADR direto).

## Duas disciplinas que este acervo cobra

**Insumo externo é verificado antes de virar registro.** As inquiries 0028 e 0029 conferiram
alegação por alegação — de um EDD da P.O. e de um texto sobre TS 7 — contra o código e contra
fontes primárias, e as duas acharam erro que teria custado decisão errada. Texto que cita
arquivo e linha não pede confiança: pede conferência.

**Saída pendente vira issue, não fica no documento.** Uma inquiry `decided` com checkboxes
abertos é decisão que ninguém executou se passando por trabalho concluído — o acervo tinha 37
dessas em 2026-08-06. Ao fechar, converta o que sobrou em issue e deixe o link.
