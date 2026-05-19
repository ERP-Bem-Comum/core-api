# Eixos de Discussão Teórica

---

## Eixo 1 — Ratio legis das práticas TDD

- **Por que passos pequenos?** Decisão pequena → menos lugares pra errar; debugging mais barato; design emerge melhor.
- **Por que Red precisa falhar pelo "motivo certo"?** Falsos negativos viram falsos positivos depois.
- **Por que Fake It primeiro, depois Triangulation?** Reduzir incerteza em 2 dimensões.
- **Por que TDD = design tool?** Tornar código testável força redução de acoplamento.
- **Por que cobertura ≠ qualidade?** Cobertura mede execução, não asserção.

---

## Eixo 2 — Comparações entre escolas

- **Detroit/Classic (Beck) vs London/Mockist (Freeman & Pryce).** Detroit prefere fakes/dependências reais; London mocka tudo. Discussão fora do livro do Beck — sinalize.
- **TDD vs BDD.** BDD traz vocabulário pro stakeholder não-técnico. É TDD com cosmética + ATDD.
- **TDD vs ATDD.** ATDD foca em testes de aceitação primeiro (top-down); TDD em unit-first (bottom-up).
- **TDD vs Property-Based Testing.** Property-based gera entradas; TDD usa exemplos curados. Complementares.
- **Pirâmide (Cohn) vs Testing Trophy (Kent C. Dodds) vs Diamond.** Cada uma é resposta a uma realidade tecnológica diferente — sinalize externa.
- **TDD vs Mutation Testing.** Mutation testing ataca qualidade do teste; TDD garante que existem testes. Complementares.

---

## Eixo 3 — Crítica e history of ideas

- **DHH "TDD is dead" (2014).** TDD destrói design? Defensores: testes ruins destroem design; TDD bem feito ajuda.
- **James Coplien "Why most unit testing is waste" (2014).** Critica unit testing isolado do design arquitetural.
- **O que envelheceu?** Exemplos em Java pré-2010, sem async/await; threading datado.
- **O que continua atual?** Ciclo, padrões de teste, "design tool not validation tool".
- **Por que TDD virou dogma?** "100% de cobertura" virou métrica de gestão; perdeu a essência.
