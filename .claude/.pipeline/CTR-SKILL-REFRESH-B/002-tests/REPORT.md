# W0 REPORT — CTR-SKILL-REFRESH-B

> **Wave:** W0 RED — Documental
> **Skill:** `tdd-strategist`
> **Data:** 2026-05-21
> **Estado:** RED — 1/10 PASSED (esperado)

---

## Script produzido

`002-tests/verify-skill-refresh-b.sh` — executável (`chmod +x`).

Fix POSIX aplicado em CA7: `grep -c` com `; true` — lição do SKILL-REFRESH-C.

---

## Saída literal do script (W0 RED)

```
Verificando: .../skills/ts-domain-modeler/SKILL.md
---
[FAIL] CA1: Seção §3.B existe (## §3.B — Smart Constructor Canônico)
[FAIL] CA2: 9 sub-seções presentes (Brand Modernizado, Wrapper-Brand, Module-as-Namespace, Smart Constructor, Identidade Fixa, Migração Big-Bang, Template Canônico, Tabela, Tickets vivos)
[FAIL] CA3: Contagem exata declarada: **DO (9)**, **DON'T (9)**, **CONSIDER (4)** presentes
[FAIL] CA4: Wrapper-brand e Primitivo-brand ambos presentes como strings literais
[FAIL] CA5: Strings literais unicode symbol, Brand<T, K>, BrandOf presentes
[FAIL] CA6: Facade immutable(), deepImmutable presentes + Object.freeze mencionado em DON'T
[FAIL] CA7: Template Money obsoleto eliminado: zero ocorrências de export const Money = {
[FAIL] CA8: 4 tickets vivos referenciados
[PASS] CA9: src/ e tests/ intocados pelo ticket
[FAIL] CA10: Fidelidade ao código vivo: fromCents e Number.MAX_SAFE_INTEGER presentes
---
Result: 1/10 PASSED
Status: RED — 9 critério(s) falhando.
```

---

## Análise por critério

| CA | Status | Causa |
| :-- | :---- | :---- |
| CA1 | FAIL | Seção §3.B ausente na SKILL.md |
| CA2 | FAIL | 9 âncoras temáticas exclusivas da §3.B inexistentes |
| CA3 | FAIL | Marcadores DO(9)/DONT(9)/CONSIDER(4) ausentes |
| CA4 | FAIL | Strings Wrapper-brand e Primitivo-brand ausentes |
| CA5 | FAIL | unique symbol, Brand<T,K>, BrandOf ausentes da SKILL.md |
| CA6 | FAIL | immutable(, deepImmutable, Object.freeze ausentes |
| CA7 | FAIL | SKILL.md linha 238: export const Money = { (Padrão A ainda presente) |
| CA8 | FAIL | 4 tickets vivos não referenciados na SKILL.md |
| CA9 | PASS | Nenhum arquivo em src/ ou tests/ staged |
| CA10 | FAIL | Number.MAX_SAFE_INTEGER ausente; §3.B inexistente |

---

## Decisões âncoras para W1

Inserir §3.B antes de §3.D (ordem B->C->D).
Substituir template Money (linhas ~228-256) pelo Padrão D canônico.
Strings obrigatórias: listadas na Âncora 3 do REPORT.
CA7 ausência: grep-c deve retornar 0 apos W1.
Changelog: adicionar entrada 2026-05-21.

## Critério de saída do W1

bash verify-skill-refresh-b.sh retorna exit 0 com Result: 10/10 PASSED.
