[← Voltar ao Módulo Contratos](./README.md)

# 📡 Matriz de Eventos — Contratos

> **Status:** vigente | **Última revisão:** 2026-04-28

---

Este é o **"mapa de fofocas"** do módulo Contratos. Mostra como um evento disparado em um BC faz outro reagir, garantindo a integridade entre contextos.

## 1. Matriz de Eventos (Fluxo Interno)

| Evento | Produzido por (Origem) | Consumido por (Reação) | Impacto no Negócio |
| :--- | :--- | :--- | :--- |
| `ContratoMaeCriado` | Gestão de Contratos | Timeline | Novo compromisso jurídico registrado. |
| `AditivoRegistrado` | Aditivos | Timeline | Alteração entrou em negociação/preparo. |
| `DocumentoAditivoAnexado` | Aditivos | Timeline | Aditivo passou a ter prova documental. |
| `AditivoHomologado` | Aditivos | **Gestão de Contratos** + Timeline | Gatilha o recálculo do valor/prazo vigente. |
| `EstadoContratualAtualizado` | Gestão de Contratos | Timeline + (externos) | Novo valor/prazo disponível para Financeiro/Cliente. |
| `ContratoEncerrado` | Gestão de Contratos | Aditivos (bloqueia novos) + Timeline | Vigência expirada ou rescisão formalizada. |
| `DocumentoDisponibilizado` | Timeline | (UI / Auditoria) | Arquivo subiu com hash validado. |
| `DocumentoExcluidoLogicamente` | Timeline | (Auditoria) | Documento marcado como excluído com justificativa. |
| `TentativaDeExclusaoDetectada` | Timeline | **Segurança** | Alerta de violação da política de imutabilidade. |
| `AuditLogGenerated` | Qualquer BC | Governança | Registra "Quem, Quando, De, Para" (Time Travel). |

## 2. Categorias de Fluxo

### 🟢 A. Entrada e Formalização
Eventos que iniciam a jornada. Foco na captura de dado e documento.

```
ContratoMaeCriado → AditivoRegistrado → DocumentoAditivoAnexado
```

### 🟡 B. Orquestração e Validação
Eventos que aguardam condição humana ou documental.

```
DocumentoAditivoAnexado → (Gestor confere) → AditivoHomologado
```

### 🔴 C. Execução e Efeito Financeiro
O momento crítico onde o valor "estático" se torna "dinâmico".

```
AditivoHomologado → EstadoContratualAtualizado → (Financeiro reage)
```

### ⚫ D. Encerramento
```
ContratoEncerrado → (bloqueia novos aditivos)
```

## 3. Integração com Sistemas Externos

| Alvo Externo | Evento | Impacto |
| :--- | :--- | :--- |
| **Módulo Financeiro** | `EstadoContratualAtualizado` | Atualiza saldo disponível para empenho/pagamento via ACL. |
| **Storage (S3 / Blob)** | `DocumentoDisponibilizado` | Confirma persistência do binário com hash. |
| **Portal do Cliente** | `AditivoHomologado` / `EstadoContratualAtualizado` | Atualiza visão do cliente sobre valor total. |
| **Segurança / SIEM** | `TentativaDeExclusaoDetectada` | Dispara alerta de violação. |

## 4. Como usar essa matriz na prática

> **Exemplo:** Se o Gestor homologar um aditivo de **supressão** (redução de valor):
> 1. Aditivos publica `AditivoHomologado`.
> 2. Gestão de Contratos consome → recalcula → publica `EstadoContratualAtualizado`.
> 3. Timeline consome ambos → cria marcos visuais.
> 4. Financeiro consome `EstadoContratualAtualizado` via ACL → bloqueia novos pagamentos que excedam o novo teto reduzido.

## 5. Convenção de Nomeação

Mesma convenção usada no módulo Financeiro (ver [`../06-event-line-context.md`](../06-event-line-context.md)) e padronizada em [`../../architecture/04-integration-events.md`](../../architecture/04-integration-events.md):

- **Tempo passado** — fatos consumados (`AditivoHomologado` ✅, não `HomologarAditivo` ❌).
- **Verbo de domínio** — não "Created" genérico (`ContratoMaeCriado` ✅, não `ContratoCreated` ❌).
- **Versionado no payload** — `schema_version`.
- **PascalCase** no `event_type`.
- **camelCase** nos campos do payload.

## 6. Cross-módulo: Contratos ↔ Financeiro

| Direção | Evento | Quem reage |
| :--- | :--- | :--- |
| Contratos → Financeiro | `EstadoContratualAtualizado` | Financeiro atualiza teto disponível por contrato. |
| Contratos → Financeiro | `ContratoEncerrado` | Financeiro bloqueia vínculo de novos documentos fiscais ao contrato. |
| Financeiro → Contratos | (futuro) `DocumentoFiscalVinculadoAoContrato` | Contratos consome para visibilidade de consumo do saldo. |

> Catálogo completo dos eventos cross-módulo em [`../../architecture/04-integration-events.md`](../../architecture/04-integration-events.md).
