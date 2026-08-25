[← Voltar ao Handbook](../README.md)

# Incident-0003: GitHub Actions degradado bloqueia o PR #644 — e a insistência custou mais que a falha

- **Data:** 2026-08-06
- **Severidade:** baixa — nenhum impacto em produção, nenhum dado afetado; custo foi de **tempo**
- **Duração:** 16:30 → 18:33 UTC (2h03) sem CI conclusivo; ~1h desse total gasta insistindo
- **PR:** [#644](https://github.com/ERP-Bem-Comum/core-api/pull/644) · commit `07afe3ce` · branch `chore/rules-040-last-four`
- **Detectado por:** acompanhamento do CI logo após abrir o PR

---

## 1. Resumo executivo

Um PR que altera **quatro arquivos `.md`** e nenhuma linha de `src/` ficou 2 horas sem veredito de CI.
A causa foi indisponibilidade do GitHub Actions, não o conteúdo:

```
Getting action download info
Failed to resolve action download info. Error: The HTTP request timed out after 00:01:40.
Failed to resolve action download info. Error: Service Unavailable
##[error]Service Unavailable
```

Quatro jobs de integração morreram **antes de executar qualquer passo** — sem `pnpm install`, sem
`docker compose`, sem `node --test`. Outros oito ficaram 35 minutos em `queued` sem serem agendados.

**A falha foi de terceiro; o custo foi nosso.** O diagnóstico correto saiu em minutos. A hora
seguinte foi gasta em tentativas de contornar uma infraestrutura que não ia entregar runner — e uma
dessas tentativas (cancelar os runs travados) **piorou** o estado.

---

## 2. Cronologia

| Hora (UTC) | Evento |
| ---------- | ------ |
| 16:30 | PR #644 aberto. 4 workflows disparam; `integration` gera **13 jobs** com MySQL |
| 16:34–16:38 | 4 suítes falham com `Service Unavailable` no download das actions. `auth` escapa e passa |
| 16:45 | 8 jobs seguem `queued`. Nenhum progresso em 15 min |
| 17:05 | Ainda zero progresso. `gh run rerun` recusado: `This workflow is already running` |
| 17:07 | **Decisão de cancelar os runs travados.** Um dos cancels retorna `HTTP 502` |
| 17:09 | PR fechado/reaberto para redisparar. 4 runs novos criados |
| 17:33 | **9 suítes verdes** — incluindo as 4 que haviam falhado. Mas `ci`, `commit-policy` e `semgrep` aparecem cancelados |
| 17:35 | Rerun dos 3. Voltam para `queued` |
| 18:33 | `semgrep` passa (10 verdes). `ci` e `commit-policy`: **1h24 em `queued`**. Mais 4 jobs cancelados |
| — | Merge por override de admin, com o estado registrado no PR |

---

## 3. A prova de que não era o código

Duas evidências independentes, ambas obtidas antes de qualquer contorno:

1. **Nenhum passo executou.** `grep -cE "pnpm install|docker compose|node --test"` no log dos jobs
   falhos devolveu **0**. A falha foi em `Prepare all required actions`, antes do checkout.
2. **Quando executaram, passaram.** No redisparo, as mesmas quatro suítes que haviam falhado —
   `contracts`, `partners`, `programs`, `etl:financial` — ficaram **verdes**. Nenhuma suíte reprovou
   em nenhum momento das 2 horas.

Somado ao gate local verde (10.407 testes, 0 falhas) e ao diff de 4 `.md` sem tocar `src/`, a
classificação de "infra, não regressão" nunca dependeu de suposição.

---

## 4. O erro que amplificou o problema — cancelar durante a degradação

Às 17:07, com 8 jobs parados há 35 minutos, os runs foram cancelados para forçar um redisparo. **Foi
um erro**, e o mecanismo é este:

- O cancel do GitHub é **assíncrono** — e naquele momento a API estava degradada (um dos cancels
  devolveu `HTTP 502`).
- Os workflows usam `concurrency: group: <workflow>-${{ github.ref }}` com `cancel-in-progress: true`.
- Os cancels foram processados **depois** que os runs novos já ocupavam o mesmo grupo, e os
  alcançaram.

Resultado: 3 runs novos (`ci`, `commit-policy`, `semgrep`) e 2 jobs de integração nasceram e morreram
cancelados, forçando outra rodada de rerun. **A tentativa de acelerar custou uma rodada inteira.**

Agravante estrutural: o job agregador trata cancelamento como falha —

```yaml
gate:
  needs: [integration]
  run: test "$result" = "success"   # result ∈ success|failure|cancelled|skipped
```

Logo, **um único job cancelado derruba o `integração (gate)`** e obriga a re-executar. Cancelar
durante instabilidade é, portanto, especialmente caro neste repositório.

---

## 5. Lições

1. **Separar infra de código é barato — e deve ser o primeiro passo.** Se o log não contém
   `pnpm install`, `docker compose` ou `node --test`, nenhum teste rodou e o diff está fora de
   suspeita. Custa um `grep` e encerra a dúvida.

2. **Não cancelar run durante degradação da API.** O cancel é assíncrono e respinga no run seguinte
   pelo `concurrency group`. Se for preciso redisparar, **fechar/reabrir o PR** basta e não cancela
   nada.

3. **Ter critério de parada explícito.** A regra que faltou: **duas rodadas de falha por infra, sem
   execução de teste ⇒ parar e escalar a decisão ao humano.** Não armar uma terceira espera. Insistir
   contra infraestrutura de terceiro não é diligência — foi o que consumiu a hora.

4. **Prometer notificação não substitui decidir.** Foram armados quatro monitores sucessivos; nenhum
   entregou veredito, porque não havia veredito a entregar. O certo, na segunda rodada, era apresentar
   as opções reais (esperar × override) em vez de agendar mais uma espera.

5. **Um PR doc-only não deveria ter essa superfície de falha.** Quatro `.md` dispararam 13 jobs com
   banco. Sem esse volume, o PR provavelmente teria escapado da janela ruim — ver [#645](https://github.com/ERP-Bem-Comum/core-api/issues/645).

---

## 6. Ações

| # | Ação | Estado |
| - | ---- | ------ |
| 1 | Registrar este incidente | ✅ este documento |
| 2 | Filtrar `integration.yml` por path, sem pendurar o required check | 📋 [#645](https://github.com/ERP-Bem-Comum/core-api/issues/645) |
| 3 | Merge do #644 por override, com justificativa registrada no PR | ✅ feito |
| 4 | Reavaliar se `cancelled` deve mesmo derrubar o `gate`, ou se cabe distinguir cancelamento de reprovação | 📋 avaliar junto do #645 |

> A ação 4 é deliberadamente uma pergunta, não uma decisão: hoje o `gate` é conservador de propósito
> (#523 — uma suíte vermelha não pode sumir das outras), e afrouxá-lo tem risco próprio. Fica
> registrado como ponto a decidir, não como conserto pendente.

---

## 7. Referências

- [Incident-0002](./0002-ghcr-oauth-transitorio-deploy-qa-2026-08-06.md) — mesma família: falha
  transitória de serviço do GitHub, resolvida por re-execução. Ocorreu **no mesmo dia**.
- [#645](https://github.com/ERP-Bem-Comum/core-api/issues/645) — filtro de path no `integration.yml`
- `.github/workflows/integration.yml` — matrix de 13 suítes e o job `gate`
