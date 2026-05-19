[← Voltar ao Módulo Contratos](./README.md)

# 📘 Especificação Mestra: Módulo de Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28
>
> Este documento estabelece a estrutura de domínio do Módulo de Contratos, fundamentado no paradigma **Estado Vigente Derivado**: o valor e prazo do contrato nunca são editados, mas calculados a partir do Contrato Mãe + aditivos homologados. Espelho consolidado dos documentos `01` a `07` deste módulo.

---

## 1. 🧭 Visão Estratégica

### 1.1. Objetivo de Negócio
Sair de um modelo centrado em **cadastro estático** e adotar um modelo centrado em **estado contratual vigente**:

- **Contrato** = entidade principal (raiz de agregado).
- **Aditivos** = eventos formais de alteração.
- **Timeline** = memória operacional e documental do ciclo de vida.

### 1.2. Atores e Responsabilidades

| Ator | Responsabilidade |
| :--- | :--- |
| **Gestor** | Cadastra contratos, anexa documentos, homologa aditivos. |
| **Operador** | Consulta estado atual, faz download de documentos. |
| **Auditor** | Acesso irrestrito de leitura à trilha e cronologia. |
| **Administrador** | Parametriza perfis de acesso e configurações globais. |

### 1.3. Métricas de Sucesso (KPIs)
- ⏱️ **Tempo Médio de Ciclo** — Cadastro do aditivo → homologação.
- ✅ **Índice de Conformidade** — % de contratos com documentação completa.
- 🔁 **Saúde da Vigência** — Contratos próximos do vencimento sem aditivo de prazo.
- 🚫 **Taxa de Erro de Cálculo** — Divergências entre contrato e Contas a Pagar.

### 1.4. Escopo MVP
- ✅ Cadastro de Contrato Mãe e Aditivos.
- ✅ Motor de cálculo de Valor e Prazo Vigente.
- ✅ Timeline cronológica append-only.
- ✅ Repositório documental (upload/download/preview com hash).
- ✅ Migração legada (CSV/JSON UTF-8 com dry-run).
- ✅ RBAC e trilha de auditoria com Time Travel.

---

## 2. 📍 Mapa de Contextos

```plaintext
[ Interface do Usuário / BFF ]
          |
          ▼
[ GESTÃO DE CONTRATOS (Core ⭐) ] <───> [ ADITIVOS E ALTERAÇÕES (Core ⭐) ]
          |                                     |
          └───────────┬─────────────────────────┘
                      ▼
        [ MEMÓRIA OPERACIONAL / TIMELINE (Support) ]
                      |
                      ▼
        [ INTEGRAÇÃO FINANCEIRA (Generic / ACL) ] ───> Módulo Financeiro
```

| Bounded Context | Responsabilidade | Tipo |
| :--- | :--- | :--- |
| **Gestão de Contratos** | Estrutura do Contrato Mãe + Estado Vigente. | **Core ⭐** |
| **Aditivos e Alterações** | Ciclo de vida das mutações + formalização documental. | **Core ⭐** |
| **Memória Operacional (Timeline)** | Append-only + repositório documental + auditoria. | Supporting |
| **Integração Financeira** | ACL com módulo Financeiro (Contas a Pagar). | Generic |

---

## 3. 🧩 Detalhamento: Gestão de Contratos

### 3.1. Princípio do Estado Derivado
Valor atual, vigência atual e status vigente **não dependem de edição manual**. São calculados a partir do contrato original e dos aditivos homologados.

### 3.2. Regras de Negócio (Invariantes)
- **R1 (Cálculo de Valor)** — `valorVigente = valorOriginal + Σ Acréscimos Homologados − Σ Supressões Homologadas`.
- **R2 (Cálculo de Vigência)** — `vigenciaVigente = max(dataFimOriginal, max(dataFim de aditivos de Prazo homologados))`.
- **R3 (Bloqueio de edição)** — Campos derivados são somente leitura na UI.
- **R4 (Numeração)** — Sequencial anual `000/AAAA`, imutável e único por par `numero+ano`.
- **R5 (Status terminal)** — Contrato `Encerrado` ou `Distratado` não recebe novos aditivos de valor/prazo.
- **R6 (Preservação)** — Valor e vigência originais são preservados como referência histórica.

---

## 4. 🧩 Detalhamento: Aditivos e Alterações

### 4.1. Tipos de Aditivo
- **Acréscimo** — `valorImpacto > 0`. Aumenta valor global.
- **Supressão** — `valorImpacto < 0`. Reduz valor global.
- **Prazo** — Estende ou reduz `dataFim`.
- **Variado** — Altera cláusulas/objeto sem impacto financeiro nem temporal.

### 4.2. Máquina de Estados do Aditivo
```
[Pendente] ──(documento anexado + Gestor homologa)──► [Homologado]
```

### 4.3. Regras de Negócio (Invariantes)
- **R1 (Bloqueio de Cálculo)** — Aditivo `Pendente` nunca afeta o valor vigente.
- **R2 (Obrigatoriedade de Arquivo)** — Não se homologa sem `arquivoAssinadoRef`.
- **R3 (Integridade de Tipo)** — Acréscimo → positivo; Supressão → negativo.
- **R4 (Cronologia)** — Não se homologa com data anterior à assinatura do contrato pai.

---

## 5. 🧩 Detalhamento: Memória Operacional (Timeline)

### 5.1. Princípio Append-only
Eventos registrados **nunca** são editados ou deletados. Erros se corrigem com **Evento de Retificação**.

### 5.2. Modelo de Documento
```ts
Documento {
  id, contratoId, categoria, hashSha256, storageKey, versao,
  statusDocumento: 'ativo' | 'substituido' | 'excluido_logicamente',
  retencaoAte: Date
}
```

### 5.3. Regras de Negócio (Invariantes)
- **R1 (Imutabilidade)** — Eventos não são editados nem deletados.
- **R2 (Hash obrigatório)** — Todo arquivo tem SHA-256 calculado e persistido.
- **R3 (Versionamento)** — Documentos não são "substituídos"; entram como nova versão.
- **R4 (Exclusão lógica)** — Exclusão exige justificativa, preserva o registro.
- **R5 (Retenção)** — Documentos têm `retencaoAte` por categoria; nunca são apagados antes desse prazo.

---

## 6. 🔌 Integração Financeira (ACL)

Contratos expõe `EstadoContratualAtualizado` via outbox. O Financeiro consome para atualizar o **teto disponível** por contrato. ACL traduz a linguagem contratual (`ContratoID`, `valorVigente`) para a linguagem financeira (códigos contábeis, rubricas).

> Catálogo completo de eventos cross-fronteira em [`../../architecture/04-integration-events.md`](../../architecture/04-integration-events.md).

---

## 7. 📡 Matriz de Eventos de Domínio

| Evento | Origem | Reação do Sistema |
| :--- | :--- | :--- |
| `ContratoMaeCriado` | Gestão de Contratos | Timeline registra; Financeiro recebe (cria teto). |
| `AditivoRegistrado` | Aditivos | Timeline registra. |
| `DocumentoAditivoAnexado` | Aditivos | Timeline registra. |
| `AditivoHomologado` | Aditivos | Gestão de Contratos recalcula; Timeline registra. |
| `EstadoContratualAtualizado` | Gestão de Contratos | Financeiro atualiza teto; Timeline registra. |
| `ContratoEncerrado` | Gestão de Contratos | Financeiro bloqueia novos vínculos; Aditivos bloqueia. |
| `DocumentoDisponibilizado` | Timeline | UI exibe; Auditoria captura. |
| `DocumentoExcluidoLogicamente` | Timeline | Auditoria captura justificativa. |
| `AuditLogGenerated` | Qualquer BC | Governança / Time Travel. |

---

## 8. 📖 Glossário Ubíquo (Resumo)

| Termo | Definição |
| :--- | :--- |
| **Contrato Mãe** | Registro inicial que estabelece o vínculo jurídico original. |
| **Estado Vigente** | Fotografia atual do contrato considerando alterações formalizadas. |
| **Aditivo** | Evento formal de alteração (Acréscimo, Supressão, Prazo, Variado). |
| **Homologação** | Ato administrativo que valida o aditivo e torna seus efeitos reais. |
| **Timeline** | Trilha cronológica imutável (append-only) de fatos e documentos. |
| **Append-only** | Modelo onde apenas inserções são permitidas. |
| **Distrato** | Rescisão antecipada formal do contrato. |
| **ACL (Anticorruption Layer)** | Camada que isola o domínio de termos de outro contexto. |

---

## 9. 🎯 Princípios Imutáveis do Módulo

1. **Contrato Mãe é a raiz** — aditivos, documentos e eventos só existem com vínculo formal.
2. **Estado vigente é derivado, jamais digitado** — resultado de eventos homologados.
3. **Imutabilidade de histórico** — exclusão lógica preserva a trilha; nada se apaga.
4. **Documento assinado é gatilho** — sem ele, aditivo não impacta financeiro/prazo.
5. **Auditoria transversal** — toda alteração relevante gera evento e log.
6. **Contratos não conhece o Financeiro** — disponibiliza saldo vigente; ACL traduz.

---

## 10. Referências Cruzadas

- [01-introduction.md](./01-introduction.md) — Visão de produto.
- [02-context-map.md](./02-context-map.md) — Mapa de BCs.
- [03-gestao-contratos-context.md](./03-gestao-contratos-context.md) — BC Core ⭐.
- [04-aditivos-context.md](./04-aditivos-context.md) — BC Core ⭐.
- [05-timeline-context.md](./05-timeline-context.md) — BC Supporting.
- [06-event-line-context.md](./06-event-line-context.md) — Matriz de eventos.
- [07-external-context.md](./07-external-context.md) — Fronteiras externas.
- [`../DOCUMENTO_MESTRE.md`](../DOCUMENTO_MESTRE.md) — Especificação do Módulo Financeiro (sistema irmão).
- [`../../architecture/04-integration-events.md`](../../architecture/04-integration-events.md) — Outbox e eventos cross-fronteira.
