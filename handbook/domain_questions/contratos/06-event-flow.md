# 📡 Matriz de Fluxo de Eventos

## 1. Objetivo
Este documento mapeia a comunicação entre os contextos. O sistema abandona a atualização manual de tabelas e passa a reagir a **fatos de negócio** (eventos).

## 2. Tabela 1: Fluxo de Eventos Internos
A tabela abaixo mostra qual contexto **Produz (P)** o evento e quais contextos o **Consomem (C)** para realizar ações secundárias.

| Evento | Origem (P) | Gestão de Contratos | Aditivos | Timeline |
| :--- | :---: | :---: | :---: | :---: |
| `ContratoMaeCriado` | Contratos | - | - | **C** |
| `AditivoRegistrado` | Aditivos | - | - | **C** |
| `DocumentoAnexado` | Aditivos | - | - | **C** |
| `AditivoHomologado` | Aditivos | **C** (Recalcula) | - | **C** |
| `EstadoAtualizado` | Contratos | - | - | **C** |
| `VigenciaEncerrada` | Contratos | - | **C** (Bloqueia) | **C** |

## 3. Tabela 2: Integração com Sistemas Externos
Como o mundo exterior (outros módulos do ERP ou serviços) percebe nossas mudanças.

| Evento | Alvo Externo | Impacto / Reação |
| :--- | :--- | :--- |
| `EstadoAtualizado` | **Contas a Pagar** | Atualiza o saldo disponível para empenho/pagamento. |
| `DocumentoAnexado` | **S3 / Storage** | Garante que o binário foi persistido com sucesso. |
| `AditivoHomologado` | **Portal do Cliente** | Atualiza a visão do cliente sobre o valor total do contrato. |
| `TentativaDeExclusao` | **Segurança/Audit** | Dispara alerta de violação de política de imutabilidade. |

## 4. Categorias de Fluxo

### 🟢 Entrada e Formalização
Eventos que iniciam a jornada. O foco aqui é a captura do dado e do documento.
* *Gatilhos*: `ContratoMaeCriado`, `AditivoRegistrado`.

### 🟡 Orquestração e Validação
Eventos que aguardam uma condição humana ou documental.
* *Gatilhos*: `DocumentoAnexado`.

### 🔴 Execução e Efeito Financeiro
O momento crítico onde o valor "estático" se torna "dinâmico".
* *Gatilhos*: `AditivoHomologado` → gera → `EstadoAtualizado`.

## 5. Como usar essa matriz na prática
> **Exemplo**: Se o Gestor homologar um aditivo de supressão (redução de valor), o contexto de **Aditivos** publica o evento. O contexto de **Contratos** "ouve" isso e subtrai o valor do saldo vigente. Simultaneamente, a **Timeline** "ouve" e cria um marco visual. O **Contas a Pagar** "ouve" e bloqueia novos pagamentos que excedam o novo teto reduzido.

---

**Posso seguir para o `07-external-context.md`, onde detalharemos a ACL (Camada de Anti-Corrupção) para o Financeiro e o Storage de arquivos?**