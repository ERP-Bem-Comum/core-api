# W1 — implementação · AUTH-JWT-KEY-BOOT-GUARD (#515)

**Resultado: GREEN.** 20/20 nos testes do ticket · suíte completa **4614 · 0 fail** (baseline 4594).

## Arquivos

| Arquivo | Mudança |
| --- | --- |
| `src/modules/auth/adapters/http/jwt-key-config.ts` | **novo** — guarda pura `readAuthJwtKeys(env)` |
| `src/modules/auth/adapters/http/composition.ts` | `loadOrGenerateKeys` → `resolveKeys`; campo `jwtKeys?` em `AuthCompositionConfig`; imports |
| `src/modules/auth/public-api/http.ts` | exporta `readAuthJwtKeys` + tipos (ADR-0006/0028) |
| `src/server.ts` | guarda entre o bloco de e-mail e `buildAuthHttpDeps`; injeta `jwtKeys` |

## Desenho

```
server.ts                          jwt-key-config.ts (puro)        composition.ts
  readAuthJwtKeys(process.env) ──▶  Result<AuthJwtKeyConfig, …>
  !ok → stderr + exitCode 78                                        resolveKeys(config.jwtKeys)
  warnings → stderr                                                   ausente → par efêmero
  keys → buildAuthHttpDeps({ jwtKeys }) ───────────────────────────▶  presente → usa
```

A leitura de ambiente **saiu** da composition. `resolveKeys` ficou com uma decisão binária: usar o par
recebido ou gerar efêmero. Quem lê env e quem encerra o processo é o composition root — mesmo
desenho de `readModuleDriverConfigs` e `readEmailLinkBaseUrls`.

### Posição da guarda no boot

Entre o bloco de e-mail (`server.ts:153`) e `buildAuthHttpDeps`. Precisa ser **antes**: essa é a
primeira chamada do boot que abre handle (pool MySQL), e depois dela `process.exitCode` + `return`
deixaria de ser seguro — o mesmo argumento que o comentário do bloco de drivers já registra.

### Matriz de decisão

| Estado | Produção | Fora de produção |
| --- | --- | --- |
| Ambas ausentes | **erro** (2 mensagens) | ok + **aviso** |
| Par incompleto | **erro** (1 mensagem) | **erro** (1 mensagem) |
| Presente porém inválida | **erro** | **erro** |
| Ambas válidas | ok, sem aviso | ok, sem aviso |

Duas decisões que vão além do texto dos CAs, e o porquê:

- **Par incompleto falha em qualquer ambiente.** Uma chave sozinha não assina *e* verifica. Cair no
  efêmero ali ignoraria em silêncio a metade que o operador configurou — a mesma classe de defeito
  que o ticket corrige.
- **Valor inválido falha em qualquer ambiente.** Ausência é degradação prevista; valor presente e
  malformado é engano do operador, e degradar esconderia o erro até a produção.

### Não vazamento de material de chave

A mensagem cita **só o nome da variável** — nunca o valor. Difere de `email-link-base-urls.ts`, que
ecoa o valor porque base URL não é segredo. O erro capturado do `jose` é **descartado de propósito**:
a mensagem dele ecoa o início do valor recebido (`"pkcs8" must be PKCS#8 formatted string`), e
material de chave não vai para log (CWE-532). Como nenhum valor entra na mensagem, CWE-117 (injeção
de linha via `\n`) fica fechado por construção — coberto por teste.

## Como o CA6 foi preservado

`jwtKeys` é **opcional** em `AuthCompositionConfig`. Os **100 arquivos** de teste que chamam
`buildAuthHttpDeps({ driver: 'memory' })` não mudam — nem em runtime, nem em compile-time. Tornar o
campo obrigatório teria quebrado os 100 no `tsc`. Confirmado pela suíte completa: **0 falhas**.

## Evidência

```
typecheck      $ tsc --noEmit                      (limpo)
lint           $ eslint .                          (limpo)
format:check   All matched files use Prettier code style!
ticket         ℹ tests 20 · pass 20 · fail 0
suíte          ℹ tests 4614 · pass 4594 · fail 0 · skipped 20
```

**Contrato de boot: 21,5 s (RED, morto por SIGKILL) → 1,7 s (GREEN, encerra sozinho).** É a medida
direta do defeito: antes o processo não terminava porque tinha aberto a porta.

## Correções de lint aplicadas durante o W1

Cinco erros, todos legítimos e corrigidos sem afrouxar regra:

- `init-declarations` (2) — `let` sem inicialização virou `importOrUndefined`, um helper que devolve
  `undefined` em falha. Ficou mais legível que o `try/catch` com `let` externo.
- `strict-void-return` (2) — callbacks que retornavam valor onde `void` é esperado; `child.stdout`
  passou a usar `.resume()`, que é a forma idiomática de descartar.
- `no-unused-vars` (1) — `type Env` sobrando no teste.

## Correção ao REPORT do W0

O W0 estimou "17 casos" na unidade e alvo de 4613. O número real é **18** na unidade (+2 no contrato
de boot = 20), e o alvo correto era **4614** — que é o que a suíte reportou. Erro de contagem manual
no relatório, não no código.

## Fora de escopo (confirmado intocado)

`buildProfilePhotoStorage` (`composition.ts:332`) segue lendo `process.env` direto e com o mesmo
padrão de fallback silencioso para storage em memória. É a segunda ocorrência da classe dentro do
módulo `auth` e **não** foi tocada — vale issue própria, como o `000-request.md` já registrava.
