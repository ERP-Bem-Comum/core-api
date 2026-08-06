---
paths:
  - 'api-collections/**'
  - 'scripts/e2e/bruno-all.sh'
verify:
  - claim: 'um único script executa a coleção — só ele chama `bru run`'
    root: 'scripts'
    pattern: 'bru run'
    expect:
      - 'scripts/e2e/bruno-all.sh'
  - claim: 'a lista de pastas rodadas é literal e não inclui budget-plans'
    root: 'scripts'
    pattern: 'MAIN_FOLDERS=(0-auth 1-users 2-me 3-roles-permissions 4-auth-security 5-auth-improvements 6-contracts 7-partners 8-programs)'
    expect:
      - 'scripts/e2e/bruno-all.sh'
  - claim: 'o rc de z-pending-fixes entra no exit code do gate'
    root: 'scripts'
    pattern: '[ $RC_MAIN -eq 0 ] && [ $RC_PENDING -eq 0 ]'
    expect:
      - 'scripts/e2e/bruno-all.sh'
---

Coleções `.bru` que exercitam a borda HTTP. Normativo: **[ADR-0038](../../handbook/architecture/adr/0038-bruno-cli-mandatory-and-bru-authoring.md)** — um `.bru` escrito e não executado é cobertura ilusória, e **o resultado do `bru run` é a fonte de verdade, nunca a leitura do arquivo**. Rodar via `pnpm run test:integration:all`, que sobe MySQL + MinIO e boota o servidor real. Para inspecionar o body de uma resposta: `E2E_JSON_REPORT=1 pnpm run test:integration:all` → `test-results/main.json`.

- **O nome `z-pending-fixes` mente — a pasta BLOQUEIA o gate.** Ela nasceu expected-fail, como o ADR-0038 §2 manda isolar, mas os cinco tickets foram implementados e ela virou suíte de **regressão**: a linha final do runner é `[ $RC_MAIN -eq 0 ] && [ $RC_PENDING -eq 0 ]`, e o rc dela entra no exit code. ⚠️ **Não existe hoje pasta expected-fail de verdade** — pôr ali um `.bru` que reprova de propósito derruba o gate inteiro. Renomear foi avaliado e recusado em 2026-08-05: tocaria 17 registros históricos que o [ADR-0057](../../handbook/architecture/adr/0057-claude-md-as-canonical-agent-doc.md) §5 proíbe reescrever, mais errata num ADR imutável — custo maior que o do nome errado. A [Inquiry-0026](../../handbook/inquiries/0026-async-human-in-the-loop-and-drizzle-1-0.md) mede se o Bruno permanece.

- **Existir na coleção não é ser executado: `budget-plans/` tem 14 `.bru` que nenhum runner roda.** As pastas rodadas são uma **lista literal** dentro do script (`MAIN_FOLDERS=(…)`), e `budget-plans` não está nela — nem em nenhum outro script, porque `bruno-all.sh` é o único lugar do repositório que chama `bru run`. São casos reais (403 de bare-user, not-found, payload malformado) parados em cobertura ilusória, exatamente o que a norma do ADR-0038 condena. **Criar `.bru` numa pasta nova não a coloca no gate** — sem editar a lista, o arquivo nasce morto.

- **Um único `bru run` para toda a suíte, senão o token some.** O login por perfil acontece uma vez, em `0-auth/`, e viaja por `bru.setVar`; o encadeamento entre requisições é por `seq` + `setVar`. Rodar pasta a pasta abre processos distintos e **perde a variável** — é o bug do 401 que já custou investigação. Em E2E o rate-limit de login é afrouxado por `AUTH_LOGIN_RATE_LIMIT_MAX`.

- **Sintaxe e fidelidade ao schema real, não ao esperado.** O arquivo começa em `meta {` — **comentário `#` no topo faz o parser do Bruno rejeitar**; nota vai em `meta { docs }`, `folder.bru` ou `//` dentro de `script:*`. O body se escreve **depois de ler o schema Zod da rota**: `z.discriminatedUnion` exige o discriminador (`mode`, `kind`), e `min(1)` e nome exato de campo não perdoam. Dados precisam ser válidos de verdade — CPF/CNPJ por módulo 11 (`scripts/seed-partners.ts`) e UUID v4 real, porque o nil UUID `0000…0000` devolve **400, não 404**.

- **Asserção tolerante ao código real, invariante forte.** Validação de querystring pode responder **400** (Zod) onde se esperaria 422 — aceitar o real (`expect([400, 422]).to.include(status)`) em vez de afrouxar a rota para caber no teste. O que **nunca** se aceita é **500**.
