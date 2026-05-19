[← Voltar ao Módulo Contratos](./README.md)

# 📘 Introdução — Módulo de Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28

---

## 1. Por que o sistema existe?

A organização hoje opera em **cegueira contratual**: dados estáticos, gestão documental inexistente, valores e vigências desatualizados para o cliente final. A edição manual de campos críticos gera inconsistências financeiras e falha de compliance, tornando auditorias processos lentos e pouco confiáveis.

## 2. O que o sistema faz, em uma frase?

Automatiza o ciclo de vida contratual, transformando registros estáticos em um **Estado Contratual Vigente** dinâmico, auditável e baseado em eventos formais de alteração (aditivos).

## 3. Atores

| Ator | Responsabilidade |
| :--- | :--- |
| **Gestor ⭐** | Cadastra contratos, anexa documentos e homologa aditivos que alteram valor ou prazo. |
| **Operador** | Consulta estado atual, faz download de documentos para suporte operacional. |
| **Auditor** | Acesso irrestrito (leitura) à trilha de auditoria e cronologia para compliance. |
| **Administrador** | Define perfis de acesso e parâmetros globais. |

## 4. Fluxo do dia na prática

1. **Nascimento** — Gestor cadastra o **Contrato Mãe** com valores e prazos iniciais. Status nasce `Vigente`.
2. **Mutação (Aditivos)** — Sempre que houver alteração, o Gestor cria um Aditivo:
   - **Acréscimo** — Aumenta o valor global.
   - **Supressão** — Reduz o valor global.
   - **Prazo** — Estende ou reduz a data de término.
   - **Variado** — Altera cláusulas/objeto sem afetar financeiro/tempo.
3. **Formalização** — Aditivo permanece `Pendente` até o arquivo assinado ser anexado.
4. **Homologação** — Sistema recalcula automaticamente o **Estado Vigente** e registra evento na Timeline.
5. **Encerramento** — Contrato evolui para `Encerrado` (fim da vigência) ou `Distratado` (rescisão antecipada).

## 5. Tratamento de Exceções

- **Aditivos pendentes** — Nunca impactam o valor exibido ao cliente/financeiro até serem homologados.
- **Arquivos de aditivos** — Homologação é bloqueada caso o documento comprobatório não esteja anexado.
- **Conflito de datas** — Sistema impede vigência retroagida para data anterior à assinatura do contrato mãe sem aditivo de retificação.

## 6. Escopo MVP

* ✅ Cadastro de Contrato Mãe e Aditivos.
* ✅ Motor de cálculo de Valor e Prazo Vigente.
* ✅ Timeline cronológica de eventos (append-only).
* ✅ Repositório documental (upload/download/preview).
* ✅ Migração de dados legados (CSV/JSON UTF-8 com dry-run).
* ✅ RBAC mínimo (Gestor, Operador, Auditor, Administrador).
* ✅ Trilha de auditoria com Time Travel.

## 7. Métricas de Sucesso (KPIs)

* ⏱️ **Tempo Médio de Ciclo** — Do cadastro do aditivo à homologação.
* ✅ **Índice de Conformidade** — % de contratos com documentação completa.
* 🔁 **Saúde da Vigência** — Alerta para contratos próximos do vencimento sem aditivo de prazo.
* 🚫 **Taxa de Erro de Cálculo** — Redução de divergências entre o contrato e o Contas a Pagar.

## 8. Em resumo, o que o gestor precisa guardar?

> O valor e a vigência de um contrato **não são campos editáveis**; são o resultado da soma do Contrato Mãe com todos os seus aditivos homologados. A **Timeline** é a única fonte da verdade para auditoria.
