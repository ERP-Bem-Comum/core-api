# 📄 Documento de Engenharia Reversa — Feature: **Plano Orçamentário**

> **Sistema:** ERP Financeiro — `erp-financeiro-frontend-558775345474.us-central1.run.app`
> **Backend:** `erp-financeiro-stag-backend-558775345474.us-central1.run.app`
> **Data da Análise:** Sessão capturada em tempo real via scraping profundo de DOM + interceptação de rede.

---

## 1. Modelo de Domínio e Dados (DDD)

### 1.1 Bounded Contexts (Limites de Contexto)

| Contexto Macro | Descrição |
|---|---|
| **Plano Orçamentário** | Módulo central analisado. Responsável por criar, listar, aprovar, calibrar e consolidar orçamentos por Programa, Centro de Custo, Estado e Município, organizados mensalmente. |
| **Financeiro / Contratos** | Contexto vizinho — os planos geram contas a pagar e se integram a contratos. |
| **Gestão de Parceiros** | Planos são associados a parceiros (estados, municípios) como entidades de parceiro. |

---

### 1.2 Agregados e Entidades

#### Raiz de Agregado: `BudgetPlan` (Plano Orçamentário)

| Atributo | Tipo Inferido | Observação |
|---|---|---|
| `id` | `integer` | Exemplo observado: `179`, `159` (via URL `/planejamento/detalhes/179` e query `budgetPlanId=159`) |
| `name` / `nome` | `string` | Exemplo: `"2025 EPV 1.0"`, `"2025 PARC 1.0"` |
| `year` / `ano` | `integer` | Campo `Ano` no formulário de criação (padrão `2026`) |
| `total` | `Money (decimal)` | Exibido como `"Total Plano: R$ 0,00"` |
| `status` | `enum` | Valores observados: `"Aprovado"`. Outros prováveis: `Pendente`, `Em Calibração` |
| `partners` | `string (descritivo)` | `"0 municípios"`, `"0 estados"` |
| `lastModifiedBy` | `string` | `"Nicole Ruivo"` |
| `lastModifiedAt` | `datetime` | `"08/10/2025 10:15"`, `"26/09/2025 11:27"` |
| `program` / `programa` | `FK → Program` | Selecionado no criação — dropdown "Programa" |
| `createdBlank` | `boolean` | Toggle "Criar em branco" no formulário |

#### Entidade: `Budget` (Orçamento — linha de centro de custo mensal)

| Atributo | Tipo Inferido | Observação |
|---|---|---|
| `id` | `integer` | Inferido pela API `/budgets?budgetPlanId=179` |
| `budgetPlanId` | `integer (FK)` | Referência ao plano pai |
| `costCenter` / `centroDeCusto` | `string` | Exemplos: `"Consultoria"`, `"Pessoal"`, `"Logística"`, `"Comunicação_Inovação"`, `"Avaliação externa"`, `"Eventos"`, `"Produção de conteúdo"` |
| `category` | `string` | `"A RECEBER"` — categoria de rubrica |
| `month` | `integer (1..12)` | Colunas: JANEIRO a DEZEMBRO |
| `amount` | `Money (decimal)` | Valor por mês e centro de custo |
| `state` / `estado` | `string (FK)` | Filtro disponível — filtro por Estado |
| `municipality` / `municipio` | `string (FK)` | Filtro disponível — filtro por Município |
| `isForMonth` | `boolean` | Parâmetro de query `isForMonth=1` — alterna entre visão mensal e anual |

#### Entidade: `Program` (Programa)

| Atributo | Tipo Inferido |
|---|---|
| `id` | `integer` |
| `name` | `string` |

---

### 1.3 Value Objects

| Value Object | Regra de Formatação |
|---|---|
| `Money` | `R$ #.###,##` (locale pt-BR). Ex: `R$ 0,00`, `R$ 386.333,34` |
| `BudgetPlanStatus` | Enum: `Aprovado` (verde), outros prováveis: `Pendente`, `Em Calibração`, `Rascunho` |
| `YearValue` | Inteiro de 4 dígitos representando o exercício fiscal |
| `PlanName` | Padrão observado: `"{Ano} {Sigla} {Versão}"` → `"2025 EPV 1.0"` |

---

### 1.4 Invariantes (Regras de Domínio)

1. **Um Plano requer Ano + Programa** para criação (campos obrigatórios no modal).
2. **"Criar em branco"** é opcional — quando marcado, o plano não copia estrutura de outro plano existente.
3. **Um Plano Aprovado tem restrições de edição** — o botão "Adicionar Orçamento" aparece desabilitado no estado Aprovado (estilo cinza/inativo na UI).
4. **Consolidação por Mês** é a view padrão da tela de detalhes — alternável para `Centro de Custo` e `Por Rede`.
5. **Paginação** da lista de orçamentos (budgets) é feita por `page=1`, com controle de itens (5, 10, 25).
6. **Filtros por Estado + Município** são filtros hierárquicos na tela de detalhes.

---

## 2. Contratos de API e Integração

### 2.1 Endpoints Mapeados

| Rota | Método | Status | Descrição |
|---|---|---|---|
| `/api/auth/session` | `GET` | `200` | Autenticação / sessão do usuário |
| `/budgets` | `OPTIONS` + `GET` (inferido) | `204` | Busca orçamentos de um plano específico |

### 2.2 Parâmetros de Query (Paginação e Filtros)

Endpoint principal interceptado:

```
GET https://erp-financeiro-stag-backend-558775345474.us-central1.run.app/budgets
  ?page=1
  &budgetPlanId=179
  &isForMonth=1
```

E versão alternativa (outro plano):
```
GET /budgets?page=1&budgetPlanId=159&isForMonth=1
```

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `page` | `integer` | Paginação — página corrente |
| `budgetPlanId` | `integer` | ID do Plano Orçamentário pai (FK) |
| `isForMonth` | `boolean (0/1)` | `1` = visão mensal; `0` = visão anual ou agregada |

### 2.3 Payload Inferido do Response (Budget List)

```json
{
  "data": [
    {
      "id": 1234,
      "budgetPlanId": 179,
      "costCenter": "Consultoria",
      "category": "A RECEBER",
      "months": {
        "1": 0.00,
        "2": 0.00,
        "3": 0.00,
        "4": 0.00,
        "5": 0.00,
        "6": 0.00,
        "7": 0.00,
        "8": 0.00,
        "9": 0.00,
        "10": 0.00,
        "11": 0.00,
        "12": 0.00
      }
    }
  ],
  "total": 0.00,
  "page": 1,
  "perPage": 5
}
```

### 2.4 Payload Inferido — Criação de Plano (`POST /budget-plans`)

```json
{
  "ano": 2026,
  "programaId": 1,
  "criarEmBranco": true
}
```

### 2.5 Rotas Inferidas (não interceptadas diretamente mas inferidas pela UI)

| Operação UI | Rota HTTP Provável | Método |
|---|---|---|
| Listar planos | `/budget-plans?page=1` | `GET` |
| Criar plano | `/budget-plans` | `POST` |
| Detalhes do plano | `/budget-plans/{id}` | `GET` |
| Excluir plano | `/budget-plans/{id}` | `DELETE` |
| Aprovar plano | `/budget-plans/{id}/approve` | `PATCH` ou `POST` |
| Iniciar calibração | `/budget-plans/{id}/calibration` | `POST` |
| Adicionar orçamento | `/budgets` | `POST` |
| Exportar CSV | `/budget-plans/{id}/export` | `GET` |
| Planejado x Realizado | `/budget-plans/{id}/realized` | `GET` |
| Compartilhar plano | `/budget-plans/{id}/share` | `POST` |
| Criar cenário | `/budget-plans/{id}/scenarios` | `POST` |

---

## 3. Histórias de Usuário e BDD

### 3.1 Histórias de Usuário (INVEST)

#### US-001 — Listar Planos Orçamentários

> **Como** gestor financeiro, **quero** visualizar todos os planos orçamentários cadastrados com seu status e total, **para** ter uma visão rápida do portfólio de planos do exercício fiscal.

**Caminho Feliz:** Lista exibe nome, total (R$), parceiros (estados/municípios) e status (Aprovado, etc.) com paginação e busca por texto.

**Exceções:** Sem planos cadastrados → exibe spinner/vazio; Erro de autenticação → redireciona para login.

---

#### US-002 — Criar Plano Orçamentário

> **Como** gestor financeiro, **quero** criar um novo plano orçamentário informando o Ano e o Programa, **para** iniciar o processo de planejamento orçamentário do ciclo fiscal.

**Caminho Feliz:** Abre modal "Adicionar Plano Orçamentário", preenche Ano (default=2026), seleciona Programa (dropdown), define se é "em branco" ou baseado em outro plano, clica "Adicionar".

**Exceções:** Programa não selecionado → botão bloqueado; Ano inválido → validação frontend.

---

#### US-003 — Ver Detalhes do Plano (Consolidado por Mês)

> **Como** analista de orçamento, **quero** visualizar o consolidado mensal por Centro de Custo de um plano, **para** acompanhar a distribuição dos recursos ao longo do ano.

**Caminho Feliz:** Clicar no nome do plano → tela de detalhes com tabela de centros de custo × meses (Jan a Jun + navegação para Dez), filtros por Estado e Município, botões de alternância de view (Por Mês / Por Rede / Centro de Custo).

---

#### US-004 — Ações sobre o Plano (Menu "...")

> **Como** gestor, **quero** acessar ações avançadas do plano como aprovação, calibração, exportação e exclusão, **para** gerenciar o ciclo de vida do plano orçamentário.

**Caminho Feliz:** Clicar em "..." → menu dropdown com opções: `Compartilhar plano`, `Planejado x Realizado`, `Iniciar Calibração`, `Aprovar Plano`, `Criar cenário desse plano`, `Exportar CSV`, `Excluir Plano`.

**Exceções:** `Compartilhar plano` e `Aprovar Plano` aparecem desabilitados quando o plano já está aprovado.

---

### 3.2 Cenários Gherkin (BDD)

```gherkin
Feature: Plano Orçamentário — Listagem

  Scenario: Listar planos existentes com paginação
    Dado que o usuário está autenticado como "Alessandra Castro - Teste"
    E existem planos orçamentários cadastrados no sistema
    Quando o usuário acessa "/planejamento"
    Então a tabela exibe colunas: "PLANO ORÇAMENTÁRIO", "TOTAL", "PARCEIROS", "STATUS"
    E cada linha exibe nome do plano, valor total em R$, parceiros e badge de status
    E exibe paginação com opções "Itens por página: 5 | 10 | 25"

---

Feature: Plano Orçamentário — Criação

  Scenario: Criar plano orçamentário com sucesso
    Dado que o usuário está na tela "/planejamento"
    Quando o usuário clica no botão "Criar Plano"
    Então um modal "Adicionar Plano Orçamentário" é exibido
    E o campo "Ano" está preenchido com o ano corrente (ex: 2026)
    E o dropdown "Programa" está vazio

  Scenario: Tentar criar plano sem selecionar Programa
    Dado que o modal de criação está aberto
    E o campo "Ano" está preenchido
    E o campo "Programa" está vazio
    Quando o usuário clica em "Adicionar"
    Então o sistema exibe erro de validação em "Programa"
    E o plano NÃO é criado

  Scenario: Criar plano em branco
    Dado que o modal de criação está aberto
    Quando o usuário marca o toggle "Criar em branco"
    E clica em "Adicionar"
    Então o plano é criado sem copiar estrutura de orçamento existente

---

Feature: Plano Orçamentário — Detalhes

  Scenario: Visualizar consolidado mensal por Centro de Custo
    Dado que o usuário está na listagem de planos
    Quando o usuário clica no nome do plano "2025 EPV 1.0"
    Então o sistema navega para "/planejamento/detalhes/179"
    E exibe o título "Planejamento > Detalhes"
    E exibe o nome "2025 EPV 1.0" com badge "Aprovado"
    E exibe "Total Plano: R$ 0,00"
    E exibe tabela com centros de custo × meses (Jan a Jun + navegação)
    E os centros de custo incluem: "Consultoria", "Pessoal", "Comunicação_Inovação", "Logística", "Avaliação externa", "Eventos", "Produção de conteúdo"

  Scenario: Filtrar orçamento por Estado e Município
    Dado que o usuário está na tela de detalhes do plano
    Quando o usuário seleciona um estado no dropdown "Estado"
    E seleciona um município no dropdown "Município"
    E clica em "Filtrar"
    Então a tabela é atualizada com os orçamentos filtrados por Estado/Município
    E a API é chamada com parâmetros de filtro correspondentes

---

Feature: Plano Orçamentário — Ações Avançadas

  Scenario: Aprovar plano
    Dado que o plano está no status "Pendente"
    Quando o usuário clica em "..." e seleciona "Aprovar Plano"
    Então o sistema muda o status do plano para "Aprovado"
    E registra o usuário e data/hora da aprovação (ex: "Nicole Ruivo alteração 08/10/2025 10:15")

  Scenario: Excluir plano orçamentário
    Dado que o plano existe na listagem
    Quando o usuário clica em "..." e seleciona "Excluir Plano"
    Então o sistema solicita confirmação
    E ao confirmar, o plano é removido da listagem

  Scenario: Exportar plano para CSV
    Dado que o usuário está na listagem ou detalhes do plano
    Quando o usuário seleciona "Exportar CSV"
    Então o sistema gera e faz download de um arquivo CSV com os dados do plano

  Scenario: Iniciar Calibração
    Dado que o plano está aprovado
    Quando o usuário seleciona "Iniciar Calibração"
    Então o sistema cria um processo de calibração para o plano
```

---

## 4. Requisitos Não Funcionais (NFRs) e Casos Extremos

### 4.1 Tratamento de Erros

| Situação | Comportamento Observado |
|---|---|
| Carregamento de dados | Spinner de loading (`CircularProgress`) exibido durante requisição HTTP antes de renderizar tabela |
| Formulário inválido | Campos com validação inline (botão "Adicionar" provavelmente desabilitado) |
| Ações desabilitadas | Itens de menu como "Compartilhar plano" e "Aprovar Plano" aparecem em tom cinza quando o plano já está aprovado |

**Estrutura de erro padronizada esperada no backend:**
```json
{
  "statusCode": 422,
  "message": "Programa é obrigatório",
  "error": "Unprocessable Entity"
}
```

---

### 4.2 Segurança e RBAC

- **Usuário autenticado:** `Alessandra Castro - Teste` (conta de teste com iniciais `AC`).
- **Rastreabilidade de ações:** Cada modificação registra `{Nome} alteração {data} {hora}` — implica campo de auditoria `updatedBy` + `updatedAt` com o nome do usuário.
- **RBAC observado:** Botões/ações visíveis mas desabilitados para status "Aprovado" — sugere controle baseado em status (`statusBasedAccess`), não apenas em papel.
- **Sessão:** Gerenciada via endpoint `/api/auth/session` (Next.js Auth ou similar).

---

### 4.3 Desempenho

- Uso de **paginação server-side** (`page=1`) com tamanhos configuráveis (5, 10, 25 itens).
- Parâmetro `isForMonth=1` sugere **dois modos de agregação** no backend — possível processamento assíncrono para grandes volumes.
- Spinner de loading durante fetch — **operações não são instantâneas**, backend faz queries complexas de agregação.
- **Navegação entre meses** (botões `< >` na tabela) sugere carregamento incremental das colunas mensais.

---

### 4.4 Observações Adicionais

| Aspecto | Detalhe |
|---|---|
| **URL Structure** | `/planejamento` (lista) → `/planejamento/detalhes/{id}` (detalhes) — padrão REST no frontend |
| **Backends** | Frontend em `us-central1.run.app`; Backend Staging separado em subdomínio `stag` |
| **Versioning** | Planos têm versionamento semântico no nome: `2025 EPV 1.0`, `2025 EPV 1.1` seria nova versão |
| **Cenários** | Menu "Criar cenário desse plano" → sugere modelo de `BudgetPlanScenario` como fork/clone do plano |
| **Insights** | Botão "Insights 📊" na tela de detalhes sugere visualização analítica/dashboard do plano |

---

## 5. Alimentação dos Templates Core-API

### `domain-template.md`
- **Bounded Context:** `BudgetPlanning`
- **Aggregate Root:** `BudgetPlan { id, name, year, status, total, programId, partners, lastModifiedBy, lastModifiedAt }`
- **Entities:** `Budget { id, budgetPlanId, costCenter, category, month, amount, stateId, municipalityId }`
- **Value Objects:** `Money`, `BudgetPlanStatus(Approved | Pending | InCalibration)`, `YearValue`, `PlanName`
- **Smart Constructors:** `BudgetPlan.create({ year, programId, isBlank })` → valida Ano > 2000 e programId obrigatório

### `spec-template.md` e `discovery-template.md`
- **P1:** US-001 (Listar), US-002 (Criar), US-003 (Detalhes mensais)
- **P2:** US-004 (Ações: Aprovar, Exportar, Calibrar, Excluir)
- **P3:** Criar cenário, Compartilhar plano, Planejado × Realizado

### `bdd-template.md`
- Cenários Gherkin prontos nas seções 3.2 acima.

### `plan-template.md` (Schema Drizzle inferido)

```typescript
// budget_plans
id: serial, name: varchar(100), year: integer, status: varchar(20),
total: decimal(12,2), program_id: integer (FK), created_by: integer (FK),
updated_by: integer (FK), created_at: timestamp, updated_at: timestamp

// budgets
id: serial, budget_plan_id: integer (FK), cost_center: varchar(100),
category: varchar(50), month: integer (1-12), amount: decimal(12,2),
state_id: integer (FK nullable), municipality_id: integer (FK nullable)
```

### `tdd-template.md` (Test List — Ciclo RED-GREEN)

```
✅ BudgetPlan.create() - rejeita programId nulo
✅ BudgetPlan.create() - rejeita ano inválido (< 2000 ou > 2100)
✅ BudgetPlan.approve() - muda status para Approved, registra updatedBy/updatedAt
✅ Budget.create() - rejeita mês fora do range 1-12
✅ Budget.create() - rejeita amount negativo
✅ BudgetPlan.query() - filtra por budgetPlanId + isForMonth
✅ BudgetPlan.query() - pagina corretamente (page, perPage)
✅ BudgetPlan.delete() - Aprovado não pode ser excluído sem permissão
```
