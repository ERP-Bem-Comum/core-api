# ADR-0038: Coleções Bruno obrigatoriamente executadas via CLI + diretrizes de autoria `.bru`

- **Status:** Accepted
- **Date:** 2026-06-08
- **Deciders:** Tech Lead + Especialista de Integração (spec 007)

## Contexto

A spec 007 (fonte única de testes de integração) consolidou as coleções Bruno e, ao rodar o **runner
único** (`pnpm run test:integration:all`) contra infraestrutura real (MySQL + MinIO) pela primeira vez,
expôs que **24 de 26 falhas eram `.bru` desalinhados com o servidor real** — coleções que *pareciam*
cobrir a borda mas **nunca tinham sido executadas via Bruno CLI**:

- `api-collections/contracts` **nunca teve runner Bruno**: o `e2e-contracts.sh` roda um teste `node:test`
  (`contracts-smoke.e2e.ts`), **não** a coleção `.bru`. Resultado: o body do `create-contract` ficou
  desatualizado em relação ao schema real (`createContractBodySchema` virou `z.discriminatedUnion('mode')`
  e o `.bru` não envia `mode` → `400 validation`).
- Outros desalinhamentos só visíveis ao rodar: CPF inválido (`12345678901` reprova módulo 11 →
  `invalid-cpf`), comentários `#` no topo de `.bru` (quebram o parser do Bruno), naming de paginação
  divergente entre módulos (`total` vs `totalItems` vs `itemCount`), captura de IDs dependente de ordem.

Um `.bru` "escrito mas não rodado" é **cobertura ilusória**: dá a impressão de teste sem garantir nada.
ADR-0037 (HTTP-first) elege as coleções Bruno como a validação de regras de negócio na borda — logo,
elas precisam ser **executáveis e executadas de verdade**.

## Decisão

1. **Toda coleção `.bru` DEVE ter um runner CLI** que a executa contra o servidor real (`bru run`).
   Coleção sem runner é proibida. O runner canônico da borda inteira é `pnpm run test:integration:all`
   (spec 007); coleções/subconjuntos por módulo são atalhos para esse mesmo conjunto.

2. **Um `.bru` só é considerado "pronto" após ser EXECUTADO** via `bru run` contra o server real e
   **passar** — ou **reprovar conscientemente** (expected-fail de regressão/feature pendente, isolado em
   pasta própria que não bloqueia o gate principal). **Escrever `.bru` sem rodar o CLI é proibido**
   (anti-padrão; não conta como cobertura). Vale para criação E alteração.

3. **O resultado do CLI é a fonte de verdade**, não a leitura do `.bru`. Asserções devem refletir o
   comportamento real observado do servidor (verificado com `--reporter-json` quando o body importar),
   não o comportamento *presumido*.

4. **CI**: o gate de integração roda o runner único; um PR que adiciona/altera `.bru` sem evidência de
   execução verde (ou expected-fail justificado) é reprovado no review.

### Diretrizes de autoria `.bru` (normativas)

- **Sem comentário `#` no topo do arquivo** — o parser do Bruno rejeita (`Expected end of input`). O
  arquivo começa com `meta {`. Notas vão no `meta { docs: ... }`, em `folder.bru`, ou em comentário
  `//` **dentro** de um bloco `script:*`.
- **Body alinhado ao schema real.** Antes de escrever o body, ler o schema Zod da rota. Atenção a
  `z.discriminatedUnion` (exige o campo discriminador, ex. `mode`/`kind`), campos `min(1)`, e nomes
  exatos (não presumir `objective`/`startDate` etc.).
- **Dados válidos.** CPF/CNPJ gerados por módulo 11 (ver `scripts/seed-partners.ts`); UUID v4 real (o
  *nil UUID* `0000…0000` reprova `isUuidV4` → 400, não 404 — usar `…-4000-a000-…` para "ausente").
- **Asserções tolerantes ao código de borda real, com invariante claro.** Validação de querystring
  pode ser **400** (Zod) e não 422 — aceitar o real (`expect([400,422,200]).to.include(status)`) e manter
  o invariante forte: **nunca 500**, sem vazar stack.
- **Autenticação compartilhada.** Um único login por perfil (pasta `0-auth/`), token via `bru.setVar`
  reusado por todos os módulos. Respeitar o rate-limit sensível de login (poucos logins; em E2E,
  `AUTH_LOGIN_RATE_LIMIT_MAX` relaxa). NÃO duplicar login por módulo.
- **Encadeamento por `seq` + `setVar`.** Casos que dependem de estado (criar→ler→editar) capturam o id
  no `script:post-response` e respeitam a ordem (`meta { seq }`); rodar tudo num único `bru run`
  (múltiplas pastas no mesmo processo) para o token/var persistir — pasta-a-pasta perde o estado.
- **Expected-fail isolado.** Testes de regressão de fix / feature pendente que reprovam por design vivem
  em pasta própria (ex. `z-pending-fixes/`), rodados à parte; não entram no gate verde principal.

## Consequências

- **Positivas:** acaba a "cobertura ilusória"; desalinhamentos schema↔teste aparecem na hora; o gate
  único é confiável para promover `dev → main`; autoria `.bru` padronizada reduz retrabalho.
- **Negativas / custo:** exige Docker + `bru` CLI para validar (já é o caminho do projeto); escrever um
  `.bru` passa a incluir o passo de rodá-lo (mais lento que só escrever — mas é o ponto).
- **Inconsistência de paginação** (`total`/`totalItems`/`itemCount` entre módulos) registrada como dívida
  a harmonizar (ticket próprio).

## Referências

- ADR-0037 (HTTP-first; Bruno como validação de borda). ADR-0034 (Bruno como ferramenta de teste).
- `specs/007-integration-test-suite/` (spec, runner `scripts/e2e-bruno-all.sh`, `safety-net/runner-findings.md`).
- `handbook/reference/bruno/` (referência da linguagem/CLI).
- Regra path-scoped: `.claude/rules/api-collections.md`.
