---
paths:
  - 'api-collections/**'
---

Coleções `.bru` que exercitam a borda HTTP. Normativo: **[ADR-0038](../../handbook/architecture/adr/0038-bruno-cli-mandatory-and-bru-authoring.md)** — um `.bru` escrito e não executado é cobertura ilusória, e **o resultado do `bru run` é a fonte de verdade, nunca a leitura do arquivo**.

- ⚠️ **Desde 2026-10-05 nenhum runner executa `api-collections/core-api`.** O `scripts/e2e/bruno-all.sh`, único lugar que chamava `bru run` sobre a coleção inteira, foi apagado por estar desatualizado, e com ele o `pnpm run test:integration:all`. A coleção está, inteira, na situação que o ADR-0038 chama de cobertura ilusória — **não citar um `.bru` daqui como prova de que uma rota funciona**. O sucessor (QA + pen-test por arquivos `.rest`) está em construção; até ele entrar no repositório com runner próprio, a borda HTTP não tem gate E2E.

- **O nome `z-pending-fixes` mente.** A pasta nasceu expected-fail, como o ADR-0038 §2 manda isolar, mas os cinco tickets foram implementados e ela virou suíte de **regressão** no runner apagado. Renomear foi recusado em 2026-08-05: tocaria 17 registros históricos que o [ADR-0057](../../handbook/architecture/adr/0057-claude-md-as-canonical-agent-doc.md) §5 proíbe reescrever. A [Inquiry-0026](../../handbook/inquiries/0026-async-human-in-the-loop-and-drizzle-1-0.md) mede se o Bruno permanece.

- **Um único `bru run` para toda a suíte, senão o token some.** O login por perfil acontece uma vez, em `0-auth/`, e viaja por `bru.setVar`; o encadeamento entre requisições é por `seq` + `setVar`. Rodar pasta a pasta abre processos distintos e **perde a variável** — é o bug do 401 que já custou investigação. Em E2E o rate-limit de login é afrouxado por `AUTH_LOGIN_RATE_LIMIT_MAX`.

- **Sintaxe e fidelidade ao schema real, não ao esperado.** O arquivo começa em `meta {` — **comentário `#` no topo faz o parser do Bruno rejeitar**; nota vai em `meta { docs }`, `folder.bru` ou `//` dentro de `script:*`. O body se escreve **depois de ler o schema Zod da rota**: `z.discriminatedUnion` exige o discriminador (`mode`, `kind`), e `min(1)` e nome exato de campo não perdoam. Dados precisam ser válidos de verdade — CPF/CNPJ por módulo 11 (`scripts/seed-partners.ts`) e UUID v4 real, porque o nil UUID `0000…0000` devolve **400, não 404**.

- **Asserção tolerante ao código real, invariante forte.** Validação de querystring pode responder **400** (Zod) onde se esperaria 422 — aceitar o real (`expect([400, 422]).to.include(status)`) em vez de afrouxar a rota para caber no teste. O que **nunca** se aceita é **500**.
