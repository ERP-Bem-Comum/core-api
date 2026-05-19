---
entrevista: 0001
bloco: K
pergunta: K3
título: "Const type parameters (TS 5.0+) — smart constructor + literal preservado"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_K3_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J/K/L na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **AVOID**. A maioria dos nossos VOs processa primitivos (`string`/`number`) que já sofrem **coerção para Brand** (`Instant`, `Money`, `NonZeroMoney`). O `<const T>` em assinaturas adiciona ruído visual sem ganho proporcional. Aceitar só em casos específicos (constantes de tarifa fixa, dias úteis com prova literal) — caso-a-caso, justificado em JSDoc.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

`Money.fromCents(100)` poderia, com `const T`, inferir `Money` com `cents: 100` literal preservado, permitindo prova em compile time.

- Usar em algum lugar do domínio?
- Smart constructor + literal seria fonte de **provas** estáticas (ex.: constantes de tarifa fixas)?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [B2](./Pergunta_B2_tec_lider_using_skill_ts-domain-modeler.md)
