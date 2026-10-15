---
paths:
  - 'src/deploy/**/*.ts'
  - 'scripts/deploy/**/*.ts'
  - 'scripts/debug/**'
verify:
  - claim: 'o `.env.example` é GERADO — editá-lo à mão é desfeito pelo gerador e acusado pelo gate'
    root: 'scripts/deploy'
    pattern: 'ARQUIVO GERADO'
    expect:
      - 'scripts/deploy/generate-env-artifacts.ts'
  - claim: 'a descrição de cada variável vive no catálogo, uma vez, indexada pela VARIÁVEL'
    root: 'src/deploy'
    pattern: 'export const ENV_CATALOG'
    expect:
      - 'src/deploy/env-catalog.ts'
  - claim: 'o ambiente de um adapter pertence ao adapter, não à unidade que declara a capacidade'
    root: 'src/deploy'
    pattern: 'CAPABILITY_ADAPTERS'
    expect:
      - 'src/deploy/capability-adapters.ts'
---

`src/deploy/workloads.ts` é a fonte auto-contida do que este repositório sabe executar — `command`, regime, capacidades e as três listas de env. Que ele case com o código é cobrado por `tests/cleanup/workloads-manifest.test.ts`; a bijeção com o catálogo e a volta `código → manifesto`, por `tests/cleanup/env-catalog.test.ts`. Nada disso se repete aqui.

- **O `.env.example` e a doc de variáveis são DERIVADOS — não se editam à mão.** Saem de `env-catalog.ts` + `workloads.ts` por `pnpm run env:generate`, e `tests/cleanup/env-artifacts-generated.test.ts` exige que o disco seja **idêntico** ao gerado, na forma do `format:check` contra o Prettier. Editar à mão é desfeito na próxima geração; o gate acusa antes.

  **Gerar, e não conferir, é decisão medida** ([ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md)): o gate da versão do Node cobrava só o major, e a divergência de minor (`24.16.0` contra `24.15`) sobreviveu **verde**. Igualdade byte a byte não tem essa fenda. O defeito que originou isto: o template não declarava `VAN_S3_REGION`/`VAN_S3_BUCKET`, e `cp .env.example .env && pnpm run dev` não subia nem o `http` ([#1059](https://github.com/ERP-Bem-Comum/core-api/issues/1059)).

- **Três lugares possíveis para uma variável, e a escolha diz o que ela É.** Lista da unidade em `workloads.ts` = *o processo exige sempre*. `capability-adapters.ts` = *só o adapter que a usa exige, quando ele é o escolhido*. `notComposed` no catálogo = *existe código que a lê, fora do caminho de boot de qualquer unidade*. O gate recusa a mesma variável em dois lugares: a lista da unidade e o adapter fazem afirmações incompatíveis, e as duas juntas garantem que uma mente.

  ⚠️ **Não crie constraint condicional de valor** (`required-when EMAIL_PROVIDER=smtp`). Ela acopla o manifesto ao **valor string** de outra variável — renomear o provider quebra a declaração sem nada acusar. O vínculo correto é estrutural: a unidade declara `requires: [{ kind: 'smtp' }]`, e o adapter declara o que precisa. Adapter novo não toca o manifesto, porque a capacidade já está declarada. `selectedBy` ausente significa adapter **fixo** da capacidade — e então o ambiente dele pertence à unidade, como as `S3_*`.

- 🚨 **Precedência de env tem TRÊS camadas, e o mecanismo define a sintaxe aceita.** Medido em 14/10/2026; custou três ciclos de diagnóstico e **nenhum produziu erro no boot**.

  ```bash
  X_TESTE=do-ambiente node --env-file=arq.env -e 'console.log(process.env.X_TESTE)'
  # → do-ambiente
  ```

  | Mecanismo | Sintaxe | Vence env de processo? |
  | :--- | :--- | :--- |
  | overmind lendo `.env` | dotenv | injeta **como** env de processo |
  | `--env-file` do Node | valor cru | **não** |
  | `set -a; . arquivo` | quoting de **shell** | **sim** |
  | inline no Procfile | shell | **sim** |

  Como o template declara `AUTH_SEED_JSON=""` e `CORE_API_E2E="false"` — corretos para ele —, um `--env-file` com o valor real **nunca vence**: a guarda lê string vazia, devolve `undefined` (o caminho **certo** de produção) e o sintoma aparece oito requests depois. E trocar para `source` sem requotar fez o shell comer as aspas duplas de um JSON: **2255 caracteres viraram 1999**, exatamente as 256 aspas, e o valor chegou presente e corrompido. Para sobrescrever o que o `.env` declara, use `source` (molde: `scripts/debug/run-http-with-e2e-env.sh`) ou inline — nunca `--env-file`.

- **Variável comparada como string literal não aceita sinônimo.** `CORE_API_E2E` passa a guarda só com `'1'`: `true`, `yes` ou `on` deixam o seed **inerte, sem aviso**. Ao declarar flag nova no catálogo, escreva na `description` **qual valor liga** — "booleano" não basta quando a comparação é literal.

- **Dois rate limits independentes, e subir um não afeta o outro.** `AUTH_LOGIN_RATE_LIMIT_MAX` (5/min) é defesa contra força bruta; `RATE_LIMIT_MAX` (100/janela), contra abuso de uso. A separação é deliberada. Medido: resolvido o de login, a suíte disparou 185 requests em ~1 s e **142 de 347** voltaram 429 no geral.

- **`example` vai para arquivo versionado, e os repositórios são públicos.** Só valor de desenvolvimento (`localhost`, `dev`) ou placeholder. Nunca credencial, endpoint de produção, nome real de bucket, convênio, agência, conta ou documento de parceiro — o mesmo cuidado que `tests/cleanup/bank-fixture-masking.test.ts` cobra para fixture de CNAB. Chave privada **nunca**: deixe a instrução de gerar, não o valor.

- **Mensagem de erro de configuração NOMEIA o campo.** O [ADR-0068](../../handbook/architecture/adr/0068-env-fail-fast-every-environment.md) justifica o fail-fast assim: *"o processo não sobe **e diz qual campo falta** — é o único [modo de falha] que chega a quem tem a mão no problema"*. Formatar só o `tag` do erro cumpre metade: `config de e-mail inválida (invalid-provider-config)` custou dois boots e uma sonda, com o `field` disponível e descartado. O molde é `describeEmailConfigError` / `describeVanS3ConfigError` — e `raw` de campo sensível não entra na mensagem (CWE-532), nem valor sem passar por `echoEnvValue` (CWE-117).

Ciclo local completo, com as sete armadilhas medidas: [`handbook/runbooks/local-stack-setup.md`](../../handbook/runbooks/local-stack-setup.md) §9 · catálogo gerado: [`handbook/infrastructure/14-environment-variables.md`](../../handbook/infrastructure/14-environment-variables.md) · ferramental de debug: [`scripts/debug/README.md`](../../scripts/debug/README.md).
