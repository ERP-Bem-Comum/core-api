# Eixos de Discussão Teórica

Identifique em qual eixo o usuário está e responda no registro adequado.

---

## Eixo 1 — Ratio legis dos princípios

"Por que essa regra existe?"

- **Por que SRP define "uma única razão para mudar" e não "uma única ação"?** → coupling vs cohesion; abstração centrada em forças que mudam o sistema.
- **Por que Uncle Bob defende funções extremamente pequenas?** → reduzir custo cognitivo de leitura; permite naming + composição.
- **Por que Fowler insiste em "rede de testes" antes de refactoring?** → preserva-comportamento sem testes é apenas esperança.
- **Por que Open/Closed parece contraditório?** → resolve o problema de modificar código estável; propõe extensão por composição/herança.
- **Por que DRY não é "não copiar código"?** → duplicação de **conhecimento**, não código sintático.

Sempre cite o trecho do livro que sustenta o "por quê".

---

## Eixo 2 — Comparações entre escolas

- **Clean Code vs Functional Programming.** FP descarta mutação; SOLID assume OO. Terreno comum (imutabilidade, separation of concerns), mas divergem em encapsulamento.
- **Clean Code vs Defensive Programming.** Defensive vê código como hostil; Clean Code vê como cooperativo. São opostos em prioridade.
- **Clean Code vs Pragmatic Programmer (Hunt & Thomas).** Pragmatic é mais leve, "regra de bolso". Clean Code é mais sistemático. Compatíveis.
- **Clean Code vs DDD.** DDD foca **estratégia de modelagem**; Clean Code foca **higiene de código**.
- **Refactoring (Fowler) vs Rewrite.** Refactoring preserva comportamento; rewrite assume mudança radical. Fowler defende refactoring quase sempre.
- **Padrões GoF vs FP composition.** GoF nasceu pra OO; FP resolve com funções de ordem superior. Sinalizar discussão fora dos livros.

Prefira citar Uncle Bob/Fowler/Valente/Shvets falando da escola comparada. Senão, sinalize "comparação externa".

---

## Eixo 3 — Crítica e history of ideas

- **O que envelheceu?** Exemplos em Java pesado (2008), threading pré-async/await, DI só por construtor, visão pré-property-based.
- **O que continua atual?** Naming, função pequena, SRP, comentários como falha de expressividade.
- **Onde a comunidade saiu da rota?** "Clean Code = sempre 4 linhas" (errado); "DRY = nunca copiar" (errado); "SOLID = receita pronta" (errado).
- **Discordâncias entre autores.** Fowler é mais pragmático que Uncle Bob. Valente moderniza posições. Shvets foca padrões sem debates filosóficos.
- **Por que SOLID virou dogma?** Fácil de listar e ensinar. Princípios sem contexto viram cargo cult.
