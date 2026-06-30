# Anti-Padrões Locais — test-pyramid-engineer

- ❌ Classificar camada sem citar Vocke (`skills_citar`, ≥4 linhas com grounding).
- ❌ Recomendar **mock** onde o projeto tem **fake** (`clock-fixed.ts`, `*.in-memory.ts`).
- ❌ Mockar a interação quando a asserção de **estado** já prova o comportamento.
- ❌ Deixar teste de IO real (MySQL/S3/SMTP) rodando em `pnpm test` puro — é gate
  mal-classificado, não "teste lento aceitável".
- ❌ Tratar a pirâmide como proporção fixa em vez de heurística custo/feedback.
- ❌ Manter teste de alto nível que duplica regra já coberta embaixo — é baggage, deletar.
- ❌ Testar método privado / estrutura interna em vez de comportamento observável.
- ❌ Confundir "contract test" local (port↔adapter, via `.suite.ts`) com CDC de microserviço.
- ❌ Esconder vermelho de integração com `skip` sem provar verde no home `test:integration`
  (ofende a política de regressão zero do AGENTS.md).
- ❌ Invadir o terreno do `tdd-strategist` (qual o próximo teste / red-green-refactor) — aqui
  decidimos **arquitetura** da suíte; handoff para a skill irmã quando o foco mudar.
