# 📨 Feedback da P.O. — retornos sobre divergências de API/comportamento

> Registro dos retornos que a **Product Owner** (e a **Arquitetura Frontend v2**) enviam quando validam
> o sistema e encontram divergências entre o que o `core-api` entrega e o que foi pedido/esperado.
> Cada arquivo `NNNN-*.md` é **um retorno/relatório** (que pode conter várias divergências internas).
> O status acompanha a resolução até o fechamento.

---

## Índice

| ID                                     | Data       | Módulo    | Título                                       | Status         | Encaminhamento                                                                                                                                   |
| :------------------------------------- | :--------- | :-------- | :------------------------------------------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](./0001-gap-api-v2-contracts.md) | 2026-06-02 | contracts | Gap: API v2 Contracts vs. funcionalidades v1 | 🟢 Em correção | [ADR-0032](../architecture/adr/0032-transient-http-composition-read-until-bff.md) decidiu a composição; restam tickets de borda + read Parceiros |

---

## Como registrar um novo retorno

1. Reserve o próximo número (`0002`, …) e crie `NNNN-titulo-curto.md`.
2. Preencha o **cabeçalho de rastreabilidade** (emissor, data, módulo, status) + o conteúdo do retorno
   da P.O. **na íntegra** (se houver relatório, cole-o sem editar).
3. Adicione a seção **Encaminhamento do backend** — a triagem: por item, aceito / recusado / adiado /
   "divergência de modelo (decisão arquitetural)" + link a ticket/ADR.
4. Atualize a tabela-índice acima.

## Legenda de status

- 🔴 **Pendente** — recebido, ainda não triado pelo backend.
- 🟡 **Em triagem** — itens sendo cruzados com o estado real do `core-api`; pode haver decisão arquitetural pendente.
- 🟢 **Em correção** — itens viraram tickets / em implementação.
- ✅ **Resolvido** — todos os itens endereçados (com links).
- ⚪ **Parcial** — alguns itens resolvidos, outros adiados/recusados (com justificativa registrada).

## Princípio

Um retorno da P.O. **nunca é silenciosamente "implementado"**. Cada divergência é triada em uma de três
naturezas: (a) **gap real de borda** — o domínio já tem, falta expor/ajustar na API; (b) **trabalho novo**
— precisa de ticket; (c) **divergência de modelo** — o `core-api` modelou diferente _de propósito_ (DDD,
imutabilidade, fronteira de módulo), e o ajuste exige decisão arquitetural (ADR / discussão), não código direto.
