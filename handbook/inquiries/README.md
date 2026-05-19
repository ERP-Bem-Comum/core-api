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

1. Pegue o próximo número livre (`NNNN`).
2. Copie o [`_template.md`](./_template.md).
3. Preencha conforme as informações forem chegando.
4. Atualize o [`INDEX.md`](./INDEX.md) com status atual.
5. Quando fechar (decisão tomada ou pergunta respondida), atualize o status.

> ⚠️ Diferente de ADRs, **inquiries são editáveis** — elas vivem com o raciocínio em curso. Quando uma inquiry vira decisão final, ela referencia o ADR que foi gerado a partir dela.

---

## 4. Status possíveis

| Status | Significado |
| :--- | :--- |
| `Open` | Pergunta aberta, sem resposta ainda |
| `Pending Response` | Aguardando retorno externo (P.O., Codebit, fornecedor) |
| `Under Analysis` | Resposta recebida, ainda analisando internamente |
| `Decided` | Decisão tomada, ADR gerado se aplicável |
| `Closed` | Resolvida sem necessidade de ADR |
| `Deferred` | Adiada — não vai resolver agora |
| `Cancelled` | Pergunta perdeu sentido |

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
