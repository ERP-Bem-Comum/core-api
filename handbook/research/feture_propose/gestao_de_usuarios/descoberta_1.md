# Complementos e Correções — Todos os arquivos atualizados

---

## Novos screenshots capturados nesta rodada

Adicione ao `gestao-de-usuarios/usuarios/screenshots.md`:

```markdown
19-sidebar-expandido.png         | ss_20928xppn     | Sidebar expandido — "Gestão de Usuários" aberto com sub-itens "Usuários" e "Minha Conta"
20-modal-cancelar-descartar.png  | ss_29504ebb5     | Modal "Ao confirmar essa opção todas as suas alterações serão perdidas."
21-modal-sucesso-edicao.png      | ss_6422fwqrr     | Modal sucesso "Usuário editado  com sucesso!" + botão "Entendi"
22-adicionar-email-invalido.png  | ss_32379xihj     | Validação com campos parcialmente preenchidos — "Email inválido"
```

---

## Adições ao `gestao-de-usuarios/usuarios/context.md`

Inserir na seção **"O que importa manter"**:

```markdown
- O botão "Cancelar" na tela de edição NÃO cancela imediatamente — abre modal de confirmação:
  "Ao confirmar essa opção todas as suas alterações serão perdidas." Botões:
  "Sim, Descartar alterações" (azul) e "Não Descartar alterações" (branco/outline).
  Ao confirmar → redireciona para /usuarios (listagem).
- O botão ← (voltar) na tela de edição redireciona para /usuarios (listagem),
  sem passar pelo detalhe.
- O botão "Voltar" na tela de detalhe redireciona para /usuarios (listagem).
- Após salvar com sucesso: modal de feedback "Usuário editado  com sucesso!" (ícone checkmark
  verde) + botão "Entendi" (azul) → ao clicar, redireciona para /usuarios.
  * Bug de UI: espaço duplo em "editado  com sucesso!" — sanear na reconstrução.
- Mensagens de validação: "Email inválido" (para email com formato errado) é diferente de
  "Campo Obrigatório" (para campo vazio). Ou seja:
  Nome vazio    → "Campo Obrigatório"
  CPF vazio/inválido → "CPF com formato inválido"
  Email vazio   → "Campo Obrigatório"
  Email com formato errado → "Email inválido"
  Telefone vazio/inválido → "Telefone com formato inválido"
- A coluna PERFIL **não existe na API** — os endpoints /users e /users/:id não retornam
  esse campo. Campos reais da API: id, name, email, cpf, telephone, imageUrl, active,
  massApprovalPermission, collaboratorId. A coluna é um placeholder sem backend.
```

---

## Adições ao `gestao-de-usuarios/usuarios/dom.md`

Inserir novos estados:

````markdown
---

## ..dom.txt
Estado: Modal — Descartar Alterações (sobre /usuarios/editar/:id)

- presentation
  - ícone info
  - text: "Ao confirmar essa opção todas as suas alterações serão perdidas."
  - button "Sim, Descartar alterações" [ref_21] — azul (confirma descarte → /usuarios)
  - button "Não Descartar alterações" [ref_22] — branco/outline (fecha modal, permanece na edição)

---

## ..dom.txt
Estado: Modal — Sucesso ao Salvar (sobre /usuarios/editar/:id)

- presentation
  - ícone checkmark verde (círculo)
  - text: "Usuário editado  com sucesso!"   ← * bug de UI: espaço duplo — sanear
  - button "Entendi" — azul → ao clicar, redireciona para /usuarios
````

---

## `gestao-de-usuarios/evidencias_soltas/reconstructed-spec.md` — VERSÃO COMPLETA

````markdown
# Reconstructed Spec — Usuários (tela-âncora)

## Contexto

Tela principal do módulo Gestão de Usuários. Ponto de entrada para todas as operações sobre
contas de usuário do ERP. Acessível via sidebar (item "Gestão de Usuários" > sub-item "Usuários").
Rota: /usuarios.

---

## Layout geral (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo]  [Sidebar 72px]          Olá, Alessandra Castro – Teste  [AC ▾]   │
├─────────┬────────────────────────────────────────────────────────────────┤
│ sidebar │  Usuários                                                       │
│ (72px   │                                                                 │
│ collapsed│  ┌──────────────────────────────────────────────────────────┐ │
│ ou 232px │  │ [⚗]  [🔍 Pesquise_______________________]  [Adicionar ▶] │ │
│ expanded)│  │                                                          │ │
│         │  │ ← painel de filtros (oculto por padrão, toggle via ⚗)    │ │
│         │  │  Status [Todos ▾]  [Filtrar]                             │ │
│         │  ├──────────────────────────────────────────────────────────┤ │
│         │  │ NOME              PERFIL          STATUS                 │ │
│         │  ├──────────────────────────────────────────────────────────┤ │
│         │  │ Agatha Mendonça                   Ativo                  │ │
│         │  │ Amanda Manoel                     Ativo                  │ │
│         │  │ ...                                                      │ │
│         │  │ Heloisa de Brito                  Inativo                │ │
│         │  ├──────────────────────────────────────────────────────────┤ │
│         │  │          Itens por página: [5▾]    1 – 5   [←]  [→]    │ │
│         │  └──────────────────────────────────────────────────────────┘ │
└─────────┴────────────────────────────────────────────────────────────────┘
```

**Sidebar expandida** (quando aberta):
```
├ Dashboard
├ Gestão de Parceiros ▾
├ Gestão de Programas ▾
├ Gestão de Contratos ▾
├ Plano Orçamentário ▾
├ Relatórios ▾
├ Financeiro ▾
└ Gestão de Usuários ▲ (ativo)
    ├ Usuários          ← item ativo (highlighted)
    └ Minha Conta
```

---

## Conteúdo da tela

**Cabeçalho de página**: `<div>` "Usuários" — 24px, weight 700, color `rgb(2, 8, 23)`

**Barra de ferramentas** (dentro do card branco):
- Botão funil (ícone) — toggle do painel de filtros; bg transparente, border-radius 6px
- Input "Pesquise" (live search) — com ícone de lupa inline
- Botão "Adicionar Usuário" — bg `rgb(50, 198, 244)`, color `rgb(21, 83, 102)`, border-radius 6px, font-weight 700, 14px

**Painel de filtros** (expansível, oculto por padrão):
- Dropdown "Status" (opções: Todos · Ativo · Inativo)
- Botão "Filtrar" — outline, border `1px solid rgb(21, 83, 102)`, bg branco, border-radius 6px

**Tabela**:
- 3 colunas: NOME · PERFIL · STATUS
- Header: bg `rgb(245, 245, 245)`, color `rgb(36, 141, 173)`, 14px, weight 600
- Células: color `rgba(0,0,0,0.87)`, 14px
- Linhas clicáveis → detalhe; sem cursor:pointer visível no CSS (cursor: auto)
- Estado vazio: texto "Nenhum resultado encontrado"
- Estado loading: spinner centralizado (spinner azul)
- Separador de linha: `border-bottom: 0px solid rgb(226, 232, 240)` (linha sutil — visível visualmente como separador da MUI)

**Paginação** (rodapé do card):
- Dropdown de itens por página: 5 · 10 · 25
- Indicador de página: "X – Y" (página atual – total páginas)
- Botões ← e → para navegar; coloridos em azul `rgb(36, 141, 173)` quando ativos

---

## Estados

| Estado                        | Gatilho                              | Comportamento visual                              |
|-------------------------------|--------------------------------------|---------------------------------------------------|
| Listagem preenchida           | Carga inicial                        | Tabela com linhas, paginação visível              |
| Loading                       | Mudança de página / busca em curso   | Spinner azul no lugar da tabela                  |
| Busca com resultado           | Digitar no campo Pesquise (debounce) | Filtra linhas em tempo real, sem botão            |
| Busca vazia                   | String sem correspondência           | "Nenhum resultado encontrado", paginação "1–0"   |
| Filtros abertos               | Clicar ícone funil                   | Linha extra com Status e Filtrar                  |
| Filtro Status aplicado        | Clicar "Filtrar"                     | Recarrega tabela filtrada                         |
| Detalhe                       | Clicar linha                         | Navega /usuarios/detalhes/:id — campos disabled  |
| Edição                        | Clicar "Editar" no detalhe           | Navega /usuarios/editar/:id — campos enabled     |
| Cancelar edição               | Clicar "Cancelar"                    | Modal de confirmação descarte                    |
| Descarte confirmado           | "Sim, Descartar alterações"          | Redireciona /usuarios                            |
| Salvar com sucesso            | Submeter form válido                 | Modal "Usuário editado com sucesso!" → Entendi → /usuarios |
| Desativar/Ativar              | Botão na tela de edição              | Modal de confirmação → redireciona /usuarios     |
| Adicionar                     | Botão "Adicionar Usuário"            | Navega /usuarios/adicionar                       |
| Validação de formulário       | Submeter form inválido               | Campos com borda vermelha + mensagem inline      |

---

## Modelo de dados implícito (interfaces TypeScript inferidas)

```typescript
// Resposta da listagem — GET /users?page=1&limit=5&search=
interface UsuariosListResponse {
  items: UsuarioListItem[];
  meta: {
    totalItems: number;   // 23
    itemCount: number;
    itemsPerPage: number; // 5 | 10 | 25
    totalPages: number;   // 1 com 25/pág
    currentPage: number;
  };
}

interface UsuarioListItem {
  id: number;     // ex.: 4, 83
  name: string;   // "Amanda Manoel"
  email: string;  // "amanda-manoel@tuamaeaquelaursa.com"
  cpf: string;    // "79779546057" (sem formatação na API — formatado no frontend)
  active: boolean;
  // NOTA: telephone, imageUrl, massApprovalPermission NÃO vêm na listagem
  // NOTA: campo "perfil" NÃO existe na API — coluna da tabela é placeholder
}

// Resposta do detalhe — GET /users/:id
interface UsuarioDetailResponse {
  user: UsuarioDetail;
}

interface UsuarioDetail {
  id: number;
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601
  name: string;
  email: string;
  cpf: string;                // sem formatação: "79779546057"
  telephone: string;          // sem formatação: "15997133502"
  imageUrl: string | null;    // nome do arquivo ou null
  active: boolean;
  massApprovalPermission: boolean;
  collaboratorId: number | null;
}

// Exibição no frontend (formatado)
interface UsuarioDisplay {
  id: number;
  nome: string;               // name
  cpf: string;                // formatado: "797.795.460-57"
  email: string;
  telefone: string;           // formatado: "(15)99713-3502"
  fotoDePerfil: string;       // imageUrl (nome de arquivo ou "")
  aprovadorEmMassa: boolean;  // massApprovalPermission
  status: 'Ativo' | 'Inativo'; // derivado de active
}
```

---

## Comportamentos e interações

| Ação do usuário                    | Resposta do sistema                                               |
|------------------------------------|-------------------------------------------------------------------|
| Digitar no Pesquise                | Live search com debounce — recarrega; nenhum botão de submit      |
| Clicar ícone funil                 | Expande/colapsa painel de filtros (toggle)                        |
| Selecionar Status no dropdown      | Não aplica ainda — aguarda clique em "Filtrar"                    |
| Clicar "Filtrar"                   | Aplica filtro, recarrega tabela                                   |
| Clicar linha da tabela             | Navega para /usuarios/detalhes/:id                                |
| Clicar "Adicionar Usuário"         | Navega para /usuarios/adicionar                                   |
| Alterar itens por página           | Recarrega tabela com novo pageSize                                |
| Clicar ← / →                       | Navega entre páginas (spinner durante carga)                      |
| Clicar "Editar" no detalhe         | Navega para /usuarios/editar/:id                                  |
| Clicar "←" no detalhe             | Redireciona para /usuarios (NÃO usa history.back)                 |
| Clicar "Voltar" no detalhe         | Redireciona para /usuarios                                        |
| Clicar "←" na edição              | Redireciona para /usuarios (NÃO usa history.back)                 |
| Clicar "Cancelar" na edição        | Abre modal "Descartar alterações"                                 |
| "Sim, Descartar alterações"        | Redireciona para /usuarios                                        |
| "Não Descartar alterações"         | Fecha modal, permanece na edição                                  |
| Submeter form válido               | POST/PUT → Modal "Usuário editado com sucesso!" → "Entendi" → /usuarios |
| Submeter form inválido             | Valida inline (sem submit); bordas vermelhas + mensagens          |
| Clicar "Desativar" (ativo)         | Modal: "Você está desativando este usuário. Tem certeza?"         |
| Clicar "Ativar" (inativo)          | Modal: "Você está ativando este usuário. Tem certeza?"            |
| Confirmar ativar/desativar         | Executa ação → presumivelmente redireciona /usuarios (inferido)  |
| "Não desativar" / "Não ativar"     | Fecha modal, permanece na edição                                  |
| Clicar "Cancelar" no adicionar     | (inferido) Mesma lógica que editar — modal de descarte ou direto  |
| Clicar "←" no adicionar           | Redireciona para /usuarios                                        |

---

## Design tokens observados

| Token                    | Valor real (computado)                         | Uso                                            |
|--------------------------|------------------------------------------------|------------------------------------------------|
| `--color-primary`        | `rgb(50, 198, 244)` / `#32C6F4`               | Botões primários (Adicionar, Salvar, Filtrar hover) |
| `--color-primary-text`   | `rgb(21, 83, 102)` / `#155366`                | Texto sobre primário; border de botão outline   |
| `--color-danger`         | `rgb(255, 83, 83)` / `#FF5353`                | Botão "Desativar"; borda de modal de confirmação |
| `--color-header-col`     | `rgb(36, 141, 173)` / `#248DAD`               | Cabeçalhos de coluna da tabela; paginação ativa |
| `--color-sidebar-bg`     | `rgb(70, 78, 120)` / `#464E78`                | Background da sidebar (colapsa e expande)       |
| `--color-page-bg`        | `rgb(232, 238, 240)` / `#E8EEF0`              | Fundo da área de conteúdo (cinza azulado claro) |
| `--color-card-bg`        | `rgb(255, 255, 255)` / `#FFFFFF`              | Background dos cards/formulários                |
| `--color-table-header-bg`| `rgb(245, 245, 245)` / `#F5F5F5`              | Background do thead da tabela                   |
| `--color-text-primary`   | `rgb(2, 8, 23)` / `#020817`                   | Texto principal (títulos, campos)               |
| `--color-text-cell`      | `rgba(0, 0, 0, 0.87)`                         | Texto das células da tabela                     |
| `--color-error`          | vermelho (aprox. `#D32F2F` — MUI default)     | Bordas e textos de validação de erro            |
| `--color-card-shadow`    | `rgba(0,0,0,0.05) 0px 1px 2px 0px`           | Sombra suave dos cards                          |
| `--border-radius-btn`    | `6px`                                         | Botões primários, outline e ícone               |
| `--border-radius-card`   | `8px`                                         | Cards/Paper                                     |
| `--font-family`          | `Inter` (next/font)                           | Fonte principal                                 |
| `--font-size-title`      | `24px`, weight `700`                          | Título da página (`h1`)                         |
| `--font-size-col-header` | `14px`, weight `600`                          | Cabeçalhos de coluna                            |
| `--font-size-cell`       | `14px`, weight padrão                         | Células da tabela                               |
| `--font-size-btn`        | `14px`, weight `700` (primário) / `500` (danger) | Textos de botão                              |
| `--font-size-input`      | `16px`                                        | Inputs de formulário                            |
| `--sidebar-width-collapsed`| `72px`                                      | Sidebar colapsada (apenas ícones)               |
| `--sidebar-width-expanded` | `232px` (inferido)                          | Sidebar expandida (ícones + labels)             |

---

## Breakdown de componentes (árvore React inferida)

```
<AppLayout>
  <Sidebar>
    <SidebarLogo />
    <NavItem icon="home" label="Dashboard" />
    <NavAccordion label="Gestão de Parceiros" />
    <NavAccordion label="Gestão de Programas" />
    <NavAccordion label="Gestão de Contratos" />
    <NavAccordion label="Plano Orçamentário" />
    <NavAccordion label="Relatórios" />
    <NavAccordion label="Financeiro" />
    <NavAccordion label="Gestão de Usuários" isOpen>
      <NavSubItem label="Usuários" href="/usuarios" isActive />
      <NavSubItem label="Minha Conta" href="/minha-conta" />
    </NavAccordion>
  </Sidebar>

  <TopBar>
    <UserGreeting name="Alessandra Castro - Teste" />
    <UserAvatarMenu initials="AC" />
  </TopBar>

  <PageContent>
    {/* Rota /usuarios */}
    <UsuariosPage>
      <PageTitle>Usuários</PageTitle>
      <DataCard>
        <Toolbar>
          <FilterToggleButton onClick={toggleFilters} />
          <SearchInput
            label="Pesquise"
            value={search}
            onChange={onSearchChange}  {/* live/debounced */}
          />
          <Button variant="primary" onClick={goToAdicionar}>
            Adicionar Usuário
          </Button>
        </Toolbar>

        <FilterPanel isOpen={filtersOpen}>
          <StatusSelect
            label="Status"
            options={["Todos", "Ativo", "Inativo"]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <Button variant="outline" onClick={applyFilter}>
            Filtrar
          </Button>
        </FilterPanel>

        <DataTable
          columns={[
            { key: "name",   label: "NOME" },
            { key: "perfil", label: "PERFIL" },  {/* sempre vazio */}
            { key: "status", label: "STATUS" },
          ]}
          rows={usuarios}
          onRowClick={(row) => navigate(`/usuarios/detalhes/${row.id}`)}
          emptyMessage="Nenhum resultado encontrado"
          loading={isLoading}
          loadingComponent={<Spinner />}
        />

        <TablePagination
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25]}
          onPageSizeChange={setPageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={prevPage}
          onNext={nextPage}
          label={`${currentPage} - ${totalPages}`}
        />
      </DataCard>
    </UsuariosPage>

    {/* Rota /usuarios/detalhes/:id */}
    <UsuarioDetalhesPage>
      <BackButton onClick={() => navigate("/usuarios")} />
      <PageTitle>Usuários &gt; Detalhes</PageTitle>
      <DataCard>
        <UserForm disabled>
          <TextField label="Nome"     name="name" />
          <TextField label="CPF"      name="cpf" />
          <TextField label="Email"    name="email" />
          <TextField label="Telefone" name="telephone" />
          <FileDisplayField label="Foto de Perfil" name="imageUrl" disabled />
          <Checkbox label="Aprovador em Massa" name="massApprovalPermission" disabled />
        </UserForm>
        <FormActions>
          <Button variant="outline" onClick={() => navigate("/usuarios")}>Voltar</Button>
          <Button variant="primary" onClick={() => navigate(`/usuarios/editar/${id}`)}>Editar</Button>
        </FormActions>
      </DataCard>
    </UsuarioDetalhesPage>

    {/* Rota /usuarios/editar/:id */}
    <UsuarioEditarPage>
      <BackButton onClick={() => navigate("/usuarios")} />
      <PageTitle>Usuários &gt; Editar Usuário</PageTitle>
      <DataCard>
        <UserForm>
          <TextField label="Nome"     name="name" />
          <TextField label="CPF"      name="cpf" />
          <TextField label="Email"    name="email" />
          <TextField label="Telefone" name="telephone" />
          <FileUploadField label="Foto de Perfil" name="imageUrl" />
          <Checkbox label="Aprovador em Massa" name="massApprovalPermission" />
        </UserForm>
        <FormActions>
          {usuario.active
            ? <Button variant="danger" onClick={openDesativarModal}>Desativar</Button>
            : <Button variant="primary" onClick={openAtivarModal}>Ativar</Button>
          }
          <Button variant="outline" onClick={openDescartarModal}>Cancelar</Button>
          <Button variant="primary" type="submit">Salvar</Button>
        </FormActions>
      </DataCard>

      <ConfirmModal
        isOpen={desativarModalOpen}
        icon="info"
        message="Você está desativando este usuário. Tem certeza que deseja continuar?"
        onConfirm={desativarUsuario}
        onCancel={closeDesativarModal}
        confirmLabel="Sim, tenho certeza"
        cancelLabel="Não desativar"
      />
      <ConfirmModal
        isOpen={ativarModalOpen}
        icon="info"
        message="Você está ativando este usuário. Tem certeza que deseja continuar?"
        onConfirm={ativarUsuario}
        onCancel={closeAtivarModal}
        confirmLabel="Sim, tenho certeza"
        cancelLabel="Não ativar"
      />
      <ConfirmModal
        isOpen={descartarModalOpen}
        icon="info"
        message="Ao confirmar essa opção todas as suas alterações serão perdidas."
        onConfirm={() => navigate("/usuarios")}
        onCancel={closeDescartarModal}
        confirmLabel="Sim, Descartar alterações"
        cancelLabel="Não Descartar alterações"
      />
      <SuccessModal
        isOpen={successModalOpen}
        icon="check-circle"
        message="Usuário editado com sucesso!"
        onConfirm={() => navigate("/usuarios")}
        confirmLabel="Entendi"
      />
    </UsuarioEditarPage>

    {/* Rota /usuarios/adicionar */}
    <UsuarioAdicionarPage>
      <BackButton onClick={() => navigate("/usuarios")} />
      <PageTitle>Novo Usuário</PageTitle>
      <DataCard>
        <UserForm>
          <TextField label="Nome"     name="name"      required />
          <TextField label="CPF"      name="cpf"       required format="cpf" />
          <TextField label="Email"    name="email"     required type="email" />
          <TextField label="Telefone" name="telephone" required format="phone" />
          <FileUploadField label="Foto de Perfil" name="imageUrl" />
          <Checkbox label="Aprovador em Massa" name="massApprovalPermission" />
        </UserForm>
        <FormActions>
          <Button variant="outline" onClick={openDescartarModal}>Cancelar</Button>
          <Button variant="primary" type="submit">Adicionar</Button>
        </FormActions>
      </DataCard>
    </UsuarioAdicionarPage>

  </PageContent>
</AppLayout>
```

---

## Rotas

| Rota                         | Componente           | Descrição                              |
|------------------------------|----------------------|----------------------------------------|
| `/usuarios`                  | UsuariosPage         | Listagem com busca, filtro, paginação  |
| `/usuarios/detalhes/:id`     | UsuarioDetalhesPage  | Somente-leitura (campos disabled)      |
| `/usuarios/editar/:id`       | UsuarioEditarPage    | Edição + Ativar/Desativar              |
| `/usuarios/adicionar`        | UsuarioAdicionarPage | Criação de novo usuário                |
| `/minha-conta`               | MinhaContaPage       | Perfil do usuário logado (via modais)  |

---

## API observada

| Método | Endpoint                  | Query params                              | Retorno                                 |
|--------|---------------------------|-------------------------------------------|-----------------------------------------|
| GET    | `/users`                  | `page`, `limit`, `search`, `status`(?)    | `{ items: [...], meta: { ... } }`       |
| GET    | `/users/:id`              | —                                         | `{ user: { ... } }`                     |
| PUT    | `/users/:id`              | body com campos editáveis                 | (inferido) usuário atualizado           |
| POST   | `/users`                  | body com todos os campos                  | (inferido) usuário criado               |
| PATCH  | `/users/:id/activate`     | —                                         | (inferido) muda active=true             |
| PATCH  | `/users/:id/deactivate`   | —                                         | (inferido) muda active=false            |

Backend base: `https://erp-financeiro-stag-backend-558775345474.us-central1.run.app`
Auth: Bearer JWT (next-auth session token)

---

## Observações e lacunas

### Confirmadas nesta rodada
- **Campo `perfil` não existe na API**: os endpoints `/users` e `/users/:id` retornam apenas
  `id, name, email, cpf, telephone, imageUrl, active, massApprovalPermission, collaboratorId`.
  A coluna PERFIL na tabela é 100% placeholder sem backend.
- **CPF vem sem formatação na API** (`"79779546057"`) — formatado no frontend para `"797.795.460-57"`.
- **Telefone vem sem formatação** (`"15997133502"`) — formatado no frontend para `"(15)99713-3502"`.
- **Todos os botões de navegação** (←, Voltar, Cancelar confirmado, Entendi) vão para `/usuarios`
  direto, não passam pelo detalhe. Não há `history.back()`.
- **Modal de sucesso** é diferente do padrão snackbar/toast — é um modal bloqueante com botão
  "Entendi".

### Lacunas não observadas
- **Estado de erro de API** ao salvar (ex.: CPF duplicado, email já em uso, servidor down) — não
  foi possível provocar esse erro no ambiente de teste. Presumivelmente abre um modal ou exibe
  mensagem inline; **marcar como lacuna**.
- **Comportamento de "Cancelar" no formulário de Adicionar** — não testado diretamente. Por
  analogia com Editar, provavelmente abre o mesmo modal de "Descartar alterações"; **marcar
  como inferido**.
- **Após Ativar/Desativar confirmado** — não testado o fluxo completo (evitado para não
  alterar dados). Por analogia com Salvar, provavelmente exibe modal de sucesso e redireciona
  para `/usuarios`; **marcar como inferido**.
- **Hover state da linha da tabela** — o CSS não registrou `cursor: pointer` nem background
  alternado via CSS computado; pode ser que o estado hover só apareça com interação real.
  Visualmente as linhas são clicáveis mas sem indicador visual claro — **possível bug de UX a
  sanear** (adicionar `cursor: pointer` + hover bg na reconstrução).
- **Comportamento do campo `collaboratorId`** — presente na API mas sem correspondência
  visível na UI. Pode ser um campo interno ou referência a outro módulo.
- **Comportamento do campo `imageUrl`** na listagem — a API não retorna esse campo na listagem
  (`/users`), apenas no detalhe (`/users/:id`). Portanto, **não há avatar/foto na tabela
  de listagem** — apenas nome e status.
- **Validação de CPF** — apenas formato verificado (regex/máscara), sem validação de dígitos
  verificadores confirmada; **marcar como inferido**.
- **Ordenação de colunas** — não há indicador de ordenação na tabela. Provavelmente ordenado
  por nome alfabético (servidor); **marcar como inferido**.
````

---

## Atualização do `gestao-de-usuarios/README.md` — tabela de bugs completa

Substituir a tabela de bugs pela versão final:

```markdown
### Decisões bug a bug (versão final)

| Bug / Observação                                                | Origem              | Decisão                                                              |
|-----------------------------------------------------------------|---------------------|----------------------------------------------------------------------|
| Coluna PERFIL sempre vazia — campo não existe na API            | Bug de API/design   | Sanear: manter coluna; renderizar quando API retornar o campo        |
| CPF sem formatação na API ("79779546057")                       | Comportamento API   | Replicar a formatação no frontend ("797.795.460-57")                 |
| Telefone sem formatação na API ("15997133502")                  | Comportamento API   | Replicar formatação ("(15)99713-3502")                               |
| Nome "vinicius" com inicial minúscula                           | Bug de dados        | Sanear: text-transform capitalize no display                         |
| Dois usuários "Vinícius Basílio"                                | Dados de teste      | Manter: não é bug de UI                                              |
| Breadcrumb "Usuários > Detalhes" não é link clicável            | Bug de UI           | Avaliar: padronizar com design system; botão ← já cobre navegação    |
| Campo "Foto de Perfil" exibe nome de arquivo truncado           | Bug de UX           | Sanear: mostrar preview ou nome completo com ellipsis                |
| Espaço duplo em "Usuário editado  com sucesso!"                 | Bug de UI/texto     | Sanear: corrigir string                                              |
| Hover state da linha da tabela sem cursor:pointer visual        | Bug de UX           | Sanear: adicionar cursor:pointer + hover background                  |
| Botões de confirmação empilhados verticalmente no modal Redefinir Senha vs. horizontais nos outros | Inconsistência de UI | Sanear: padronizar layout horizontal em todos os modais  |
| imageUrl não retorna na listagem (/users), só no detalhe        | Comportamento API   | Replicar: sem avatar na tabela de listagem                           |
```
````
