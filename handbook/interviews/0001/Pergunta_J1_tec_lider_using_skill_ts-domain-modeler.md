---
entrevista: 0001
bloco: J
pergunta: J1
título: "Imports relativos profundos vs subpath imports vs barrels"
skill: ts-domain-modeler
status: superseded
superseded_por: J+K+L
---

# Pergunta_J1_tec_lider_using_skill_ts-domain-modeler

> ⚠️ **SUPERSEDED** — unificada com J2, K1-K5, L1-L3 na pergunta de fechamento.
>
> **Veja a versão canônica:**
> - [`Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md`](./Pergunta_J_K_L_tec_lider_using_skill_ts-domain-modeler.md)
>
> Resolução: **Opção C — relativos intra-BC + subpath cross-BC**. `package.json#imports` declara `#kernel/*`, `#shared/*`, `#src/*` (legado de tests). `index.ts` barrel mantido por agregado pra habilitar `import * as Contract`.

---

## Q original (mantida para histórico)

> **Status:** pendente
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host)

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
```

Quatro níveis. Em refactor de pasta vira caos.

- Defender **subpath imports** (`#shared/result.ts`) por padrão em **toda** parte do código (não só nos testes como hoje)?
- Argumento oposto — relativos curtos forçam coesão (se o caminho ficou longo, talvez não devesse importar).
- Barrel exports (`domain/shared/index.ts`) ou condenado por mascarar dependências?

## R (PhD)

_pendente_

## Rules emergentes

_aguardando fechamento_

## Cross-refs

- [J2](./Pergunta_J2_tec_lider_using_skill_ts-domain-modeler.md)
