# CI-INTEGRATION-MATRIX — W3 (gate de qualidade)

**Executor:** `ts-quality-checker` (gate local) + verificação na sessão principal. Fecha **#523** (report-only).

## Veredito: GREEN no gate local · CA4 (run real) validado pós-merge (Opção A)

O W3 deste ticket tem duas naturezas: o **gate local** (typecheck/format/lint/test), 100% verificável agora; e o **CA4** (a matriz de resultado do CI real), que **só** roda no GitHub Actions. Decisão do P.O.: **Opção A — merge report-only, CA4 validado no 1º run real** (o gatilho `pull_request` usa a definição de workflow da branch base, então um workflow novo não roda no PR que o introduz — validação pré-merge é impossível por design do GitHub).

## Gate local (verificado)

```
pnpm run typecheck    → tsc --noEmit, exit 0
pnpm run format:check → All matched files use Prettier code style!
pnpm run lint         → eslint ., exit 0
pnpm test             → tests 4328 · pass 4304 · fail 0 · skipped 19 · todo 5 · EXIT 0
```

Regressão zero: `fail 0`. O arquivo do W0 (`integration-matrix-workflow.test.ts`) está entre os verdes (13 asserts pass + 1 skip do CA4).

### Regressão minha corrigida no W3

O lint pegou 2 erros no teste do W0 (`no-confusing-void-expression` em `:52`, `no-empty-function` em `:175`) — o subagente do W0 não passa pelo hook de lint (lição registrada). Corrigidos **sem tocar as asserções**: `present()` ganhou chaves; o corpo do `it` skipado ganhou comentário. Lint, format e o teste seguem verdes depois.

## CA4 — matriz esperada (a conferir no 1º run real)

Quando o workflow rodar de verdade (1º PR para `dev` após o merge, ou o nightly cron 05:00 UTC), o resultado esperado é:

| Suíte | Esperado | Motivo |
| --- | --- | --- |
| contracts, auth, programs, etl:contracts, etl:financial, storage, photo, logo | **verde** | sem defeito conhecido |
| financial | **vermelho** | #519 (bug de prod: `varchar(16)` < `'PartiallyReconciled'`) |
| budget-plans | **vermelho** | #520 (matcher assere `/duplicate/i` na msg de topo, erro no `cause`) |
| partners | **vermelho** | #521 (colisão de CNPJ por ordem de suíte) |
| etl, etl:orchestrate | **vermelho** | #522 (fixture legacy-mini ganhou 3º collaborator) |

Como é **report-only** (`continue-on-error: true`), os 5 vermelhos **não bloqueiam** merge. O "verde" do W3 aqui é **essa matriz reproduzida**, não "tudo verde".

## Efeito de merge sinalizado

Merge na `dev` dispara `deploy-qa.yml` (push em `dev`, `paths-ignore` só `**/*.md`/`handbook`/`docs`). Como o change inclui `.yml` e `.ts`, o QA **redeploya** — inofensivo (nenhuma mudança de runtime do app; é workflow de CI + teste), mas registrado.

## Pendências pós-merge (não bloqueiam o fechamento desta fatia)

1. **Confirmar o CA4** no 1º run real contra a matriz acima.
2. **Fase 2 (required)** — só depois que #519/#520/#521/#522 fecharem: remover `continue-on-error` **e** marcar o `gate` como required **no mesmo passo** (M1 do W2 — senão nasce gate falso-verde permanente).
3. Follow-ups já ticketados: #535 (isolamento intra-suíte), #522 (`etl:budget-plans` fora), #360, #500.
