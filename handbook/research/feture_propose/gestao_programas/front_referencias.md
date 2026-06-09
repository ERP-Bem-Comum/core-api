# 🔍 Análise Profunda — Feature: Gestão de Programas
**URL Base:** `https://erp-financeiro-frontend-558775345474.us-central1.run.app/programas`
**Usuário autenticado:** Alessandra Castro - Teste (AC)
**Stack Frontend:** Next.js (App Router), Material UI + Tailwind CSS (dual system), React

---

## Seção 1 — Inventário de Interface (Atomic Design)

### 🎨 Design Tokens (Literais)

| Token | Valor | Uso |
|---|---|---|
| `--erp-nav` | `rgb(70, 78, 120)` — Azul-escuro/índigo | Background do sidebar |
| `--erp-background` | `rgb(245, 245, 245)` — Cinza claro | Background geral da página |
| `--erp-button-primary-normal` | `rgb(50, 198, 244)` — Cyan/azul-turquesa | Botões de ação primária (CTA) |
| Cor de texto primária (brand) | `rgb(21, 83, 102)` — Azul-teal escuro | Texto de botão primário, links, headers de tabela |
| Cor de texto de paginação | `rgb(36, 141, 173)` | Paginação e textos de status |
| Cor disabled | `rgb(161, 229, 250)` | Botões desabilitados |
| Hover row | `#F6FAFB` | Background de linha ao hover |
| `--radius` | `0.5rem` (6px) | Border-radius padrão de botões/cards |
| `--border` | HSL `214.3 31.8% 91.4%` | Bordas de inputs e divisores |
| Cor de danger/destructive | `#E44141` (vermelho) | Botão "Desativar" |
| Background do card branco | `rgb(255, 255, 255)` | Cards e formulários |

**Tipografia (inferida via Tailwind):**
- `text-sm` (14px) → corpo padrão de tabela e labels
- `text-2xl` (24px) → títulos de página (h1)
- `font-bold`, `font-medium` → peso de textos de destaque
- Família: sistema (`sans-serif`) — sem fonte customizada observada

---

### ⚛️ Átomos

**Botões identificados:**

| Variante | Texto/Label | Cor Fundo | Cor Texto | Estado |
|---|---|---|---|---|
| Primário | "Adicionar Programa" | `rgb(50, 198, 244)` (cyan) | `rgb(21, 83, 102)` | Normal |
| Primário | "Editar" | cyan | dark teal | Normal |
| Primário | "Salvar" | cyan | dark teal | Normal |
| Primário | "Adicionar" | cyan | dark teal | Normal |
| Outline/Ghost | "Cancelar" | branco / border | dark teal | Normal |
| Outline/Ghost | "Voltar" | branco / border | dark teal | Normal |
| Danger | "Desativar" | vermelho (#E44141) | branco | Normal (visível apenas em modo edição) |
| Navegação Back | `<` (ícone chevron) | branco | teal | Normal |
| Disabled (paginação) | `<` / `>` | N/A | `rgb(161, 229, 250)` | Disabled |

**Inputs:**

| Campo | Tipo | Nome (name attr) | Placeholder/Label | Obrigatório |
|---|---|---|---|---|
| Logo do Programa | `type="text"` (display) + `type="file"` (hidden) | `label` | "Logo do Programa" | Não (file input) |
| Nome do Programa | `type="text"` | `name` | "Nome do Programa" | Não (validação não observada) |
| Sigla | `type="text"` | `abbreviation` | "Sigla" | Não |
| Diretor | `type="text"` | `director` | "Diretor" | Não |
| Características Gerais | `textarea` | — | "Digite aqui ..." / "Características Gerais" | Não |
| Campo de Pesquisa | `type="text"` | `search` | "Pesquise" | — |

**Badges/Status:**
- Texto simples "Ativo" (string), sem badge visual dedicado observado na listagem

**Ícones:**
- Ícone de lupa (🔍) dentro do SearchField
- Ícone de upload (⬆) no campo de Logo
- Avatar do usuário com iniciais "AC" (círculo preenchido)

---

### 🧬 Moléculas

| Molécula | Composição | Observação |
|---|---|---|
| **SearchField** | `Input[type=text]` + ícone de lupa (prefixo visual) | Label flutuante "Pesquise", componente MUI `OutlinedInput` |
| **AvatarDropdown** | Avatar com iniciais + seta dropdown | Exibe "Olá, [Nome]" + AC avatar; provavelmente menu com logout |
| **NavItem** | Ícone + Label texto | Dentro do sidebar colapsável; hover expande o menu com `transition-all ease-in-out` |
| **NavSubmenuItem** | Button com label "Programas" | Filho do NavItem de "Gestão de Programas" |
| **PaginationBar** | Select "Itens por página" (5/10/25) + contador "1 - 1" + botões prev/next | Background `#F5F5F5`, cor `#248DAD` |
| **FormField** | Label flutuante + Input text (MUI style) | Labels animadas como placeholders que sobem ao focar |

---

### 🦠 Organismos

**DataTable (Listagem de Programas):**
- Colunas: `LOGO | NOME | CARACTERÍSTICAS GERAIS | STATUS`
- Cabeçalho em uppercase com cor `rgb(21, 83, 102)` (teal escuro), `text-sm`
- Linhas com `hover:bg-[#F6FAFB]`, cursor pointer implícito
- Linhas clicáveis (`onclick: true`) — navega para `/programas/detalhes/:id`
- Separador horizontal entre linhas (thin border)
- Imagem de logo: avatar placeholder cinza (imagem não carregada/sem logo)
- PaginationBar embutida no rodapé da tabela

**FormCard (Formulário Novo/Editar Programa):**
- Card branco com bordas/padding
- Layout: Row com 4 campos em grid (Logo + Nome + Sigla + Diretor) + Textarea abaixo
- Logo: campo de upload de imagem (file input real oculto, input text como display)
- Divisor horizontal antes dos botões de ação
- Botões alinhados à direita (justify-end)
- No modo edição: botão "Desativar" à esquerda + "Cancelar" + "Salvar" à direita

**Sidebar (NavMenu):**
- Background `rgb(70, 78, 120)` (índigo escuro)
- Largura colapsada com ícones; expande ao hover com `hover:w-fit transition-all`
- Itens de menu com ícones SVG brancos
- Submenu expansível em accordion (Gestão de Programas > Programas)
- 7 seções visíveis: Dashboard, Gestão de Parceiros, Gestão de Programas, Gestão de Contratos, Plano Orçamentário, Relatórios, Financeiro, Gestão de Usuários

**TopBar:**
- Background branco, altura fixa `h-[56px]`
- Logo da aplicação (à esquerda)
- Saudação + Avatar do usuário (à direita) com dropdown

---

### 📐 Templates/Layouts

| Tela | Estrutura | Descrição |
|---|---|---|
| **Lista de Programas** | `Dual-panel (sidebar + content)` | Sidebar fixa à esquerda + área de conteúdo com título, SearchField + CTA, DataTable + Pagination |
| **Detalhe do Programa** | `Detail view (sidebar + form card)` | Breadcrumb "Programas > Detalhes" + FormCard read-only + botões Voltar/Editar |
| **Editar Programa** | `Edit view (sidebar + form card)` | Breadcrumb "Programas > Editar Programa" + FormCard editável + Desativar/Cancelar/Salvar |
| **Novo Programa** | `Create view (sidebar + form card)` | Breadcrumb "Novo Programa" + FormCard vazio + Cancelar/Adicionar |

**Grid do FormCard:** Layout responsivo de 1 row com 4 colunas (Logo + Nome + Sigla + Diretor) + 1 row abaixo com textarea full-width.

---

## Seção 2 — Dicionário de Dados e Entidades (DDD)

### 🏛️ Entidade Principal: `Programa`

**Bounded Context:** `Gestão de Programas`

| Atributo | Campo UI | Tipo Inferido | Restrições/Observações |
|---|---|---|---|
| `id` | (oculto — URL param) | `number` | ID numérico. Ex: `116` observado em `/programas/detalhes/116` |
| `name` | Nome do Programa | `string` | `name="name"`, `id="name"`. Campo texto livre |
| `abbreviation` | Sigla | `string` | `name="abbreviation"`, `id="abbreviation"`. Provavelmente sigla curta do programa |
| `director` | Diretor | `string` | `name="director"`, `id="director"`. Nome do diretor responsável |
| `description` / `characteristics` | Características Gerais | `string` (texto longo) | Textarea. Placeholder "Digite aqui..." |
| `logo` | Logo do Programa | `File` / `string` (URL) | Input type="file", `name="label"`. Upload de imagem |
| `status` | Status | `string` enum | Valores observados: `"Ativo"`. Inferido também valor `"Inativo"` (pelo botão "Desativar") |

**Dados reais observados:**

| id | name | abbreviation | director | description | status |
|---|---|---|---|---|---|
| 116 | EPV | EPV | Vinícius Basílio | Descrição do programa EPV | Ativo |
| (?) | PARC | PARC | (?) | Descrição do programa PARC | Ativo |

---

### 🔗 Relacionamentos Visíveis

A entidade `Programa` parece ser um agregado raiz do bounded context de Gestão de Programas. Pelos menus do sistema, existem relacionamentos implícitos com:
- **Contrato** (via "Gestão de Contratos" no menu)
- **Parceiro** (via "Gestão de Parceiros" no menu)
- **Centro de Custo** e **Financiador** (visíveis no Dashboard)
- **Plano Orçamentário** (menu dedicado)

Porém, na tela de Gestão de Programas específica, o `Programa` aparece como entidade independente sem FK visível na UI desta feature.

---

### ⚖️ Invariantes e Validações Observadas

- **Status transitivo:** O botão "Desativar" (vermelhor, danger) sugere uma transição de estado `Ativo → Inativo`. A operação de desativação está separada do CRUD normal, indicando uma regra de negócio específica (soft delete/status change).
- **Campos no formulário de criação:** Nenhum campo marcado como `required` (HTML `required=false` em todos), mas o botão "Adicionar" pode ter validação client-side não observada diretamente.
- **ID imutável:** O ID do programa está na URL, não no formulário. Inferência: gerado pelo backend no momento da criação.
- **Upload de Logo:** Input real é `type="file"` com `name="label"`, indicando que o logo é enviado como form-data multipart.

---

### 🗂️ Schema Inferido (para Zod / TypeScript)

```typescript
const ProgramaSchema = z.object({
  id: z.number().int().positive().optional(), // Gerado pelo backend
  name: z.string().min(1), // "Nome do Programa"
  abbreviation: z.string().min(1), // "Sigla"
  director: z.string().optional(), // "Diretor"
  description: z.string().optional(), // "Características Gerais"
  logo: z.instanceof(File).optional(), // Upload de imagem
  status: z.enum(["Ativo", "Inativo"]).default("Ativo"),
});

type Programa = z.infer<typeof ProgramaSchema>;
```

---

## Seção 3 — Jornadas do Usuário (User Stories e BDD)

### 👤 Atores/Papéis

| Ator | Identificação |
|---|---|
| **Usuário Autenticado** | `Alessandra Castro - Teste` — Role não explicitamente exibida, mas tem acesso completo (criar, editar, desativar) |
| **Administrador (inferido)** | Acesso a "Gestão de Usuários" no menu sugere papel de admin com permissões expandidas |

---

### 🗺️ Principais Casos de Uso (Jornadas)

#### UC-01: Listar Programas
1. Usuário acessa `Gestão de Programas > Programas` no sidebar
2. Sistema navega para `/programas`
3. Tabela exibe lista de programas com colunas: Logo, Nome, Características Gerais, Status
4. Usuário pode buscar por nome via campo "Pesquise"
5. Usuário pode alterar quantidade de itens por página (5/10/25)
6. Usuário pode navegar entre páginas com botões `<` e `>`

#### UC-02: Visualizar Detalhes de um Programa
1. Usuário clica em uma linha da tabela
2. Sistema navega para `/programas/detalhes/:id`
3. FormCard exibe todos os campos em modo **read-only** (`disabled: true`)
4. Botões disponíveis: "Voltar" (volta para lista) e "Editar" (vai para edição)

#### UC-03: Editar um Programa
1. Na tela de detalhes, usuário clica em "Editar"
2. Sistema navega para `/programas/editar/:id`
3. FormCard com campos editáveis (todos `disabled: false`)
4. Botões: "Desativar" (à esquerda, danger), "Cancelar" (fecha edição) e "Salvar" (submete)
5. Ao clicar "Salvar": provavelmente dispara PUT/PATCH para a API com os dados atualizados
6. Ao clicar "Cancelar": retorna para a tela de detalhes sem salvar

#### UC-04: Criar Novo Programa
1. Na listagem, usuário clica em "Adicionar Programa"
2. Sistema navega para `/programas/adicionar`
3. FormCard vazio com todos os campos habilitados
4. Botões: "Cancelar" (retorna para lista) e "Adicionar" (submete o formulário)
5. Ao clicar "Adicionar": dispara POST para a API com os dados do programa

#### UC-05: Desativar um Programa
1. Na tela de edição, usuário clica em "Desativar" (botão vermelho)
2. Provavelmente: modal de confirmação (não observado diretamente)
3. Sistema faz requisição para mudar o status do programa para "Inativo"
4. Programa deixa de aparecer na listagem ativa (ou aparece como Inativo)

---

### 🧪 Cenários BDD (Given-When-Then)

```gherkin
Feature: Gestão de Programas

  # UC-01: Listar
  Scenario: Visualizar lista de programas ativos
    Given o usuário está autenticado no sistema
    When o usuário acessa "Gestão de Programas > Programas" no menu
    Then o sistema exibe uma tabela com as colunas "LOGO", "NOME", "CARACTERÍSTICAS GERAIS" e "STATUS"
    And os programas "EPV" e "PARC" estão listados com status "Ativo"
    And a paginação exibe "Itens por página: 5" e o contador "1 - 1"

  Scenario: Buscar programa por nome
    Given o usuário está na tela de listagem de Programas
    When o usuário digita um termo no campo "Pesquise"
    Then a lista é filtrada exibindo apenas programas cujo nome contém o termo buscado

  # UC-02: Detalhar
  Scenario: Visualizar detalhes de um programa
    Given o usuário está na listagem de Programas
    When o usuário clica na linha do programa "EPV"
    Then o sistema navega para "/programas/detalhes/116"
    And o formulário exibe os campos "Nome do Programa", "Sigla", "Diretor" e "Características Gerais" em modo somente-leitura
    And os botões "Voltar" e "Editar" estão visíveis

  # UC-03: Editar
  Scenario: Editar dados de um programa existente
    Given o usuário está na tela de detalhes do programa "EPV"
    When o usuário clica no botão "Editar"
    Then o sistema navega para "/programas/editar/116"
    And todos os campos do formulário ficam habilitados para edição
    And os botões "Desativar", "Cancelar" e "Salvar" estão visíveis

  Scenario: Salvar alterações em um programa
    Given o usuário está na tela de edição do programa "EPV"
    And o usuário altera o campo "Diretor" para "João Silva"
    When o usuário clica no botão "Salvar"
    Then o sistema envia as alterações para a API
    And o usuário é redirecionado para a tela de detalhes com os dados atualizados

  # UC-04: Criar
  Scenario: Criar um novo programa
    Given o usuário está na listagem de Programas
    When o usuário clica no botão "Adicionar Programa"
    Then o sistema navega para "/programas/adicionar"
    And um formulário vazio é exibido com os campos "Logo do Programa", "Nome do Programa", "Sigla", "Diretor" e "Características Gerais"
    And os botões "Cancelar" e "Adicionar" estão visíveis

  Scenario: Submeter criação de novo programa
    Given o usuário está na tela "Novo Programa"
    And o usuário preenche "Nome do Programa" com "TESTE"
    And o usuário preenche "Sigla" com "TST"
    When o usuário clica no botão "Adicionar"
    Then o sistema envia um POST para a API com os dados do programa
    And o usuário é redirecionado para a listagem de Programas
    And o novo programa "TESTE" aparece na lista com status "Ativo"

  # UC-05: Desativar
  Scenario: Desativar um programa ativo
    Given o usuário está na tela de edição de um programa com status "Ativo"
    When o usuário clica no botão "Desativar"
    Then o sistema solicita confirmação da operação
    And ao confirmar, o status do programa é alterado para "Inativo"
    And o programa é removido da listagem ativa

  # Edge Cases
  Scenario: Lista vazia de programas
    Given não há programas cadastrados no sistema
    When o usuário acessa a listagem de Programas
    Then o sistema exibe um estado vazio (empty state)
    And a paginação exibe "0 - 0"

  Scenario: Cancelar edição de programa
    Given o usuário está na tela de edição de um programa
    And o usuário fez alterações nos campos
    When o usuário clica em "Cancelar"
    Then as alterações são descartadas
    And o usuário retorna para a tela de detalhes com os dados originais
```

---

## Seção 4 — Integração e API (Observável via XHR/Fetch)

### 🌐 Rotas e Estrutura de Navegação

| Rota Frontend (Next.js) | Tipo | Descrição |
|---|---|---|
| `/programas` | Listagem | DataTable de programas |
| `/programas/adicionar` | Criação | Formulário novo programa |
| `/programas/detalhes/:id` | Detalhe | View read-only (ex: `id=116`) |
| `/programas/editar/:id` | Edição | Formulário editável (ex: `id=116`) |

### 📡 Chunks JS (Next.js App Router) — Feature Map

Observados durante navegação:
```
/programas/editar/[id]/page-ae59c46236a237f5.js
/programas/detalhes/[id]/page-f35091bc4ab43d48.js
```

Esses chunks confirmam que as rotas são `[id]` dinâmicas no App Router do Next.js, com páginas separadas para detalhe e edição.

### 🔌 Endpoints de API Inferidos (BFF Pattern)

Com base no padrão de URL, nomes de campos de formulário e comportamento da feature, os endpoints esperados do BFF são:

```
GET    /api/programs                    → Lista paginada de programas
       Query params: ?page=1&limit=5&search=

GET    /api/programs/:id               → Detalhes de um programa específico
       Response: { id, name, abbreviation, director, description, logo, status }

POST   /api/programs                   → Criar novo programa
       Body: FormData { name, abbreviation, director, description, label (logo file) }
       Response: { id, name, abbreviation, director, description, logo, status: "Ativo" }

PUT/PATCH /api/programs/:id           → Editar programa existente
       Body: FormData { name, abbreviation, director, description, label (logo file) }
       Response: { id, name, abbreviation, director, description, logo, status }

PATCH  /api/programs/:id/deactivate   → Desativar programa (mudança de status)
       Body: { status: "Inativo" } ou endpoint dedicado
       Response: { id, status: "Inativo" }
```

### 📦 Payload Inferido (Response de GET /api/programs)

```json
{
  "data": [
    {
      "id": 116,
      "name": "EPV",
      "abbreviation": "EPV",
      "director": "Vinícius Basílio",
      "description": "Descrição do programa EPV",
      "logo": null,
      "status": "Ativo"
    },
    {
      "id": ?,
      "name": "PARC",
      "abbreviation": "PARC",
      "director": "...",
      "description": "Descrição do programa PARC",
      "logo": null,
      "status": "Ativo"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 5,
    "totalPages": 1
  }
}
```

### ⚠️ Observação sobre captura de XHR

As requisições ao backend não foram capturadas diretamente via ferramenta de rede porque o aplicativo usa Next.js com **Server Components** e **RSC (React Server Components)**. As requisições observadas via `_rsc=` query params são do protocolo de streaming do Next.js 13+ App Router — as chamadas reais ao backend acontecem server-side. Os chunks JS carregados confirmam a estrutura das rotas.

O nome dos inputs (`name`, `abbreviation`, `director`, `label`) são os nomes reais dos campos que serão enviados no `FormData` para a API.

---

## 📋 Resumo para Preenchimento de Templates

| Template | Alimentado por |
|---|---|
| `design-interface-inventory-template.fe.md` | Seção 1 completa (tokens, átomos, moléculas, organismos, layouts) |
| `domain-template.fe.md` | Seção 2 (entidade `Programa`, schema Zod, atributos, invariantes) |
| `spec-template.fe.md` | Seção 3 (User Stories, critérios de aceite por UC) |
| `bdd-template.md` | Seção 3 (cenários Given-When-Then prontos) |
| `api-readiness-template.fe.md` | Seção 4 (endpoints, payloads inferidos, estrutura FormData) |
