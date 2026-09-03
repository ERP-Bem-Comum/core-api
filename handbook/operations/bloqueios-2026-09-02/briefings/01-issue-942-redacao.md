# Briefing 01 — Redigir a #942 (dado bancário real exposto em repositório público)

> **Item 1 de 7** da fila de bloqueios de 02/09/2026 (`handbook/operations/bloqueios-2026-09-02/BLOQUEIOS.md`, seção **B6**).
> **Sem worktree, sem branch, sem PR** — a correção é no corpo de uma issue, não em arquivo.
> Você roda na árvore principal, em `dev`. **Não commite nada.**

---

## 🚨 Antes de qualquer coisa — leia esta restrição inteira

A issue **#942** deste repositório contém, no corpo, **dado bancário real de cadastro**:
identificação de conta, agência, conta corrente e número de convênio — repetido em dois pontos,
um deles dentro de uma análise textual.

**Os três repositórios do ERP são públicos.** O `CLAUDE.md` proíbe isto de forma nominal:

> *"Nunca escrever o valor na mensagem de commit, no assert ou na issue — o CI é público, e
> explicar a correção citando o dado a repete."*

Regras duras desta tarefa, sem exceção:

1. **Nunca imprima os valores no terminal.** Nem em `echo`, nem em `gh issue view` sem filtro,
   nem em resumo, nem "para conferir". Se precisar inspecionar, salve em arquivo no scratchpad
   e trabalhe sobre ele.
2. **Nunca escreva os valores** em commit, comentário de issue, PR, nome de arquivo ou log.
3. **Nunca cite o valor ao explicar a correção** — descrever a correção repetindo o dado é
   exatamente o erro que ela conserta.
4. Nada de `git commit`. Esta tarefa não produz diff.

---

## Contexto — por que passou

O gate `tests/cleanup/bank-fixture-masking.test.ts` cobre **fixtures no repositório**.
**Não existe régua alguma para o corpo de uma issue** — que é por onde o dado saiu.

É o padrão registrado como *"a régua certa não se propaga sozinha"*: existe num lugar e falta em N.

Uma varredura das 400 issues (abertas + fechadas) foi feita em 02/09 e **só a #942** tem o padrão.
Caso único, não sistêmico — **não refaça a varredura**, ela já está no `BLOQUEIOS.md`.

---

## Tarefa

### Parte A — redigir o corpo da #942 (é o que urge)

1. Baixe o corpo para o scratchpad, **sem imprimir**:
   ```sh
   gh issue view 942 --json body --jq .body > "$SCRATCH/942-original.md"
   ```
   (use o diretório de scratchpad da sua sessão; **não** grave dentro do repositório)
2. Leia o arquivo com a ferramenta **Read** (não `cat`).
3. Produza uma versão redigida em que cada valor real vire **descrição genérica que preserva o
   sentido técnico**. O leitor tem de continuar entendendo o defeito sem ver o dado. Exemplos de
   substituição a considerar (escolha o que couber ao texto):
   - o número do convênio → `«convênio da conta-cedente»` ou `«convênio de 6 dígitos»`
   - agência/conta → `«agência»` / `«conta corrente»`, mantendo o formato se ele for relevante
     ao defeito (ex.: "conta com dígito verificador X" sem o número)
   - se o comprimento ou formato do campo **é** a causa do defeito, diga o comprimento, não o valor.
4. Acrescente ao final do corpo uma **nota de edição** curta e datada, no espírito:

   > **Nota de edição (02/09/2026):** o corpo original desta issue continha dado bancário real de
   > cadastro. Os valores foram substituídos por descrições genéricas — o repositório é público e
   > o `CLAUDE.md` proíbe dado real de cadastro em issue. Nenhum fato técnico do relato foi
   > alterado.

   **A nota não cita o que foi removido em detalhe** — dizer "o convênio era X" refaz a exposição.
5. Aplique:
   ```sh
   gh issue edit 942 --body-file "$SCRATCH/942-redigida.md"
   ```
6. Confirme que a edição pegou verificando **ausência** do padrão — grep pelo formato, e reporte
   só a contagem, nunca a linha casada.

⚠️ **O histórico de edição da issue no GitHub preserva a versão anterior** e fica visível a quem
abrir "edited". Isso **não** é motivo para não redigir — reduz a superfície e para a propagação.
Registre no seu relatório final que o histórico continua acessível, para o Gabriel decidir se
quer escalar (só um admin apaga revisão de issue, e talvez nem isso).

### Parte B — a régua que falta (registrar, **não** implementar)

O `BLOQUEIOS.md` deixa a segunda ação em aberto:

> *"Decidir se o gate deve cobrir issues (não é trivial: o gate roda no CI sobre arquivos, não
> sobre a API do GitHub — talvez seja um passo do `issue-report`, não um teste)."*

**Isto é fora do escopo desta tarefa.** Pelo anti-padrão 7 do `CLAUDE.md`, registre e siga:

- Use a skill **`issue-report`** (`Skill` tool, `skill: "issue-report"`) para abrir **uma** issue.
- Ela deduplica via `gh issue list` antes de criar — deixe a skill fazer isso.
- O título deve descrever o gap: não há régua que impeça dado real de cadastro no corpo de uma
  issue, enquanto existe uma para fixtures no repositório.
- Nos critérios de aceite, cubra as duas saídas possíveis (passo do `issue-report` × verificação
  no CI) sem escolher — a escolha não é sua.
- **A issue nova não pode conter o dado** nem apontar para a revisão antiga da #942.

---

## Como trabalhar (harness)

- **Use `Read` / `Edit` / `Write`, nunca `cat` / `sed -i` / `> arquivo`.** As 16 rules de
  `.claude/rules/` carregam por `path_glob_match`, e o gatilho é a ferramenta dedicada, não o
  conteúdo lido. Quem lê por shell trabalha **sem o harness, em silêncio**.
- **Sessão curta.** A compactação derrubaria as rules e não as devolve. Esta tarefa cabe numa
  sessão — não a estenda.
- Idioma: **PT-BR com acentuação completa** em issue, comentário e diálogo.
- Você **não** deve rodar o gate de qualidade: não há diff. Se acabar produzindo arquivo, aí sim
  rode `pnpm run typecheck && pnpm run format:check && pnpm run lint`.

### Skills e agentes a disparar

| Quando | O quê |
| --- | --- |
| Parte B, ao registrar o gap | skill **`issue-report`** |
| Se surgir dúvida sobre classificar isto como incidente de segurança | agente **`security-backend-expert`** — só para **julgar**, não para implementar |

Não dispare mais nada. Esta tarefa é curta de propósito.

---

## Definition of Done

- [ ] Corpo da #942 editado, sem nenhum valor real, com nota de edição datada.
- [ ] Verificação de ausência feita, reportando **contagem**, nunca a linha.
- [ ] Uma issue nova aberta pela skill `issue-report` descrevendo o gap da régua (ou a
      constatação, com o número, de que já existia uma duplicata).
- [ ] Relatório final ao Gabriel com: o que mudou em termos genéricos, o número da issue nova, e
      a ressalva sobre o histórico de edição permanecer visível.
- [ ] **Zero commits.** `git status` na árvore principal igual ao que estava.
