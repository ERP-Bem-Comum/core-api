---
name: '🤖 Achado de agente (bug / gap / débito / smell)'
about: 'Template canônico para o Claude Code (e humanos) registrarem um problema com clareza tintin-por-tintin e critérios de aceite testáveis. Toda seção é obrigatória.'
title: "[<módulo>] <resumo imperativo do problema — ex.: 'persistir program_id no create de contrato'>"
labels: ['agent-found', 'needs-triage']
---

<!--
  REGRA DE OURO (não negociável): se você NÃO consegue preencher os "Critérios de aceite" de forma
  TESTÁVEL (cada um verificável por um teste ou comando), o problema ainda não está entendido —
  investigue mais ANTES de abrir a issue. Uma issue sem critério testável é ruído.
  Idioma: PT no texto; EN nos identificadores de código, slugs de erro e labels.
  Apague os comentários <!-- ... --> ao preencher (ou deixe; somem na renderização).

-->

## 🎯 Problema (uma frase, sem ambiguidade)

<!-- O que está errado, em UMA frase que qualquer pessoa do time interprete igual (req. de consistência). -->

## 📍 Localização

- **Arquivo(s):** `caminho/arquivo.ts:linha` <!-- cite o ponto exato; vários se preciso -->
- **Módulo · camada:** `<contracts|partners|auth|programs|shared>` · `<domain|application|adapters/http|adapters/persistence|...>`
- **Descoberto em:** <!-- ticket/PR/sessão/comando onde apareceu; dá rastreabilidade -->

## 🔍 Atual vs. Esperado

|                  | Descrição                                       |
| ---------------- | ----------------------------------------------- |
| **Hoje (atual)** | <!-- o comportamento/estado observado AGORA --> |
| **Esperado**     | <!-- o comportamento/estado correto -->         |

## 🧠 Por quê (causa-raiz + impacto) — o "por que consertar"

- **Causa-raiz:** <!-- a CAUSA, não o sintoma. Ex.: "o createContractBodySchema não inclui o campo, então o use case nunca recebe." -->
- **Regra/princípio violado:** <!-- ancore: ADR-XXXX, regra do AGENTS.md/.claude/rules, invariante de domínio, OWASP, etc. Se nada é violado, explique por que ainda assim é um problema. -->
- **Impacto:** <!-- quem/o que é afetado e quão grave (dado errado? bloqueia front? segurança? só legibilidade?). -->

## 🔁 Reprodução / evidência

<!-- Passos OU comando + saída observada, OU o trecho de código. Concreto o bastante para outro agente reproduzir sem perguntar. -->

```
<!-- comando / payload / trecho / saída -->
```

## ✅ Critérios de aceite (testáveis — "como sabemos que está certo")

<!--
  Cada critério é um TESTE verificável (Dado/Quando/Então). INCLUA o caminho de erro
  (mensagem/slug/status esperado) — exemplos concretos nos CAs são o que guia o teste.
  Marque [ ] como checklist; o ticket só fecha com todos verdes.
-->

- [ ] **CA1 — Dado** <!-- contexto/estado inicial -->, **Quando** <!-- ação -->, **Então** <!-- resultado observável (status/body/efeito) -->.
- [ ] **CA2 — Dado** ..., **Quando** ..., **Então** ... <!-- inclua ao menos UM caminho de erro: ex.: "Então responde 422 com slug `field-invalid`" -->
- [ ] **CA3 — ...** <!-- edge cases relevantes -->

## 🧪 Definition of Done (resultado esperado do conserto)

- [ ] Teste(s) cobrindo os CAs acima (ciclo W0 RED → W1 GREEN — `node:test`/`fastify.inject`).
- [ ] Gate **W3** verde: `pnpm run typecheck` + `pnpm run format:check` + `pnpm run lint` + `pnpm test`.
- [ ] **Sem regressão** — contagem de testes ≥ baseline (política de regressão zero).
- [ ] Se muda schema → `pnpm run db:generate` + migration versionada. Se muda regra de ADR → novo ADR que `supersedes`.

## 🏷️ Classificação

- **Tipo:** `<bug | gap-contrato | smell | débito-técnico | doc | segurança>`
- **Severidade:** `<crítica | alta | média | baixa>`
- **Tamanho estimado:** `<S (1-3 linhas/config) | M (VO/use case/refactor localizado) | L (BC/agregado/outbox/API)>`
- **dedup-key:** `<modulo>:<area>:<slug-curto-estável>` <!-- ex.: contracts:create:program-id — usado para NÃO duplicar a issue -->

<!-- Ao fechar: referencie o PR com "Closes #<n>" e marque todos os CAs. -->
