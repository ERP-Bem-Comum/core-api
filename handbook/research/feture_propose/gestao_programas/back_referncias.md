# Engenharia Reversa — Gestão de Programas

**Aplicação:** ERP Financeiro — Bem Comum  
**URL Base:** `https://erp-financeiro-frontend-558775345474.us-central1.run.app`  
**Framework:** Next.js (App Router) — React  
**Usuário autenticado:** Alessandra Castro - Teste  
**Data da análise:** 07/06/2026

---

## 1. Modelo de Domínio e Dados (DDD)

### 1.1 Bounded Context

A feature de **Gestão de Programas** pertence ao contexto macro **`gestao-programa`**, evidenciado pela estrutura de rotas do Next.js:

```
app/(main)/(gestao-programa)/programas/page
app/(main)/(gestao-programa)/programas/adicionar
app/(main)/(gestao-programa)/programas/detalhes/[id]
app/(main)/(gestao-programa)/programas/editar/[id]
```

Outros Bounded Contexts visíveis na aplicação (inferidos pela sidebar e pelos chunks JS carregados):

| Contexto | Evidência no DOM |
|---|---|
| **Financeiro** | `contas-bancarias`, ícones na nav |
| **Plano Orçamentário** | `planejamento`, chunk de orcamento |
| **Gestão de Programas** | `/programas` |
| **Autenticação** | `/api/auth/session` |
| **Dashboard** | Rota raiz `/` |

---

### 1.2 Agregados e Entidades

#### Agregado Raiz: `Programa`

Campos identificados nos formulários (tela de criação e edição):

| Campo (Label PT-BR) | Campo Provável (domínio) | Tipo | Obrigatório | Observações |
|---|---|---|---|---|
| Logo do Programa | `logo` | File/URL (imagem) | Não | Upload via botão com ícone de upload |
| Nome do Programa | `nome` | String | **Sim** (inferido) | Campo texto livre |
| Sigla | `sigla` | String | **Sim** (inferido) | Abreviação do programa (ex: "EPV", "PARC") |
| Diretor | `diretor` | String | Não | Nome do responsável (ex: "Vinícius Basílio") |
| Características Gerais | `caracteristicasGerais` | Text (long) | Não | Descrição livre do programa |
| Status | `status` | Enum (String) | **Sim** (sistema) | Valores: `"Ativo"` / (inferido) `"Inativo"` |

**ID inferido do sistema:** Integer (ex: `116`, `{id}`)  
**Status inferido na listagem:** `Ativo` (visível) — `Inativo` (inferido pelo botão "Desativar")

**JSON inferido do Programa:**
```json
{
  "id": 116,
  "nome": "EPV",
  "sigla": "EPV",
  "diretor": "Vinícius Basílio",
  "caracteristicasGerais": "Descrição do programa EPV",
  "logo": "URL_ou_base64_da_imagem",
  "status": "Ativo"
}
```

---

### 1.3 Value Objects Identificados

| Value Object | Regra | Campo |
|---|---|---|
| `Sigla` | String curta, provavelmente uppercase, sem espaços | `sigla` |
| `Status` | Enum restrito: `ATIVO` / `INATIVO` | `status` |
| `Logo` | URL ou arquivo de imagem com restrição de formato/tamanho | `logo` |

---

### 1.4 Invariantes (Regras de Domínio)

Com base nos formulários e comportamentos observados:

1. **Um Programa deve ter Nome e Sigla para ser criado** — campos obrigatórios inferidos pela ausência de placeholder em campos de destaque.
2. **A Sigla parece ser única por Programa** — evidenciado pelo uso como identificador visual na listagem.
3. **Um Programa ativo pode ser desativado** — botão `Desativar` (vermelho/destrutivo) aparece apenas na tela de edição de programa ativo.
4. **Um Programa inativo não pode ser editado sem reativação** — status controla disponibilidade de ações (invariante fortemente inferida).
5. **O Logo é opcional** — campo aceita estado vazio (placeholder "Logo do Programa").
6. **O campo Diretor aceita nome livre** — sem vínculo com entidade `Usuário` visível no frontend.

---

## 2. Contratos de API e Integração

### 2.1 Endpoints Mapeados

| Método | Rota | Status Code | Ação |
|---|---|---|---|
| `GET` | `/api/auth/session` | 200 | Verificação de sessão autenticada |
| `GET` | `/programas` | 200 | Listagem de programas (renderizado via RSC) |
| `GET` | `/programas/adicionar` | 200 | Página de criação (formulário vazio) |
| `GET` | `/programas/detalhes/{id}` | 200 | Detalhe do programa (somente leitura) |
| `GET` | `/programas/editar/{id}` | 200 | Formulário de edição preenchido |

> ⚠️ **Importante:** O frontend usa Next.js App Router com React Server Components (RSC). As chamadas às rotas do frontend retornam HTML/RSC payloads, **não** JSON de API. Os endpoints reais de API backend não foram interceptados diretamente, pois o acesso estava retornando `503` (endpoint `/programas/adicionar?_rsc=6e0b4b7` com status 503 detectado). As chamadas à API real (backend) estão sendo feitas internamente no servidor Next.js (server-side fetching), invisíveis ao Network tab do browser.

### 2.2 Padrão de URL Inferido para API Backend

Com base nas convenções REST e na estrutura do Next.js App Router, os contratos de API backend prováveis são:

```
GET    /api/programas                  → Lista paginada de programas
POST   /api/programas                  → Criar novo programa
GET    /api/programas/{id}             → Buscar programa por ID
PUT    /api/programas/{id}             → Atualizar programa (campos editáveis)
PATCH  /api/programas/{id}/desativar   → Desativar programa (status → INATIVO)
DELETE /api/programas/{id}             → Remover programa (se existir)
```

### 2.3 Payload — Criação (POST inferido)

**Request Body:**
```json
{
  "nome": "EPV",
  "sigla": "EPV",
  "diretor": "Vinícius Basílio",
  "caracteristicasGerais": "Descrição do programa EPV",
  "logo": "<file_upload_ou_url>"
}
```

**Response Body (201 Created) inferida:**
```json
{
  "id": 116,
  "nome": "EPV",
  "sigla": "EPV",
  "diretor": "Vinícius Basílio",
  "caracteristicasGerais": "Descrição do programa EPV",
  "logo": "https://storage.../logo-epv.png",
  "status": "Ativo",
  "criadoEm": "2024-01-15T10:00:00Z",
  "atualizadoEm": "2024-01-15T10:00:00Z"
}
```

### 2.4 Payload — Atualização (PUT inferida)

```json
{
  "nome": "EPV Atualizado",
  "sigla": "EPV",
  "diretor": "Novo Diretor",
  "caracteristicasGerais": "Nova descrição",
  "logo": "https://storage.../novo-logo.png"
}
```

### 2.5 Payload — Listagem (GET inferido)

**Response Body:**
```json
{
  "data": [
    {
      "id": 116,
      "nome": "EPV",
      "sigla": "EPV",
      "logo": "URL_DO_LOGO",
      "caracteristicasGerais": "Descrição do programa EPV",
      "status": "Ativo"
    },
    {
      "id": 117,
      "nome": "PARC",
      "sigla": "PARC",
      "logo": "URL_DO_LOGO",
      "caracteristicasGerais": "Descrição do programa PARC",
      "status": "Ativo"
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 5
}
```

### 2.6 Paginação e Filtros

Observado no componente de listagem:

| Parâmetro | Tipo | Observações |
|---|---|---|
| `page` | Integer | Paginação (botões anterior/próximo visíveis) |
| `pageSize` | Integer | Select com opções: 5, 10, 25 (default: 5) |
| `search` / `q` | String | Campo "Pesquise" visível na listagem |

**Paginação exibida:** "1 - 1" com controles de anterior/próximo e selector de itens por página.

---

## 3. Histórias de Usuário e BDD

### 3.1 User Stories (INVEST)

---

**US-01 — Listar Programas**
> Como **gestor financeiro**, quero **visualizar todos os programas cadastrados**, para **ter visão geral dos programas ativos no sistema**.

**Critérios de aceite:**
- Lista exibe: Logo, Nome, Características Gerais e Status
- Pesquisa por nome/sigla filtra resultados em tempo real
- Paginação com 5, 10 ou 25 itens por página
- Apenas programas com status visível são exibidos

**Fluxo Feliz:** Usuário acessa `/programas` → lista carrega com todos os programas → usuário pode paginar ou buscar

**Exceção:** Nenhum programa cadastrado → exibe estado vazio

---

**US-02 — Criar Programa**
> Como **gestor financeiro**, quero **cadastrar um novo programa**, para **vincular orçamentos e contratos ao programa correspondente**.

**Critérios de aceite:**
- Formulário com campos: Logo (opcional), Nome, Sigla, Diretor, Características Gerais
- Botão "Adicionar" submete o formulário
- Botão "Cancelar" retorna à listagem sem salvar
- Após criação bem-sucedida, redireciona para a listagem
- Campos obrigatórios exibem validação inline ao tentar submeter

**Fluxo Feliz:** Usuário clica "Adicionar Programa" → preenche formulário → clica "Adicionar" → redirecionado para listagem com novo item

**Exceções:**
- Submissão sem campos obrigatórios → mensagem de erro inline
- Sigla duplicada → mensagem de erro da API

---

**US-03 — Visualizar Detalhes de Programa**
> Como **gestor financeiro**, quero **visualizar os dados completos de um programa**, para **confirmar as informações antes de editar**.

**Critérios de aceite:**
- Todos os campos exibidos em modo somente leitura
- Botão "Editar" disponível
- Botão "Voltar" retorna à listagem

**Fluxo Feliz:** Usuário clica em um programa na lista → tela de detalhes carrega → usuário pode navegar para edição

---

**US-04 — Editar Programa**
> Como **gestor financeiro**, quero **editar os dados de um programa existente**, para **manter as informações atualizadas**.

**Critérios de aceite:**
- Formulário pré-preenchido com dados atuais
- Campos editáveis: Logo, Nome, Sigla, Diretor, Características Gerais
- Botão "Salvar" persiste as alterações
- Botão "Cancelar" descarta alterações
- Após salvar, redireciona para detalhes ou listagem

**Fluxo Feliz:** Usuário acessa detalhes → clica "Editar" → modifica dados → clica "Salvar" → dados persistidos

---

**US-05 — Desativar Programa**
> Como **gestor financeiro**, quero **desativar um programa**, para **impedir novos lançamentos sem excluir o histórico**.

**Critérios de aceite:**
- Botão "Desativar" (vermelho) visível apenas em programas com status Ativo
- Confirmação solicitada antes de desativar (modal/diálogo)
- Após desativação, status muda para Inativo
- Programa inativo não aparece como selecionável em novos lançamentos

**Fluxo Feliz:** Usuário edita programa ativo → clica "Desativar" → confirma → programa fica inativo

**Exceções:**
- Programa já inativo → botão "Desativar" não exibido
- Programa com dependências ativas (contratos, lançamentos) → erro de validação

---

### 3.2 Cenários Gherkin (BDD)

```gherkin
Feature: Gestão de Programas
  Como gestor financeiro
  Quero gerenciar programas no ERP
  Para organizar e controlar investimentos por programa

  Background:
    Given que o usuário está autenticado no sistema
    And o usuário navega para "/programas"

  # US-01: Listagem
  Scenario: Listar programas existentes
    Given existem programas cadastrados no sistema
    When a tela de listagem carrega
    Then uma tabela é exibida com colunas: "LOGO", "NOME", "CARACTERÍSTICAS GERAIS", "STATUS"
    And cada linha exibe os dados do programa correspondente
    And a paginação exibe "X - Y" com controles de navegação

  Scenario: Buscar programa por nome
    Given existem os programas "EPV" e "PARC" cadastrados
    When o usuário digita "EPV" no campo de pesquisa
    Then apenas o programa "EPV" é exibido na listagem
    And o programa "PARC" não é visível

  Scenario: Listagem vazia
    Given não existem programas cadastrados
    When a tela de listagem carrega
    Then um estado vazio é exibido ao usuário

  # US-02: Criar
  Scenario: Criar programa com sucesso
    Given o usuário acessa "/programas/adicionar"
    When o usuário preenche o campo "Nome do Programa" com "Novo Programa Teste"
    And o usuário preenche o campo "Sigla" com "NPT"
    And o usuário preenche o campo "Diretor" com "João Silva"
    And o usuário clica no botão "Adicionar"
    Then o programa "NPT" é criado com status "Ativo"
    And o usuário é redirecionado para a listagem de programas
    And o programa "NPT" aparece na listagem

  Scenario: Tentar criar programa sem campos obrigatórios
    Given o usuário acessa "/programas/adicionar"
    When o usuário clica no botão "Adicionar" sem preencher nenhum campo
    Then mensagens de validação são exibidas nos campos obrigatórios
    And nenhuma requisição é enviada ao servidor

  Scenario: Cancelar criação de programa
    Given o usuário acessa "/programas/adicionar"
    And o usuário preencheu o campo "Nome do Programa" com "Rascunho"
    When o usuário clica no botão "Cancelar"
    Then o usuário é redirecionado para "/programas"
    And nenhum programa novo é criado

  # US-03: Detalhes
  Scenario: Visualizar detalhes de programa
    Given existe o programa "EPV" com ID 116
    When o usuário clica no programa "EPV" na listagem
    Then a tela de detalhes é exibida em "/programas/detalhes/116"
    And os campos exibem os valores atuais do programa em modo somente leitura
    And os botões "Voltar" e "Editar" estão disponíveis

  # US-04: Editar
  Scenario: Editar programa com sucesso
    Given o usuário está na tela de detalhes do programa "EPV" (ID 116)
    When o usuário clica em "Editar"
    Then o usuário é redirecionado para "/programas/editar/116"
    And o formulário é pré-preenchido com os dados atuais do programa
    When o usuário altera o campo "Diretor" para "Novo Diretor"
    And clica em "Salvar"
    Then as alterações são persistidas
    And o usuário é redirecionado para a listagem ou detalhes

  Scenario: Cancelar edição de programa
    Given o usuário está na tela de edição do programa "EPV"
    When o usuário altera algum campo
    And clica em "Cancelar"
    Then o usuário retorna à tela anterior
    And as alterações não são salvas

  # US-05: Desativar
  Scenario: Desativar programa ativo
    Given o usuário está na tela de edição do programa "EPV" com status "Ativo"
    When o usuário clica no botão "Desativar"
    Then uma confirmação é solicitada
    When o usuário confirma a desativação
    Then o status do programa muda para "Inativo"
    And o programa não aparece como ativo nas listagens operacionais

  Scenario: Botão desativar não disponível para programa inativo
    Given existe um programa com status "Inativo"
    When o usuário acessa a tela de edição desse programa
    Then o botão "Desativar" não está visível ou está desabilitado
```

---

## 4. Requisitos Não Funcionais (NFRs) e Casos Extremos

### 4.1 Tratamento de Erros

**Observado:**
- A rota `/programas/adicionar?_rsc=6e0b4b7` retornou `503` na primeira tentativa, indicando que o backend pode estar em estado intermitente em ambiente de staging/cloud.
- O frontend (Next.js) usa RSC (React Server Components), o que significa que erros de API são tratados server-side antes de chegar ao cliente.

**Estrutura de erro esperada (inferida por padrões REST):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo 'nome' é obrigatório",
    "details": [
      {
        "field": "nome",
        "message": "Nome do programa não pode ser vazio"
      }
    ]
  },
  "status": 422
}
```

**Códigos HTTP inferidos:**
| Código | Situação |
|---|---|
| `200` | GET com sucesso |
| `201` | POST (criação) com sucesso |
| `400` | Requisição inválida (body malformado) |
| `401` | Não autenticado (redireciona para `/login`) |
| `403` | Sem permissão (RBAC) |
| `404` | Programa não encontrado |
| `409` | Conflito (sigla duplicada) |
| `422` | Erro de validação |
| `503` | Serviço indisponível (staging) |

### 4.2 Segurança e Auditoria (RBAC)

**Observado na interface:**

- **Autenticação:** Cookie de sessão via `/api/auth/session` (NextAuth.js provável)
- **Usuário identificado:** "Alessandra Castro - Teste" — indica sistema multiusuário com perfis de teste
- **Controle de acesso:** A existência de um botão "Desativar" em vermelho (ação destrutiva) separado do fluxo normal de edição sugere RBAC diferenciado — nem todo usuário pode desativar programas
- **Ações auditáveis inferidas:**
  - `PROGRAMA_CRIADO` — Criação de novo programa
  - `PROGRAMA_EDITADO` — Atualização de dados do programa
  - `PROGRAMA_DESATIVADO` — Mudança de status Ativo → Inativo
  - `PROGRAMA_REATIVADO` — Mudança de status Inativo → Ativo (inferida)

**Papéis prováveis (RBAC):**
| Papel | Permissões |
|---|---|
| `ADMIN` | CRUD completo + Desativar |
| `GESTOR` | Criar, Editar, Visualizar |
| `VISUALIZADOR` | Somente leitura |

### 4.3 Upload de Logo

- Campo `Logo do Programa` possui ícone de upload (botão com arrow-up)
- Inferido: upload multipart/form-data ou pré-assinado URL (S3/GCS)
- O logo da organização é servido via `/images/logo-bem-comum.png` — logo dos programas provavelmente em serviço similar
- Dados JPEG base64 vistos nas respostas network confirmam que imagens são servidas como data URIs ou blobs

### 4.4 Performance e UX

- **Roteamento:** Next.js App Router com RSC — navegação entre páginas é client-side via `fetch` com RSC payload (`?_rsc=6e0b4b7`)
- **Paginação server-side:** O select "Itens por página" (5, 10, 25) sugere paginação feita no servidor
- **Busca:** Campo "Pesquise" provavelmente usa debounce para não disparar requisição a cada tecla
- **Loading states:** Inferido por padrões do Next.js — Suspense boundaries com skeleton

### 4.5 Casos Extremos

| Caso | Comportamento Esperado |
|---|---|
| Sigla com caracteres especiais (ex: "A&B") | Rejeição com validação |
| Nome com 1 caractere | Rejeição (min-length) |
| Imagem de logo com formato inválido (PDF, DOCX) | Rejeição no upload |
| Imagem de logo muito grande (>5MB) | Rejeição com mensagem de tamanho |
| Dois usuários editando o mesmo programa simultaneamente | Último salva vence (ou lock otimista com versão) |
| Programa associado a contratos sendo desativado | Warning ou bloqueio |

---

## Resumo Executivo para Templates Core-API

### Para `domain-template.md`

```typescript
// Bounded Context: gestao-programa
// Aggregate Root: Programa

export interface Programa {
  id: number;                           // Integer (auto-gerado)
  nome: string;                         // obrigatório, min: 1, max: ~255
  sigla: Sigla;                         // Value Object, obrigatório, único
  diretor?: string;                     // opcional
  caracteristicasGerais?: string;       // opcional, textarea
  logo?: LogoUrl;                       // opcional, Value Object
  status: ProgramaStatus;               // enum: 'ATIVO' | 'INATIVO'
  criadoEm: Date;
  atualizadoEm: Date;
}

// Value Objects
type Sigla = string;          // uppercase, sem espaços, max ~10 chars
type LogoUrl = string;        // URL válida ou base64
type ProgramaStatus = 'ATIVO' | 'INATIVO';

// Invariantes
// 1. nome e sigla são obrigatórios para criar
// 2. sigla deve ser única no sistema
// 3. apenas programas ATIVOS podem ser desativados
// 4. apenas programas INATIVOS podem ser reativados
```

### Para `plan-template.md` (Schema Drizzle)

```typescript
// Tabela: programas
export const programas = pgTable('programas', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 255 }).notNull(),
  sigla: varchar('sigla', { length: 20 }).notNull().unique(),
  diretor: varchar('diretor', { length: 255 }),
  caracteristicasGerais: text('caracteristicas_gerais'),
  logoUrl: text('logo_url'),
  status: varchar('status', { length: 10 }).notNull().default('ATIVO'),
  criadoEm: timestamp('criado_em').defaultNow(),
  atualizadoEm: timestamp('atualizado_em').defaultNow(),
});
```

### Para `tdd-template.md` (Test List — RED-GREEN cycle)

```
□ [P1] Criar programa com nome e sigla válidos → retorna 201 com programa criado
□ [P1] Criar programa sem nome → rejeita com 422 e campo 'nome' em errors
□ [P1] Criar programa sem sigla → rejeita com 422 e campo 'sigla' em errors
□ [P1] Criar programa com sigla duplicada → rejeita com 409 CONFLICT
□ [P1] Buscar programa por ID existente → retorna dados completos
□ [P1] Buscar programa por ID inexistente → retorna 404
□ [P2] Editar programa → persiste apenas campos enviados
□ [P2] Desativar programa ATIVO → muda status para INATIVO
□ [P2] Desativar programa já INATIVO → rejeita com 422 (estado inválido)
□ [P2] Listar programas → retorna lista paginada com campos LOGO, NOME, CARACTERÍSTICAS, STATUS
□ [P3] Buscar programas por nome (search) → filtra por substring case-insensitive
□ [P3] Upload de logo com formato inválido → rejeita com 422
□ [P3] Listar programas sem autenticação → retorna 401
□ [P3] Desativar programa sem permissão de admin → retorna 403
```

---

*Documento gerado por análise de engenharia reversa da aplicação web em `erp-financeiro-frontend-558775345474.us-central1.run.app/programas`. As informações de contratos de API são **inferidas** a partir do DOM, comportamento da UI e padrões REST, visto que as chamadas reais ao backend ocorrem server-side no Next.js (invisíveis ao Network tab do browser client-side).*
