[← Voltar para scripts](../README.md)

# `scripts/debug/` — ferramental de diagnóstico LOCAL

Nada aqui roda em CI, em homologação ou em produção. É ferramental para subir a stack na máquina de
quem desenvolve, observá-la e reproduzir um ciclo de ponta a ponta — incluindo passos
**destrutivos** que jamais pertenceriam a um script de deploy.

Separado de `scripts/e2e/` por natureza: lá vivem os **smoke tests** da borda, com convenção própria
(`_e2e-env.sh` como helper único, projeto Docker isolado, `e2e_setup`/`e2e_teardown` que preservam
os secrets de dev), cobrada por `tests/scripts/e2e-scripts-non-destructive.test.ts`. Um wrapper de
boot não satisfaz nem deveria satisfazer essa convenção — foi o gate que apontou a diferença.

## Por que há uma subpasta de sistema operacional

`macos/` existe porque **ferramental de debug local pode depender do SO, e o resto do repositório
não pode.** O orquestrador está em Swift, que roda sem toolchain extra num Mac e não roda nos
runners Linux do CI. Deixá-lo na raiz de `scripts/debug/` daria a entender que é portável.

A regra: o que depende de SO vai para `scripts/debug/<so>/`; o que é portável fica um nível acima.
Hoje só existe `macos/`, e um `linux/` nasce no dia em que alguém precisar — sem precisar mover nada
do que já está aqui.

## O que há

| Arquivo                    | Portável?       | O que é                                                                                                          |
| :------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------- |
| `macos/local-e2e.swift`    | **não** (Swift) | orquestrador do ciclo: derruba → recria banco → sobe → espera → autentica 8 perfis → suíte Hurl → análise        |
| `e2e-profiles.ts`          | sim             | gera `.tmp/e2e.env` com `CORE_API_E2E=1` e o `AUTH_SEED_JSON` dos 8 perfis, com permissões derivadas do catálogo |
| `analyze-http-log.ts`      | sim             | correlaciona `req`/`res` do Pino por `reqId` e agrupa por rota e status                                          |
| `run-http-with-e2e-env.sh` | sim             | sobe a borda aplicando o ambiente de E2E por **`source`**, não por `--env-file`                                  |
| `Procfile.logged`          | sim             | mesma topologia do `Procfile`, com `tee` para `.tmp/logs/<proc>.jsonl`                                           |

## Uso

```bash
swift scripts/debug/macos/local-e2e.swift            # sobe, autentica e roda a suíte
swift scripts/debug/macos/local-e2e.swift --reset    # idem, recriando o banco antes (⚠️ DESTRUTIVO)
swift scripts/debug/macos/local-e2e.swift --no-suite # sobe e autentica, sem a suíte
swift scripts/debug/macos/local-e2e.swift --down     # só derruba
```

Os **artefatos gerados** ficam em `.tmp/` (gitignored), nunca aqui: `.tmp/e2e.env`,
`.tmp/hurl-vars.txt` e `.tmp/logs/*.jsonl` carregam tokens e credenciais de desenvolvimento.

## As armadilhas que este ferramental existe para não repetir

Estão medidas e escritas em [`handbook/runbooks/local-stack-setup.md`](../../handbook/runbooks/local-stack-setup.md) §9 —
sete delas, e **nenhuma produz erro no boot**. As três que mais custaram:

1. **`--env-file` do Node não sobrescreve env de processo**, e o overmind injeta o `.env` como env de
   processo. Variável que o template declara vazia nunca é vencida por arquivo — só por `source` ou
   inline. O seed ficava inerte **sem aviso**.
2. **`--root` do overmind** usa, por default, o diretório do Procfile como raiz da aplicação. Com o
   Procfile fora da raiz, isso trocou o caminho dos módulos, o destino dos logs **e a versão do
   Node** de uma vez.
3. **São dois rate limits independentes** — login (5/min) e geral (100/janela). Subir um não afeta
   o outro.
