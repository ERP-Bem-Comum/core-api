---
paths:
  - 'api-collections-hurl/**'
  - 'tests/fixtures/http-edge/**'
---

Suíte da borda HTTP em **Hurl** — normativo: **[ADR-0074](../../handbook/architecture/adr/0074-hurl-replaces-bruno-http-edge-suite.md)**. O resultado do runner é a fonte de verdade, nunca a leitura do arquivo.

- ⚠️ **`api-collections/` e os 266 `.bru` foram REMOVIDOS em 2026-10-06**, com o `@usebruno/cli` (−317 pacotes). O [ADR-0034](../../handbook/architecture/adr/0034-adopt-bruno-api-client-cli.md) e o [ADR-0038](../../handbook/architecture/adr/0038-bruno-cli-mandatory-and-bru-authoring.md) estão `Superseded` — não citar nenhum dos dois como norma. O que o 0038 estabeleceu e continua valendo está reafirmado no §5 do ADR-0074. Registro histórico (`handbook/specs/**`, `tickets/**`, `CHANGELOG`) **não** foi reescrito e ainda descreve o Bruno: era verdade quando foi escrito.

- **A suíte convertida está `.gitignore`d, e isso não é descuido.** `api-collections-hurl/` (241 requests em 23 arquivos sob `casos/`) e `api-collections-http/` são uso interno enquanto o seed E2E não existir. O `.hurl` **nasce sem segredo** (variável vem de `--variables-file`), então é versionável no dia em que virar gate; o `.http` **não é** — ele só funciona com o token colado dentro do arquivo.

- **Ainda não há gate E2E da borda, e isso é anterior à troca de ferramenta.** O `bruno-all.sh` caiu em 05/10 e nada o substituiu: medido em 06/10, **82 de 241** requests executam, o resto para em variável indefinida — 8 perfis de token que exigem o **seed E2E** (nenhum e-mail do environment existe no banco de dev) e IDs criados em outro arquivo. Não citar um `.hurl` daqui como prova de que uma rota funciona sem ter rodado.

- **`[Captures]` não cruzam arquivos** (medido: capture em `a.hurl` + uso em `b.hurl`, mesmo comando, `--jobs 1` → `you must set the variable`). Então ou o arquivo é autocontido (login → ações), ou o token vem de `--variables-file`. **`--jobs 1` é obrigatório**: `--test` paraleliza por default e o rate limit de login (5/min) é compartilhado — dois arquivos logando se auto-envenenam com `429`. **`--continue-on-error`** em CI, porque o Hurl para no primeiro assert que falha dentro do arquivo.

- **`hurlfmt --check` antes de commitar.** É o único gate de sintaxe que existe (não há LSP nem JSON schema), e pega o que passa batido na leitura: `{{process.env.X}}` — sintaxe do Bruno — é truncado para `{{process}}` **sem erro**, e body de texto sem a cerca ```` ``` ```` faz a primeira palavra do corpo ser lida como método HTTP.

- **Asserção tolerante ao código real, invariante forte.** Validação de querystring pode responder **400** (Zod) onde se esperaria 422 — aceitar o real em vez de afrouxar a rota para caber no teste. O que **nunca** se aceita é **500**; sem status conhecido, o request afirma `[Asserts] status < 500`.

- **Dado de cadastro é sintético, e CPF precisa ser único por criação.** `auth_user_cpf_idx` (migration 0010) recusa documento repetido: a coleção reusava **um** CPF em 11 requests de criação e só o primeiro passaria. CPF/CNPJ por módulo 11, UUID v4 real (o nil UUID devolve **400**, não 404), e `{{newUuid}}` para valor único por execução. **CPF inválido de propósito se preserva** — há teste que depende dele para exercitar o 422.

- **Fixture binário de upload vive em [`tests/fixtures/http-edge/`](../../tests/fixtures/http-edge/)**, versionado, não dentro das pastas de saída — que são gitignored e levariam o arquivo para fora do git. Os caminhos nos `.hurl`/`.http` são relativos ao arquivo e variam com a profundidade (`casos/users.hurl` vs `casos/regressao/distrato.hurl`).
