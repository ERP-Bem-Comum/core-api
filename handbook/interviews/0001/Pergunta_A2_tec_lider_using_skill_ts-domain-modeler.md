---
entrevista: 0001
bloco: A
pergunta: A2
título: "Brand é a melhor abstração ou estamos forjando objetos nominais quando o que queremos é parse-once-trust-forever?"
skill: ts-domain-modeler
status: respondida
---

# Pergunta_A2_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`Money = Brand<{ readonly cents: number }, 'Money'>` é, na prática, um proof-carrying value: "este número de centavos passou por `fromCents()` então é seguro".

- Brand-via-intersection, brand-via-`unique symbol`, ou opaque type via module-private?
- Zod / Effect Schema como single source of truth de parse + tipo + erro?
- Phantom field via `unique symbol` muda algo além de estética?

## R (PhD)

Capturou exatamente a essência da máxima de Alexis King: "consumir entrada menos estruturada e produzir saída mais estruturada, preservando na tipagem o fato de que a validação ocorreu". Wlaschin idem: usar wrappers para evitar primitive obsession e separar conceitos do domínio das representações.

- **Preferido:** tipo opaco protegido por módulo (`export type Money` sem exportar estrutura interna, exportando apenas o construtor) — é o mais puro e seguro.
- **Zod/Effect Schema casam perfeitamente** com "Parse, don't validate". Operam nas fronteiras (Ports/Adapters), transformando dados brutos em tipos de domínio. Eliminam boilerplate manual de erro + tipo + parser.
- **Phantom field via `unique symbol`** afeta principalmente ergonomia (mensagens de erro mais limpas).

## Rules emergentes

- **CONSIDER:** Zod / Effect Schema como fonte única de parse + tipo + erro **na borda**.
- **DO:** Brand apenas em VOs folha; smart constructor é o único ponto de cast.

## Cross-refs

- [A1](./Pergunta_A1_tec_lider_using_skill_ts-domain-modeler.md), [A3](./Pergunta_A3_tec_lider_using_skill_ts-domain-modeler.md), [A4](./Pergunta_A4_tec_lider_using_skill_ts-domain-modeler.md)
