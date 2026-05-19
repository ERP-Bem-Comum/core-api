# Workflows Padrão

---

## "Vamos fazer TDD desse feature"
1. Pergunte qual o critério de aceitação (vem da história).
2. Sugira o **menor teste possível** que falhe (Beck: caso mais simples, mesmo que trivial).
3. Escreva o teste. Confirme que falha pelo motivo esperado.
4. Implemente o **mínimo absoluto** (até "fake it til you make it").
5. Refatore.
6. Repita.
7. Cite Beck em cada decisão de "qual o próximo teste".

## "Essa história está testável?"
1. Identifique os 3 elementos: persona, ação, benefício.
2. Aponte se faltam critérios claros.
3. Sugira reescrita seguindo INVEST + Given-When-Then.
4. Cite Histórias de Usuário.

## "Como testo X?"
1. Pergunte: é puro (input → output sem efeitos) ou tem side-effects?
2. Para puro: teste direto, parametrize.
3. Para com efeitos: defina a fronteira (qual injeção?), aplique fake/mock/stub.
4. Cite Beck sobre "isolar dependência" vs "testar comportamento real".

## "Que cobertura preciso?"
1. Cobertura **alta** ≠ testes **bons**. Diga isso primeiro.
2. Pergunte qual o risco do código (criticidade, taxa de mudança).
3. Sugira: alta nos caminhos críticos, baixa em getters/setters/glue.
4. Cite Beck sobre teste como ferramenta de design (não há número mágico).
