---
paths:
  - 'api-collections-hurl/**'
  - 'tests/fixtures/http-edge/**'
---

Suíte da borda HTTP em **Hurl** — normativo: **[ADR-0074](../../handbook/architecture/adr/0074-hurl-replaces-bruno-http-edge-suite.md)**. O resultado do runner é a fonte de verdade, nunca a leitura do arquivo.

- ⚠️ **`api-collections/` e os 266 `.bru` foram REMOVIDOS em 2026-10-06**, com o `@usebruno/cli` (−317 pacotes). O [ADR-0034](../../handbook/architecture/adr/0034-adopt-bruno-api-client-cli.md) e o [ADR-0038](../../handbook/architecture/adr/0038-bruno-cli-mandatory-and-bru-authoring.md) estão `Superseded` — não citar nenhum dos dois como norma. O que o 0038 estabeleceu e continua valendo está reafirmado no §5 do ADR-0074. Registro histórico (`handbook/specs/**`, `tickets/**`, `CHANGELOG`) **não** foi reescrito e ainda descreve o Bruno: era verdade quando foi escrito.

- **A suíte convertida está `.gitignore`d, e isso não é descuido.** `api-collections-hurl/` (241 requests em 23 arquivos sob `casos/`) e `api-collections-http/` são uso interno enquanto o seed E2E não existir. O `.hurl` **nasce sem segredo** (variável vem de `--variables-file`), então é versionável no dia em que virar gate; o `.http` **não é** — ele só funciona com o token colado dentro do arquivo.

- **Ainda não há gate E2E da borda, e isso é anterior à troca de ferramenta.** O `bruno-all.sh` caiu em 05/10 e nada o substituiu. Não citar um `.hurl` daqui como prova de que uma rota funciona sem ter rodado.

  **Estado medido em 14/10/2026** (antes: 82/241, em 06/10 — o salto veio do seed E2E e do banco limpo, não de mudança na suíte): **191 de 241 requests enviados**, 6 arquivos verdes, **zero erro 500** e **zero defeito de aplicação**. Reprodutível com `swift scripts/debug/macos/local-e2e.swift --reset`, que semeia os 8 perfis e recria o banco. O que impede os 50 restantes, por natureza:

  | Causa | Nº | Resolve com |
  | :--- | ---: | :--- |
  | `[Captures]` não cruzam arquivos | 48 | juntar arquivos ou pré-criar e injetar IDs — **nenhuma env resolve** |
  | Asserts de `403` | **24** | **a [#634](https://github.com/ERP-Bem-Comum/core-api/issues/634)** — ver abaixo |
  | Assert de `409` | 1 | a asserção supõe resíduo; `--reset` a invalida |
  | `jsonpath "$.meta" exists` | 2 | a conversão perdeu a condicionalidade do `.bru` |

  🚨 **A suíte NÃO pode passar enquanto o `AUTH_RBAC_MODE` estiver em bypass.** Os 24 casos verificam *"autenticado sem permissão → 403"*, e sob bypass todo autenticado é super-usuário; o modo está **fixado por código** (`src/server.ts`, duas linhas marcadas `← religar`). Ao ver esses 24 vermelhos, **não os conserte na suíte e não os trate como defeito** — eles voltam ao verde religando o RBAC. Hoje quem olha a suíte não distingue "RBAC desligado" de "autorização quebrada".

  ⚠️ Os 24 só ficaram visíveis **depois** de semear os perfis: antes o `bareToken` era variável indefinida e os casos nem eram enviados. Destravar o seed não criou o problema; revelou uma camada de verificação de segurança que ninguém exercia.

- **Três detalhes de invocação que o README da suíte não traz, medidos em 14/10:** `--file-root .` é **obrigatório** — sem ele os `PUT …/photo` morrem com `unauthorized access to file ../../tests/fixtures/…`; o **access token expira em minutos**, então gere-o imediatamente antes de rodar (um token de poucos minutos antes devolveu 401 em `/api/v1/me`, e o mesmo fluxo com token fresco passou 3/3); e `api-collections-hurl/` **é gitignored**, logo existe só no checkout principal — de dentro de uma worktree, resolva o caminho com `git rev-parse --path-format=absolute --git-common-dir`, nunca contando níveis de `..`.

- **`[Captures]` não cruzam arquivos** (medido: capture em `a.hurl` + uso em `b.hurl`, mesmo comando, `--jobs 1` → `you must set the variable`). Então ou o arquivo é autocontido (login → ações), ou o token vem de `--variables-file`. **`--jobs 1` é obrigatório**: `--test` paraleliza por default e o rate limit de login (5/min) é compartilhado — dois arquivos logando se auto-envenenam com `429`. **`--continue-on-error`** em CI, porque o Hurl para no primeiro assert que falha dentro do arquivo.

- **`hurlfmt --check` antes de commitar.** É o único gate de sintaxe que existe (não há LSP nem JSON schema), e pega o que passa batido na leitura: `{{process.env.X}}` — sintaxe do Bruno — é truncado para `{{process}}` **sem erro**, e body de texto sem a cerca ```` ``` ```` faz a primeira palavra do corpo ser lida como método HTTP.

- **Asserção tolerante ao código real, invariante forte.** Validação de querystring pode responder **400** (Zod) onde se esperaria 422 — aceitar o real em vez de afrouxar a rota para caber no teste. O que **nunca** se aceita é **500**; sem status conhecido, o request afirma `[Asserts] status < 500`.

- **Dado de cadastro é sintético, e CPF precisa ser único por criação.** `auth_user_cpf_idx` (migration 0010) recusa documento repetido: a coleção reusava **um** CPF em 11 requests de criação e só o primeiro passaria. CPF/CNPJ por módulo 11, UUID v4 real (o nil UUID devolve **400**, não 404), e `{{newUuid}}` para valor único por execução. **CPF inválido de propósito se preserva** — há teste que depende dele para exercitar o 422.

- **Fixture binário de upload vive em [`tests/fixtures/http-edge/`](../../tests/fixtures/http-edge/)**, versionado, não dentro das pastas de saída — que são gitignored e levariam o arquivo para fora do git. Os caminhos nos `.hurl`/`.http` são relativos ao arquivo e variam com a profundidade (`casos/users.hurl` vs `casos/regressao/distrato.hurl`).
