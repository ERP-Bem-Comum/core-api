# `handbook/interviews/`

Entrevistas técnicas longas, organizadas por blocos, entre membros do time e convidados (PhDs, consultores, agentes de IA encarnando especialistas). Servem como **trilha auditável** das decisões de design que alimentam as `SKILL.md` e os ADRs.

---

## Por que uma pasta dedicada?

- ADRs registram **decisão final + ratio legis**, mas comprimem o caminho.
- Inquiries documentam **uma pergunta** e a investigação que a fechou.
- **Entrevistas** preservam a **conversa inteira** — perguntas em ordem, contra-argumentos, mudanças de rota, blocos que ficaram abertos.

Uma entrevista madura **destila** rules (DO/DON'T/CONSIDER), abre tickets de pipeline (`.claude/.pipeline/<TICKET>/`) e gera ou atualiza ADRs/SKILLs. Mas o documento bruto fica aqui, intocado, para auditoria futura.

---

## Convenção de nomenclatura

```
handbook/interviews/<NNNN>-<tema-em-kebab-case>.md
```

Exemplo: `0001-functional-ddd-domain-refresh.md`.

Numeração estritamente sequencial (4 dígitos). Tema descreve o **escopo da conversa**, não o veredito.

---

## Estrutura interna canônica

Toda entrevista tem:

1. **Frontmatter YAML** — título, data, status (`EM ANDAMENTO` / `FECHADO`), escopo, participantes, blocos.
2. **Set the stage** — contexto e premissas iniciais do host.
3. **Mapa dos blocos** — tabela com status de cada bloco temático.
4. **Blocos** — cada um com:
   - Status (`ABERTO` / `EM ANDAMENTO` / `FECHADO`)
   - Perguntas numeradas (`A1`, `A2`, …)
   - Resposta do convidado quando houver
   - Rules destiladas (DO/DON'T/CONSIDER)
   - Tickets/ADRs derivados
5. **Compilado final** — todas as rules emitidas pela entrevista, prontas pra colar em SKILL.

---

## Quando fechar uma entrevista?

Uma entrevista fica **EM ANDAMENTO** enquanto houver bloco com pergunta aberta. Ao fechar todos os blocos:

1. Trocar `status: EM ANDAMENTO` → `status: FECHADO` no frontmatter.
2. Listar no campo `tickets_gerados` todos os tickets/ADRs derivados.
3. Adicionar entrada em `handbook/CHANGELOG.md`.

Uma entrevista FECHADA é **imutável** — eventual continuação vira nova entrevista (`0002-…`) que pode referenciar a anterior.

---

## Diferença para `handbook/inquiries/`

| | `inquiries/` | `interviews/` |
| :--- | :--- | :--- |
| Formato | Documento técnico curto, um problema | Diálogo longo, vários blocos temáticos |
| Saída | 1 decisão, talvez 1 ADR | Várias rules, possivelmente vários ADRs + tickets |
| Audiência | Quem precisa revisitar a decisão | Quem quer entender o **caminho** da decisão |
| Imutabilidade | Após FECHADA | Após FECHADA |
