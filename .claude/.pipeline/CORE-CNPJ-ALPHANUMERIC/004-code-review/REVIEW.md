# W2 — Code Review (CORE-CNPJ-ALPHANUMERIC)

**Veredito:** ✅ APPROVED · **Disciplina:** code-reviewer (read-only) · **Round:** 1/3
**Blocker:** 0 · **Major:** 0 · **Minor:** 1 (achado externo, fora de escopo)

## Escopo revisado

`src/shared/kernel/cnpj.ts` + `tests/shared/kernel/cnpj.test.ts` + ADR-0044 + CHANGELOG/README.

## Conformidade

- **Domínio puro (`.claude/rules/domain.md`):** função pura sem IO; `Result<Cnpj, CnpjError>`
  (sem `throw`); sem `class`/`this`; sem `any`; branded type `Cnpj`; tudo imutável. ✅
- **Idioma:** docstring PT, código EN, erro kebab `'invalid-cnpj'`. ✅
- **Correção da fórmula:** módulo 11 + `valor(c)=charCodeAt−48` confere com a NT Serpro;
  `12ABC34501DE → 35` bate com o exemplo oficial; conferido computacionalmente. ✅
- **Retrocompat:** `11222333000181` e degenerados (`00000000000000`, `11111111111111`)
  seguem com o mesmo veredito do VO numérico anterior. ✅
- **Edge cases:** DV não-numérico é barrado pelo `CNPJ_SHAPE` (`[0-9]{2}` final) antes do
  cálculo, então `Number(value[12..13])` nunca é `NaN`; normalização cobre máscara + caixa. ✅
- **Robustez do `parse`:** brand sobre `normalize(raw)` — consistente com a chave de
  comparação usada por `findByCnpj` dos repositórios (sempre uppercase, sem máscara). ✅

## Minor (fora de escopo — não bloqueia)

1. O índice `handbook/architecture/adr/README.md` **não lista os ADRs 0038–0042** (débito
   pré-existente nesta branch `dev`). Não introduzido por este ticket; o 0044 foi indexado
   corretamente. Registrar como issue de documentação (não consertar aqui — anti-padrão #15).

## Pendente para o W3

Não-regressão cross-BC (`supplier`/`financier`/`act`/`contracts`) via `pnpm test` completo.
