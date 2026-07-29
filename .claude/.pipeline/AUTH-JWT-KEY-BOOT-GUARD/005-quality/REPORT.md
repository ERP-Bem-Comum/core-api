# W3 — gate de qualidade · AUTH-JWT-KEY-BOOT-GUARD (#515)

**Resultado: VERDE nos quatro comandos.**

## Saída integral

```
$ pnpm run typecheck
$ tsc --noEmit
(sem saída — limpo)

$ pnpm run format:check
Checking formatting...
All matched files use Prettier code style!

$ pnpm run lint
$ eslint .
(sem saída — limpo)

$ pnpm test
ℹ tests 4615
ℹ suites 1320
ℹ pass 4595
ℹ fail 0
ℹ cancelled 0
ℹ skipped 20
ℹ todo 0
ℹ duration_ms 137703.058
```

## Regressão zero

| Momento | Testes | Pass | Fail | Skipped |
| --- | ---: | ---: | ---: | ---: |
| Baseline (antes do ticket) | 4594 | 4574 | 0 | 20 |
| **Final** | **4615** | **4595** | **0** | **20** |
| Delta | **+21** | +21 | 0 | 0 |

Os 21 novos são os do ticket (18 de unidade + 2 de contrato de boot + 1 do achado M2 do W2).
Nenhum teste pré-existente quebrou — em particular, os **100 arquivos** que chamam
`buildAuthHttpDeps({ driver: 'memory' })` sem `AUTH_JWT_*` seguem verdes, que é o **CA6**.

## Critérios de aceite

| CA | Verificação | Status |
| --- | --- | --- |
| CA1 | prod sem chave → exit 78, stderr nomeia a variável, **porta não abre** | ✅ unidade + subprocess |
| CA2 | par incompleto → falha nomeando a que falta | ✅ 4 casos |
| CA3 | PEM inválido → exit 78 identificando a variável (era exit 1) | ✅ unidade + subprocess |
| CA4 | fora de produção → efêmero **com aviso** | ✅ 3 casos |
| CA5 | prod com as duas válidas → sobe sem mudança | ✅ 2 casos |
| CA6 | nenhum teste passa a exigir chave configurada | ✅ suíte completa verde |

## Definition of Done

- [x] W0 RED antes de tocar `src/`
- [x] W1 GREEN com implementação mínima
- [x] W2 read-only — 3 rounds, todos endereçados; destrave por autorização humana registrada
- [x] W3 verde: `typecheck` + `format:check` + `lint` + `test`
- [x] Contagem de testes ≥ baseline (4615 ≥ 4594)
- [x] Mesmo código de saída (78) do precedente `email-link-base-urls.ts`
- [x] Variável documentada no material de deploy **antes do merge** — `03-secrets-catalog.md`,
      `05-local-server-parity-env.md`, `.env.example` e, no repo de infra,
      **`ERP-Bem-Comum/ERP-INFRA` PR #24** (o catálogo canônico + o runbook RB-005)

## Medida do defeito corrigido

O teste de contrato de boot é a evidência mais direta:

| | Antes (RED) | Depois (GREEN) |
| --- | --- | --- |
| prod sem chave | **não encerra** — morto por SIGKILL após 20 s | encerra em **1,7 s** com exit 78 |
| PEM inválido | exit **1** (falha genérica) | exit **78** (EX_CONFIG) |

O processo não terminava porque tinha aberto a porta e passado a servir tráfego, assinando com uma
chave que não existiria no próximo boot.

## Ordem de deploy — obrigatória

⚠️ Este ticket **muda o contrato de operação**: ambientes que hoje sobem sem `AUTH_JWT_*` vão parar
de subir. É o efeito pretendido, mas exige sequência:

1. Mergear **`ERP-Bem-Comum/ERP-INFRA` PR #24** (catálogo + runbook)
2. Confirmar `AUTH_JWT_PRIVATE_KEY` e `AUTH_JWT_PUBLIC_KEY` no Secrets Manager de **cada** ambiente
3. Só então promover esta versão do core-api

## Follow-ups abertos

- **#606** — os três guards de boot decidem produção por igualdade estrita (`'Production'` degrada
  em silêncio). Achado sistêmico do W2, não introduzido por este ticket.
- **#607** — `buildProfilePhotoStorage` é a terceira ocorrência da mesma classe no mesmo composition
  root. Estava explicitamente fora de escopo.
- **Nota de processo:** o `wave-override` documentado no `AGENTS.md` **não existe no CLI da `dev`** —
  está sendo implementado no ticket `PIPELINE-STATE-WAVE-OVERRIDE`. A documentação saiu na frente da
  implementação. Registrado no `004-code-review/REVIEW.md`.
