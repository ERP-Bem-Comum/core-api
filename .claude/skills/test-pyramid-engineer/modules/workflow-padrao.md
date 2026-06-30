# Workflows Padrão — test-pyramid-engineer

---

## "Esse teste é unit ou integration?" (classificar)

1. Aplique a árvore de decisão em [`mapa-camadas.md`](mapa-camadas.md) §"Heurística".
2. Confirme o double: unit usa **fake** do projeto; integration usa a dependência **real**.
3. Confirme o gate: integration/e2e-mysql **só** atrás de `*_INTEGRATION=1`.
4. Se toca IO e roda em `pnpm test` puro → **mal-classificado**: aponte a correção do gate.
5. Cite Vocke sobre o escopo da camada.

## "Estou mockando demais?" (auditar doubles)

1. Liste cada double do teste e o que ele substitui.
2. Para cada um: cabe um **fake** do projeto (`clock-fixed`, `*.in-memory`) em vez de mock?
3. Mock de verificação de interação só se justifica quando a **interação É o comportamento**
   (ex.: "publicou o evento X"). Caso contrário, prefira fake + asserção de estado.
4. Sinal de alarme: mock que espelha a implementação → o teste vira cópia do código.
5. Cite Beck sobre isolar dependência vs testar comportamento real.

## "O que falta testar?" (buracos por risco)

1. Pergunte/infira o **risco** do alvo: criticidade × taxa de mudança.
2. Liste os caminhos não-triviais (bordas, erros, invariantes) — não os getters.
3. Cruze com os testes existentes (mirror `tests/` ↔ `src/`). Marque descobertos.
4. Priorize: alto risco descoberto primeiro; getter trivial super-testado → sugira remover.
5. Saída no formato de [`output-estruturado.md`](output-estruturado.md) §"Mapa de cobertura".

## "Tem teste duplicado entre camadas?" (empurrar pirâmide abaixo)

1. Procure a mesma asserção de regra em e2e/integration **e** em unit.
2. Se a regra já é coberta embaixo, o teste de cima é **baggage** — delete sem dó.
3. Se a regra só existe em cima, **empurre-a para baixo**: extraia a unidade testável.
4. Cite Vocke (`:1003`, "Avoid Test Duplication": _"Every single test (…) is additional
   baggage and doesn't come for free"_).

## "A suíte está bem gateada?" (velocidade)

1. Ordene mentalmente: unit (ms) → integration (s, Docker) → e2e.
2. Verifique que falha barata interrompe antes da cara (fail-first).
3. Garanta que nada que sobe Docker roda no caminho rápido `pnpm test`.
4. Ligue à política de regressão zero: vermelho de integração é corrigido **ou** o gate é
   consertado com prova de verde no home certo — nunca escondido com `skip`.
