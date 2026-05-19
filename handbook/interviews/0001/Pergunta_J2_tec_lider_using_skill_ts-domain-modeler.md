---
entrevista: 0001
bloco: J
pergunta: J2
título: "import type vs import { type X } — uniformizar?"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_J2_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J1, K1-K5, L1-L3 na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **Sempre `import type` quando puro tipo.** Razão real (corrigida do PhD): `verbatimModuleSyntax: true` exige a forma explícita — não é argumento de transpiler genérico (nosso Node 24 usa `--experimental-strip-types` direto). Critério para inline: `import { type X, valueY }` quando há **1 tipo + valores**; split em 2 quando há **≥2 tipos + valores**.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

Hoje misturamos: `import type { Brand } from '…'` quando puro, e `import { type Result, ok, err } from '…'` quando misto.

- Uniformizar pra **sempre** `import type` quando puro, mesmo sabendo que `verbatimModuleSyntax` aceita ambos?
- Vantagem de `import { type X, valueY }` sobre `import { X } from ... ; import type { Y } from ...`?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [J1](./Pergunta_J1_tec_lider_using_skill_ts-domain-modeler.md)
