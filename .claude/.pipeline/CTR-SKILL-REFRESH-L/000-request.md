# 000 — Request CTR-SKILL-REFRESH-L

> **Bloco L — Documental.** §3.L (Síntese Canônica — índice consolidado dos blocos refreshed) na SKILL.md. `src/`/`tests/` intocados.
> 16º ticket Opção B (último da série SKILL-REFRESH).

## Escopo

L é a **síntese final** da entrevista 0001. Tabela L3 canônica declara **40 DO + 16 CONSIDER + 5 AVOID + 44 DON'T = 105 entradas** (host expandiu de 16 → 105).

**Decisão deste ticket:** §3.L NÃO duplica todas as 105 entradas. Em vez disso, vira **índice consolidado** com:

1. **Tabela visão-geral** por categoria — cada categoria mostra o **total** e linka para a seção específica que detalha:
   | Categoria | Total | Detalhada em |
   | :--- | ---: | :--- |
   | DO | 40 | §3.A (3), §3.B (9), §3.C (5), §3.D (10), §3.H (6), §3.I (7) = 40 |
   | DON'T | 44 | §3.A (3), §3.B (9), §3.C (5), §3.D (7), §3.H (6), §3.I (6) + 8 não-refreshed (E/F/G/J/K) = 44 |
   | CONSIDER | 16 | §3.A (1), §3.B (4), §3.C (2), §3.D (2), §3.H (2), §3.I (3) + 2 não-refreshed = 16 |
   | AVOID | 5 | Categoria nova do Bloco K — placeholder até K ser refreshed |
2. **Mapa de Cross-refs** mostrando relações entre seções (e.g., §3.B.4 ↔ §3.A.2 — single cast).
3. **Tickets vivos consolidados** (todos os CTR-* que aplicaram cada bloco).
4. **Glossário de termos canônicos** (Wrapper-brand, Primitivo-brand, Tagged Error, Smart Constructor, Refinement Constructor, VO como Prova, Agregado como Guardião, Caso de Uso como Orquestrador, Functional Core, Imperative Shell, Padrão D — module-as-namespace, Shared Kernel).
5. **Blocos NÃO refreshed** com status — E (E1/E2 pendente; E3 transversal aplicado), F, G, J, K pendentes. Linkar tickets-fonte quando existirem.

## Strings âncoras

- `## §3.L`
- `40 DO`, `44 DON'T`, `16 CONSIDER`, `5 AVOID`
- `Síntese Canônica`
- Glossário: `Wrapper-brand`, `Primitivo-brand`, `Tagged Error`, `Smart Constructor`, `Refinement Constructor`, `Padrão D`, `Shared Kernel`
- Mapa cross-refs: `§3.A`, `§3.B`, `§3.C`, `§3.D`, `§3.H`, `§3.I`

## CAs

- **CA1** §3.L existe.
- **CA2** Tabela visão-geral por categoria com totais (40/44/16/5).
- **CA3** Glossário com 11+ termos canônicos.
- **CA4** Mapa cross-refs entre §3.A-§3.I.
- **CA5** Blocos não-refreshed listados (E/F/G/J/K) com status.
- **CA6** Tickets vivos consolidados.
- **CA7** `src/`/`tests/` intocados; gates verdes.

## Pipeline (4 waves padrão).
