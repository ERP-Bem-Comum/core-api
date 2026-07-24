# ADR-0054: Política de contribuição assistida por IA — trailer `Assisted-by`, DCO humano e responsabilidade da pessoa

- **Status:** Accepted
- **Date:** 2026-07-23
- **Deciders:** Tech Lead (Gabriel — decisão do dono do sistema, 2026-07-23)
- **Complementa:** este AGENTS.md (§"Idioma" — convenção de commit) · a Pipeline W0→W3 (o mesmo processo de review vale para código-IA) · [ADR-0011](./0011-supply-chain-hardening.md) (cadeia de suprimentos — a responsabilidade humana é a contraparte de processo do hardening técnico)
- **Precedente:** Linux kernel, [`Documentation/process/coding-assistants.rst`](https://docs.kernel.org/process/coding-assistants.html) (commitado em 2025-12-23)

## Contexto

Este projeto é desenvolvido com **uso intensivo de assistentes de IA** (Claude Code, Kimi Code e
outros agentes que consomem o `AGENTS.md`). Isso é uma vantagem de produtividade, mas cria dois riscos
de governança que a disciplina W0→W3 sozinha não endereça:

1. **Rastreabilidade** — não há registro de **qual** commit foi assistido por IA, por **qual** agente,
   em **qual** modelo. Sem isso, uma auditoria pós-fato (ex.: um bug sistêmico atribuível a um padrão
   que um modelo específico gerou) não tem como se ancorar.
2. **Responsabilidade e licença** — um agente de IA **não é uma pessoa jurídica** e **não pode
   certificar a origem** de uma contribuição (compatibilidade de licença, direito de submeter). Se a
   responsabilidade não recair explicitamente sobre um humano, ela evapora.

O Linux kernel enfrentou o mesmo problema e, após meses de debate, oficializou em **2025-12-23** uma
política de processo (não uma ferramenta). Adotamos o mesmo desenho, adaptado ao nosso fluxo de commit
PT-BR e à Pipeline W0→W3. Citando o doc do kernel literalmente:

> "AI agents MUST NOT add Signed-off-by tags. Only humans can legally certify the Developer
> Certificate of Origin (DCO)."

## Decisão

### 1. Trailer `Assisted-by:` — obrigatório em todo commit assistido por IA

Todo commit cujo conteúdo foi gerado ou materialmente modificado por um assistente de IA **deve**
carregar um trailer `Assisted-by:` no corpo da mensagem, no formato:

```
Assisted-by: AGENT_NAME:MODEL_VERSION [ferramenta-de-análise]
```

- `AGENT_NAME:MODEL_VERSION` — o agente e o modelo (ex.: `Claude-Code:claude-opus-4-8`,
  `Kimi-Code:kimi-k2`).
- `[ferramenta]` — ferramentas de análise especializadas usadas na geração (opcional; ex.: um linter
  semântico dedicado). **Utilitários triviais são omitidos** — `git`, `pnpm`, `tsc`, `node`, editor,
  formatadores. (No kernel: "Basic development utilities like git, gcc, make, and editors should be
  omitted.")

### 2. `Signed-off-by:` é exclusivamente humano — a IA nunca assina

Um agente de IA **não** adiciona `Signed-off-by`. Quando um commit carrega DCO, o `Signed-off-by` é de
uma **pessoa**, que com ele certifica o [Developer Certificate of Origin](https://developercertificate.org/).
A pessoa que submete:

- **"Review all AI-generated code"** — revisa todo o código gerado por IA.
- Garante a compatibilidade de licença da contribuição.
- **"Take full responsibility for the contribution"** — assume responsabilidade integral: **todo bug
  ou falha de segurança de código-IA recai sobre o humano que o submeteu**, não sobre a ferramenta.

### 3. Mesmo processo, sem trilha paralela

Código assistido por IA passa pela **mesma** Pipeline W0→W3 e pelos **mesmos** gates required
(`integração (gate)` + `typecheck + format + lint + test`) que código escrito à mão. Não há revisão
mais frouxa nem mais rígida por origem — **a origem se declara (trailer), a responsabilidade é humana
(§2), e a barra de qualidade é uma só**. O gate de CI tornado required (Fase 2 do #523) é o braço
**mecânico** desta política; o `Assisted-by` + o dono humano são o braço **de processo**.

## Guardas — o que a política NÃO impõe (ainda)

- **DCO obrigatório em todo commit** (`git commit -s` + um check de CI que rejeita commit sem
  `Signed-off-by`) é uma **decisão de enforcement separada**, não ativada por este ADR. Hoje o repo não
  exige `Signed-off-by`; a §2 fixa a **regra de quem assina** para quando/se o DCO for tornado
  obrigatório. Adotá-lo é additive (um workflow + um check required), a abrir como ticket próprio.
- **Verificação mecânica do `Assisted-by`** (um check que exige o trailer em PRs de sessão de IA)
  também é follow-up opcional — a adoção aqui é de **convenção**, aplicada por disciplina e review (W2).

## Consequências

**Positivas:**

- Auditabilidade: `git log --grep 'Assisted-by'` recupera toda contribuição assistida, por agente/modelo.
- Responsabilidade não-difusa: cada linha tem um dono humano nomeado (autor + review/merge).
- Alinha o projeto ao precedente do maior projeto open-source do mundo, sem custo de ferramenta.

**Custos aceitos:**

- Disciplina de trailer no commit (mecânica, barata; parte da mesma disciplina de commit PT-BR).
- A convenção depende de review humano (W2) enquanto não houver o check mecânico (guarda acima).

## Reversão

Remover a seção correspondente do `AGENTS.md` e marcar este ADR como `Superseded` por um novo. Sem
migração, sem dado — é política de processo. O histórico com `Assisted-by` permanece como registro.

## Alternativas descartadas

- **Não registrar nada** — mantém o risco de rastreabilidade e de responsabilidade difusa que motivou
  o ADR. Rejeitado.
- **`Co-authored-by: <agente>`** (o padrão que alguns fluxos usam) — trata a IA como **co-autora**, o
  que é juridicamente impreciso: a IA não pode ser autora nem certificar origem. `Assisted-by` (kernel)
  é a semântica correta: a IA **assistiu**, o humano **é o autor e o responsável**.
- **DCO obrigatório já neste ADR** — mudaria o fluxo de `git commit` de todo mundo (mandatório `-s` +
  check de CI) num único passo. Fatiado como enforcement separado (guarda acima) para não acoplar a
  adoção da convenção à imposição do gate.
