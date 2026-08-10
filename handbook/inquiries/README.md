[← Voltar ao Handbook](../README.md)

# 🗂️ Inquiries — Log de Chamadas, Dúvidas e Decisões

> **Trilha de auditoria do raciocínio do projeto.** Cada chamada aberta com pessoas externas (P.O., Codebit, Cadu, fornecedores) e cada dúvida técnica relevante que levou a uma decisão é registrada aqui.

---

## 1. O que é

Esta pasta é o **diário operacional do projeto**. Diferente de:

| Recurso | Captura | Quando usar |
| :--- | :--- | :--- |
| `domain/` | O que o sistema faz e por quê | Especificação imutável da P.O. |
| `architecture/` | Como o sistema é construído | Decisões já consolidadas |
| `architecture/adr/` | Por que cada decisão foi tomada | ADRs imutáveis |
| `infrastructure/` | Onde o sistema roda | Provisionamento e ambientes |
| `operations/` | O que fazer quando algo acontece | Runbooks e post-mortems |
| **`inquiries/`** | **A trilha de raciocínio + chamadas externas** | **Auditar decisões em aberto, ver perguntas e respostas históricas** |

`inquiries/` responde à pergunta: **"como cheguei a essa decisão?"** com tudo: contexto, perguntas feitas, respostas recebidas, alternativas pesadas, raciocínio interno.

---

## 2. Quando criar uma inquiry

Crie uma `inquiry-NNNN-<slug>.md` quando:

- ✅ Abre uma chamada com pessoa externa (P.O., Codebit, fornecedor) sobre tema técnico relevante.
- ✅ Tem dúvida arquitetural que precisa de pesquisa antes de decidir.
- ✅ Encontra uma divergência entre documentação oficial e implementação real.
- ✅ Pesa duas ou mais alternativas técnicas e quer registrar o raciocínio.
- ✅ Vai precisar explicar essa decisão pra alguém em 6 meses.

**NÃO crie inquiry para:**
- ❌ Bugs comuns ou tickets operacionais (vão pra `operations/incidents/`).
- ❌ Discussões de domínio com a P.O. sobre regras de negócio (vão pra `domain_questions/`).
- ❌ Decisões já tomadas e estáveis (vão direto pra ADR + arquivo de arquitetura).

---

## 3. Como criar

1. Pegue o próximo número livre (`NNNN`) — colisão é barrada por `tests/cleanup/handbook-numbering.test.ts`.
2. Copie o [`_template.md`](./_template.md).
3. Preencha o frontmatter (`inquiry`, `title`, `state`) e o corpo conforme as informações chegarem.
4. Rode **`pnpm run docs:index`**. O [`INDEX.md`](./INDEX.md) é **gerado** do frontmatter — não editar à mão.
5. Quando fechar, mude o `state:` no frontmatter e regere. O índice acompanha sozinho.

> ⚠️ Diferente de ADRs, **inquiries são editáveis** — elas vivem com o raciocínio em curso. Quando uma inquiry vira decisão final, ela referencia o ADR que foi gerado a partir dela.

---

## 4. Estados possíveis

Conjunto **fechado**, no campo `state:` do frontmatter, cobrado por `tests/cleanup/inquiry-hygiene.test.ts`.
Inspirado nos estados de RFD da Oxide, reduzido aos cinco que este repositório usa.

| `state` | Significado | Quem destrava |
| :--- | :--- | :--- |
| `open` | Em investigação ativa | quem trabalha nela |
| `blocked` | Espera resposta de terceiro (banca, P.O., upstream) | o terceiro |
| `decided` | Decisão tomada, ADR gerado se aplicável | ninguém — fechada |
| `deferred` | Adiada com **gatilho declarado** no corpo | o gatilho |
| `superseded` | Revisada por outra inquiry ou ADR | — |

> ⚠️ Estado novo exige editar o teste — que é o ponto. Esta tabela nasceu porque o acervo acumulou
> **seis** rótulos ad-hoc em prosa livre (`Decided`, `Concluída`, `Watch`, `⚠️ OBSOLETA`…), e status que
> cada arquivo preenche do seu jeito não responde "o que está aberto?".

As inquiries que ainda esperam resposta têm suas perguntas consolidadas em
[`PERGUNTAS-EM-ABERTO.md`](./PERGUNTAS-EM-ABERTO.md). Inquiry `open` ou `blocked` que passe **90 dias**
sem revisão falha o gate: atualizar `last_reviewed` significa reler e responder se o bloqueio ainda é o
mesmo — não carimbar a data.

---

## 5. Como citar outro documento

Duas formas, e a escolha é sobre **quanto o alvo é volátil**:

| Forma | Quando | Exemplo |
| :--- | :--- | :--- |
| **Identificador** | O alvo pode ser renomeado ou movido — outra inquiry, spec, ADR citado de longe | `[[inquiry-0018]]` · `[[adr-0017]]` · `[[spec-041]]` |
| **Caminho markdown** | O alvo é estável e a navegação importa (o leitor precisa clicar) | `[texto](./0018-....md)` |

O identificador é `tipo-numero` — o número vem do prefixo do arquivo, que já é único por
`tests/cleanup/handbook-numbering.test.ts`. **Ele nunca muda**, então renomear o alvo não quebra a
citação. `tests/cleanup/handbook-refs.test.ts` cobra que todo `[[id]]` resolva.

> ⚠️ **O identificador não é clicável no GitHub.** É o custo consciente: sobreviver a rename em troca
> de um clique. Por isso a forma antiga `[[0018-auditlog-transversal-todos-bcs]]` (nome do arquivo)
> foi abandonada — ela não era clicável **nem** sobrevivia a rename, o pior dos dois mundos.

Documento que morreu ou mudou de lugar entra em [`../redirects.json`](../redirects.json); apagar um
`.md` citado sem declarar isso é recusado no `pre-commit`.

---

## 5. Estrutura padrão de uma inquiry

```markdown
# Inquiry-NNNN: <Título descritivo>

- **Status:** Open | Pending Response | Under Analysis | Decided | Closed | Deferred | Cancelled
- **Opened:** YYYY-MM-DD
- **Closed/Decided:** YYYY-MM-DD (se aplicável)
- **Opened by:** <nome>
- **Asked to:** <pessoa/empresa/IA externa>
- **Impact:** <ADR / arquivo de arquitetura / decisão estratégica>

## Contexto
<Por que a dúvida surgiu, qual a relevância>

## Pergunta(s)
<Pergunta original, exatamente como foi feita>

## Respostas / Investigação
### YYYY-MM-DD — <fonte>
<Resposta literal ou resumo + link>

## Análise
<Raciocínio próprio, prós, contras, alternativas pesadas>

## Decisão final
<O que ficou decidido, ou pendência marcada>

## Saídas
- ADR-XXXX (se gerou um)
- Atualização em <arquivo do handbook>
- Próximo passo: <ação concreta>
```

---

## 6. Índice de inquiries

Veja [`INDEX.md`](./INDEX.md) para a lista completa com status atual.

---

> 🔍 **Filosofia:** decisão sem trilha de raciocínio é decisão frágil. Esta pasta existe pra que **toda decisão arquitetural relevante tenha um "show your work" disponível** quando alguém perguntar "por que escolheram assim?".
