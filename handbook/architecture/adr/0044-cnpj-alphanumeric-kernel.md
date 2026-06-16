[← Voltar para ADRs](./README.md)

# ADR-0044: CNPJ alfanumérico (Serpro/Receita 2026) no VO `Cnpj` do kernel

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Gabriel (tech lead / arquiteto).
- **Estende:** [ADR-0031](./0031-partners-registry-module.md) §4 (VO `Cnpj` promovido ao kernel como fonte cross-BC) · [ADR-0006](./0006-modular-monolith-core-api.md) (kernel compartilhado vs isolamento de módulos) · [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) (persistência `varchar`).

---

## Contexto

A Receita Federal passa a emitir, a partir de **07/2026**, o **CNPJ alfanumérico**: as 12 primeiras posições (raiz + estabelecimento) podem conter `0-9A-Z`; os **2 dígitos verificadores continuam numéricos**. O cálculo do DV é o **mesmo módulo 11**, com os **mesmos pesos** do CNPJ atual — muda apenas a conversão do caractere para número antes da conta:

```
valor(c) = ASCII(c) − 48      // '0'..'9' → 0..9 ; 'A'..'Z' → 17..42
```

Como dígito e letra passam pela mesma fórmula, o algoritmo é **retrocompatível**: um CNPJ 100% numérico valida idêntico ao de hoje.

O VO `Cnpj` (`src/shared/kernel/cnpj.ts`) — fonte única cross-BC promovida ao kernel pelo ADR-0031 §4, consumida por `supplier`, `financier`, `act` e pelo import legado de `contracts` — só validava **numérico**. Seu docstring referenciava um VO alfanumérico em `financial/domain/shared/tax-id.ts` que **nunca existiu** (referência stale). O checksum já usava `charCodeAt − 48`; faltavam apenas a **normalização** (uppercase, manter `A-Z`) e o **formato**.

---

## Decisão

**Estender o VO `Cnpj` do kernel** para o formato alfanumérico, mantendo retrocompatibilidade — em vez de criar um VO separado por módulo (que duplicaria o módulo 11 e divergiria os BCs).

### Regra de validação

| Etapa | Regra |
| --- | --- |
| Normalização | remove máscara (`.` `/` `-` espaços) + `toUpperCase()`, **mantendo** `A-Z` |
| Formato | `^[0-9A-Z]{12}[0-9]{2}$` — 12 alfanuméricos + 2 DVs numéricos |
| Degenerado | rejeita os 14 caracteres idênticos (`00000000000000`, …) |
| Checksum | módulo 11, pesos `[5,4,3,2,9,8,7,6,5,4,3,2]` (DV1) / `[6,5,4,3,2,9,8,7,6,5,4,3,2]` (DV2), `valor(c)=ASCII(c)−48` |

O **valor brandado** (`Cnpj`) passa a ser os **14 caracteres uppercase sem máscara** — pode conter letras.

### Exemplos

- `11222333000181` (numérico legado) → válido (retrocompat).
- `12ABC34501DE35` (≡ `12.ABC.345/01DE-35`) → válido.
- `12abc34501de35` → válido, normaliza para `12ABC34501DE35`.
- `12ABC34501DE34` (DV errado) / `12ABC34501DEAB` (DV não-numérico) → inválidos.

---

## Consequências

**Positivas:**

- Fonte única cross-BC: todos os módulos passam a aceitar o CNPJ alfanumérico sem duplicar regra.
- Retrocompatível — nenhum CNPJ numérico existente é invalidado.
- Sem migration: a persistência é `varchar` (ADR-0020) e comporta os 14 caracteres alfanuméricos.

**Negativas / trade-offs:**

- O valor brandado pode conter letras: camadas que assumiam "só dígitos" (máscaras de UI, exports, eventuais `CHECK`/REGEXP de schema — **inexistentes hoje**) precisam revisão quando o CNPJ alfanumérico real entrar em circulação.
- Eventos de integração que descrevem `document` como "14 dígitos" (ex.: ADR-0043, na feature 013) devem passar a dizer "14 caracteres alfanuméricos".

---

## Referências

- Nota Técnica Serpro/Receita Federal — CNPJ alfanumérico (módulo 11, `ASCII − 48`, DVs numéricos).
- [ADR-0031](./0031-partners-registry-module.md) §4 — VO `Cnpj` no kernel (fonte cross-BC).
- [ADR-0006](./0006-modular-monolith-core-api.md) — kernel compartilhado.
- [ADR-0020](./0020-mysql-only-supersedes-dual-dialect.md) — persistência `varchar`.
