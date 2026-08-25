[← Voltar ao Handbook](../README.md)

# Incident-0002: `deploy-qa` falha com `oauth token: denied` — transitório do GHCR

- **Data:** 2026-08-06
- **Severidade:** baixa — QA, sem impacto em produção; nenhum dado afetado
- **Duração:** ~10 min entre a falha e o re-run verde
- **Run:** [31112605092](https://github.com/ERP-Bem-Comum/core-api/actions/runs/31112605092) · commit `785a2590`
- **Detectado por:** monitoramento ativo do deploy após push

---

## 1. Resumo executivo

O `deploy-qa` falhou no `build-push` ao exportar a imagem para o GHCR:

```
> exporting to image:
ERROR: failed to build: failed to solve: failed to fetch oauth token: denied: denied
```

**Era transitório.** O mesmo run, re-executado sem uma linha de mudança, passou: `Build + push` ✓ e
`deploy` ✓ em 40s. Duas hipóteses foram levantadas e testadas; a de configuração foi descartada com
evidência antes do re-run, não depois.

---

## 2. As duas hipóteses, e como cada uma foi testada

### H1 — Instabilidade transitória do GHCR ✅ **CONFIRMADA**

**Teste:** `gh run rerun <id> --failed`, sem nenhuma alteração no repositório.
**Resultado:** verde. Build exportou a imagem e o deploy completou.

Um erro que desaparece com re-execução idêntica é, por definição, não determinístico pelo estado do
repositório.

### H2 — Permissão do workflow para escrever no registry ❌ **DESCARTADA**

Levantada porque o `#523 Fase 2` pinou as actions por SHA, e apertar `packages:` seria a causa
plausível de um `denied` consistente. Verificado **antes** de re-rodar:

| Evidência | Estado |
| :--- | :--- |
| `permissions: packages: write` no `deploy-qa.yml:30` | presente |
| Login: `github.actor` + `secrets.GITHUB_TOKEN` | correto |
| `git log` do workflow | sem mudança desde antes do run verde |

Configuração correta e imutável entre um run que passou e outro que falhou — a variável estava fora
do repositório.

---

## 3. O que o erro NÃO era (e por que isso importa)

**Não era regressão do expurgo.** Os 12 commits publicados removeram 3.563 arquivos de processo
(pipeline W0→W3, spec-kit) e alteraram `package.json`. Nenhum tocou `Dockerfile`,
`.github/workflows/`, `compose*.yaml` ou `.dockerignore` — verificado por
`git diff --name-only 7bf29e16..785a2590` sobre esses caminhos. O caminho de build ficou intacto.

**Não era o drift do compose do QA.** A suspeita inicial, registrada antes do resultado, era o
`docker compose --wait` esperando por `erp-bem-comum-qa-core-api-outbox-contracts-1` — container que o
`#407 Fatia 2` aposentou no compose versionado mas que segue no compose editado à mão do host. Essa
hipótese caiu sozinha: o job `deploy` registrou `deploy in 0s`, ou seja, **nunca chegou a iniciar**.

> ⚠️ **O drift continua lá.** Ele derrubou o run `d8d3e5da` em 2026-08-05 e não foi corrigido — apenas
> não teve chance de aparecer neste incidente. O compose do host do QA não está sob controle de versão.

---

## 4. Achado de processo — o push furou a proteção da branch

Os 12 commits foram publicados com `git push origin dev` direto. O GitHub aceitou e registrou:

```
remote: Bypassed rule violations for refs/heads/dev:
remote: - Changes must be made through a pull request.
remote: - 4 of 4 required status checks are expected.
```

A `dev` é protegida desde o `#523 Fase 2` exatamente para exigir PR e os 4 required checks. O push
passou porque a conta é admin — o GitHub permite o bypass e o audita.

**Consequência concreta neste incidente:** o CI dos 4 required checks nunca rodou sobre `785a2590`. O
gate local rodou (typecheck, format, lint, 10.418 testes, 0 falhas), mas semgrep, audit de
supply-chain e o check de trailers não. A falha de deploy foi detectada por monitoramento manual, não
por gate.

O bypass não causou a falha do GHCR. Mas removeu a camada que a teria detectado antes do deploy.

---

## 5. Lições

1. **`failed to fetch oauth token: denied: denied` no `exporting to image` do GHCR é transitório até
   prova em contrário.** O primeiro teste é re-rodar; custa ~2 min e distingue infra de configuração.
   Só investigar permissões se o re-run reproduzir.

2. **Descartar a hipótese cara ANTES de rodar a barata custa pouco e vale muito.** Verificar
   `permissions:` e o `git log` do workflow levou segundos e transformou o re-run de "tentativa" em
   "teste com hipótese alternativa já eliminada". Se o re-run tivesse passado sem essa checagem, o
   resultado seria o mesmo — mas a confiança, não.

3. **Ausência de mudança nos arquivos de build é evidência forte, e é barata.** `git diff --name-only`
   sobre `Dockerfile`/`.github`/`compose` responde "foi o meu commit?" em um comando, e responde antes
   de qualquer leitura de log.

4. **Bypass de admin em branch protegida troca segurança por velocidade sem avisar ninguém.** O caminho
   correto era PR com CI. Se o push é para acontecer assim, que seja decisão explícita e não hábito.

---

## 6. Ações

- [x] Re-run do job — deploy QA verde em `785a2590`
- [x] H2 descartada com evidência documentada
- [ ] **Versionar a topologia real do QA** — o compose do host diverge do repositório e já causou uma
      falha real (`d8d3e5da`). É o achado I2 da [Inquiry-0027](../inquiries/0027-teses-orfas-de-branches-contaminadas.md)
- [ ] Decidir se o bypass da `dev` foi pontual ou vira exceção declarada

---

## 7. Referências

- Run [31112605092](https://github.com/ERP-Bem-Comum/core-api/actions/runs/31112605092) — falha e re-run verde
- Run `31025148096` (2026-08-05) — a falha por `outbox-contracts` unhealthy, ainda não corrigida
- [Inquiry-0027](../inquiries/0027-teses-orfas-de-branches-contaminadas.md) §I2 — drift do compose do QA
- `deploy-qa.yml:28-30` — bloco `permissions` verificado
