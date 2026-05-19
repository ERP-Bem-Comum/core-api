[← Voltar ao Handbook](../README.md)

# 📦 Handbook de Domínio — ERP Financeiro

> Modelo de domínio do ERP, organizado por **módulo** e, dentro de cada módulo, por **Bounded Context (BC)**. Derivado das conversas de descoberta entre P.O. e arquiteto de domínio (registradas em [`../domain_questions/`](../domain_questions/)).

---

## 🗂️ Módulos do ERP

| Módulo | Status | Documentação | Visão |
| :--- | :--- | :--- | :--- |
| 💰 **Financeiro** (Core Financeiro) | Vigente | Arquivos `01`–`09` + `DOCUMENTO_MESTRE` na raiz desta pasta | Document-Driven Finance: toda obrigação nasce de um Fato Gerador. |
| 📦 **Contratos** | Vigente | [`contratos/`](./contratos/) | Estado Vigente Derivado: valor e prazo são calculados a partir do Contrato Mãe + aditivos homologados. |

> ⚠️ **Assimetria histórica:** os documentos do módulo **Financeiro** ficam na raiz de `domain/` por motivo histórico (foram a primeira fase do projeto, com ADRs já aceitos referenciando esses paths). O módulo **Contratos** entrou depois, em sub-pasta. Uma uniformização futura (mover Financeiro para `domain/financeiro/`) requer ADR próprio porque envolve atualizar referências em ADRs imutáveis.

---

## 💰 Módulo Financeiro

### Visão estratégica em uma frase
O sistema transforma **documentos fiscais e não fiscais em obrigações financeiras integradas**, automatizando o cálculo de retenções e garantindo a imutabilidade do fluxo de caixa através do conceito de **Fato Gerador**.

### Documentos
| # | Documento | Conteúdo |
| :--- | :--- | :--- |
| 01 | [Introdução](./01-introduction.md) | Por que o sistema existe, atores, fluxo do dia, MVP, métricas |
| 02 | [Mapa de Contextos](./02-context-map.md) | Bounded Contexts e suas relações |
| 03 | [BC Gestão de Documentos](./03-gestao-documentos-context.md) | Core ⭐ — Fato Gerador, selagem, soberania |
| 04 | [BC Títulos e Liquidação](./04-titulos-liquidacao-context.md) | Core ⭐ — Ciclo de vida do título, crivo de liquidação |
| 05 | [BC Integração Bancária](./05-integracao-bancaria-context.md) | ACL — Tradutor de Layouts (Bradesco) |
| 06 | [Matriz de Eventos](./06-event-line-context.md) | Mapa de "fofocas" entre contextos |
| 07 | [Integrações Externas](./07-external-context.md) | Fronteiras com OCR e VAN Bradesco |
| 08 | [Glossário Ubíquo](./08-glossario-ubiquo.md) | Vocabulário do domínio |
| 09 | [Máquinas de Estado](./09-status-maquina-estados.md) | Status consolidados de Documento e Título |
| 10 | [Mapeamento do Schema Legado](./10-mapeamento-legado-schema.md) | **2026-05-14** — Descoberta: 32 tabelas reais do legado mapeadas contra o modelo alvo. Gaps, achados positivos, recomendações |
| ⭐ | [Documento Mestre](./DOCUMENTO_MESTRE.md) | Especificação consolidada |

### Bounded Contexts
1. **Gestão de Documentos** (Core ⭐) — Fato Gerador e selagem fiscal.
2. **Títulos e Liquidação** (Core ⭐) — Ciclo de vida financeiro e carteira de pagamentos.
3. **Ingestão & OCR** (Suporte) — Entrada de dados.
4. **Integração Bancária** (Genérico) — ACL com layout do Bradesco (CNAB 240, OFX).

---

## 📦 Módulo Contratos

### Visão estratégica em uma frase
O sistema **automatiza o ciclo de vida contratual**, transformando registros estáticos em um **Estado Contratual Vigente** dinâmico, auditável e baseado em eventos formais de alteração (aditivos).

### Documentos
> Todos em [`contratos/`](./contratos/). Ver [`contratos/README.md`](./contratos/README.md) para o índice completo.

| # | Documento | Conteúdo |
| :--- | :--- | :--- |
| 01 | [Introdução](./contratos/01-introduction.md) | Por que o sistema existe, atores, MVP, KPIs |
| 02 | [Mapa de Contextos](./contratos/02-context-map.md) | BCs e relações |
| 03 | [BC Gestão de Contratos](./contratos/03-gestao-contratos-context.md) | Core ⭐ — Contrato Mãe + Estado Vigente |
| 04 | [BC Aditivos e Alterações](./contratos/04-aditivos-context.md) | Core ⭐ — Tipos, homologação, formalização |
| 05 | [BC Memória Operacional](./contratos/05-timeline-context.md) | Supporting — Timeline append-only, documentos |
| 06 | [Matriz de Eventos](./contratos/06-event-line-context.md) | Mapa de "fofocas" interno do módulo |
| 07 | [Integrações Externas](./contratos/07-external-context.md) | Fronteira com Financeiro (ACL), Storage, RBAC |
| ⭐ | [Documento Mestre](./contratos/DOCUMENTO_MESTRE.md) | Especificação consolidada |

### Bounded Contexts
1. **Gestão de Contratos** (Core ⭐) — Contrato Mãe e Estado Vigente derivado.
2. **Aditivos e Alterações** (Core ⭐) — Eventos formais de alteração com homologação documental.
3. **Memória Operacional / Timeline** (Supporting) — Append-only e repositório documental.
4. **Integração Financeira** (Generic / ACL) — Fronteira com Contas a Pagar.

---

## 🔗 Relação entre os Módulos

Os dois módulos vivem no mesmo `core-api` ([Modular Monolith — ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md)) e se comunicam **exclusivamente por eventos via outbox** ([04-integration-events.md](../architecture/04-integration-events.md)):

```
[ Contratos ] ──(EstadoContratualAtualizado)──► [ Financeiro ]
              ──(ContratoEncerrado)─────────────►
```

| Direção | Evento | Significado |
| :--- | :--- | :--- |
| Contratos → Financeiro | `EstadoContratualAtualizado` | Atualiza teto disponível para empenho. |
| Contratos → Financeiro | `ContratoEncerrado` | Bloqueia novos vínculos de documentos fiscais ao contrato. |
| Financeiro → Contratos | (futuro) `DocumentoFiscalVinculadoAoContrato` | Visibilidade de consumo do saldo. |

> Catálogo completo em [`../architecture/04-integration-events.md`](../architecture/04-integration-events.md).

---

## 🛡️ Princípios Compartilhados

Independente do módulo, todo BC deste handbook respeita:

1. **Auditoria transversal** — toda alteração relevante gera evento + log.
2. **Imutabilidade do histórico** — exclusão lógica preserva a trilha.
3. **Cálculos derivados não são editáveis** — Valor Líquido (Financeiro) e Valor Vigente (Contratos) são funções de seus inputs, jamais digitados.
4. **Domínio puro, infra na borda** — sem framework dentro do domínio.
5. **Comunicação cross-BC via evento** — sem chamada HTTP síncrona entre módulos.
