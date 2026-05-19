[← Voltar ao Domínio](../README.md)

# 📦 Handbook de Domínio — Módulo de Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28 (entrada inicial)
>
> Consolidação do escopo de Contratos, derivada das conversas de descoberta de domínio entre P.O. e o arquiteto de domínio (registradas em [`../../domain_questions/contratos/`](../../domain_questions/contratos/)).

---

## 🎯 Visão Estratégica em Uma Frase

O sistema **automatiza o ciclo de vida contratual**, transformando registros estáticos em um **Estado Contratual Vigente** dinâmico, auditável e baseado em eventos formais de alteração (aditivos).

---

## 📚 Índice de Documentos

| # | Documento | Conteúdo |
| :--- | :--- | :--- |
| 01 | [Introdução](./01-introduction.md) | Por que o sistema existe, atores, fluxo do dia, MVP, KPIs |
| 02 | [Mapa de Contextos](./02-context-map.md) | Bounded Contexts e suas relações |
| 03 | [BC Gestão de Contratos](./03-gestao-contratos-context.md) | Core ⭐ — Contrato Mãe, Estado Vigente |
| 04 | [BC Aditivos e Alterações](./04-aditivos-context.md) | Core ⭐ — Tipos, homologação, formalização |
| 05 | [BC Memória Operacional (Timeline)](./05-timeline-context.md) | Supporting — Append-only, documentos, auditoria |
| 06 | [Matriz de Eventos](./06-event-line-context.md) | Mapa de "fofocas" entre contextos |
| 07 | [Integrações Externas](./07-external-context.md) | Fronteira com Financeiro (ACL), Storage, RBAC |
| ⭐ | [Documento Mestre](./DOCUMENTO_MESTRE.md) | Especificação consolidada em um único documento |

---

## 🗺️ Mapa de Contextos (Resumo)

1. **Gestão de Contratos** (Core ⭐) — Mantém o registro mestre e o saldo atual.
2. **Aditivos e Alterações** (Core ⭐) — Orquestra mudanças e exige formalização documental.
3. **Memória Operacional / Timeline** (Supporting) — Append-only e repositório de documentos.
4. **Integração Financeira** (Generic / ACL) — Interface com o módulo Financeiro (Contas a Pagar).

---

## 🔄 Status do Contrato

| Status | Significado |
| :--- | :--- |
| **VIGENTE** | Em vigor; pode receber aditivos. |
| **ENCERRADO** | Vigência expirou naturalmente; não recebe novos aditivos de valor/prazo. |
| **DISTRATADO** | Rescisão antecipada formalizada. |

---

## 🛡️ Regras de Ouro (Invariantes)

- **R1** — `Valor Vigente = Valor Original + Σ Aditivos Homologados`. Nunca editável manualmente.
- **R2** — Vigência atual = maior data fim entre aditivos de prazo homologados ∪ data fim original.
- **R3** — Aditivo só impacta o estado vigente após **homologação com documento assinado anexado**.
- **R4** — Numeração sequencial anual (`000/AAAA`) é única e imutável para todo o ciclo de vida.
- **R5** — Timeline é **append-only**: erros são corrigidos por evento de retificação, nunca por edição.
- **R6** — Exclusão de documento é lógica e exige justificativa; o histórico é preservado.

---

## 📡 Eventos Principais

| Evento | Significado para o Negócio |
| :--- | :--- |
| `ContratoMaeCriado` | Um novo compromisso jurídico foi registrado. |
| `AditivoHomologado` | Alteração formalizada com documento; saldo recalculado. |
| `EstadoContratualAtualizado` | Novo valor/prazo disponível para Financeiro e Cliente. |
| `DocumentoDisponibilizado` | Nova evidência anexada à Timeline. |
| `ContratoEncerrado` | Vigência expirou ou rescisão formalizada. |

---

## 📖 Glossário Essencial (Atalho)

- **Contrato Mãe** — Registro inicial que estabelece o vínculo jurídico original.
- **Estado Vigente** — Fotografia atual do contrato considerando todas as alterações formalizadas.
- **Aditivo** — Evento formal de alteração contratual (Acréscimo, Supressão, Prazo, Variado).
- **Homologação** — Ato administrativo que valida o aditivo e torna seus efeitos reais.
- **Timeline** — Trilha cronológica imutável (append-only) de fatos e documentos.

---

## 🧭 Princípios Imutáveis do Módulo

1. **O Contrato Mãe é a raiz** — aditivos, documentos e eventos só existem com vínculo formal.
2. **Estado vigente é derivado, nunca digitado** — é resultado de eventos homologados.
3. **Imutabilidade de histórico** — exclusão lógica preserva a trilha; nada se apaga.
4. **Documento assinado é gatilho** — sem ele, aditivo não impacta financeiro/prazo.
5. **Auditoria transversal** — toda alteração relevante gera evento e log de auditoria.
6. **Contratos não conhece o Financeiro** — disponibiliza saldo vigente; ACL traduz para Contas a Pagar.
