# Gestão de Usuários — Engenharia Reversa Completa

Abaixo está toda a documentação produzida, organizada por pasta/arquivo conforme o padrão solicitado.

---

## `gestao-de-usuarios/usuarios/context.md`

```markdown
# CONTEXT.md — Usuários

## O que é esta tela

Tela de gestão de contas de usuário do sistema ERP. Permite listar, buscar, filtrar, visualizar,
criar, editar, ativar e desativar usuários da plataforma.

## O que ela faz

- Listar todos os usuários cadastrados em tabela paginada (colunas: NOME · PERFIL · STATUS)
- Buscar usuários em tempo real por nome (live search — sem botão de submissão)
- Filtrar por status via painel expansível (dropdown: Todos · Ativo · Inativo) + botão "Filtrar"
- Navegar para detalhe somente-leitura de cada usuário (clique na linha)
- Criar novo usuário via botão "Adicionar Usuário" (formulário em rota separada)
- Editar usuário em rota separada (botão "Editar" no detalhe)
- Desativar usuário ativo / Ativar usuário inativo (botão contextual na tela de edição)
- Paginação configurável: 5 / 10 / 25 itens por página; indicador "página X – Y"

## O que importa manter (não mudar ao reconstruir)

- A coluna PERFIL existe no cabeçalho da tabela mas está **sempre vazia** para todos os
  registros no ambiente de teste. **Bug de dados/API — sanear, não replicar:** na reconstrução,
  renderizar o valor quando a API o retornar; não remover a coluna.
- O clique em qualquer ponto da linha navega para `/usuarios/detalhes/:id` (a linha inteira é
  clicável, não apenas um ícone).
- O filtro de status requer clicar em "Filtrar" para ser aplicado; a busca de texto é live
  (aplica automaticamente enquanto o usuário digita).
- O painel de filtros é toggle — abre/fecha clicando no botão de funil (ícone à esquerda do
  campo de busca). Quando aberto, aparece a linha "Status [dropdown] [Filtrar]" entre a barra
  de pesquisa e a tabela.
- O botão de ação na tela de edição é **condicional ao status**:
    - Usuário ativo → botão **"Desativar"** (vermelho/coral, posicionado à esquerda)
    - Usuário inativo → botão **"Ativar"** (azul, posicionado à esquerda)
- Ambas as ações de ativar/desativar abrem modal de confirmação com mesmo layout (ícone info,
  texto descritivo, botões "Não [ação]" azul e "Sim, tenho certeza" branco).
- Campo "Foto de Perfil" na tela de edição exibe o nome do arquivo atual truncado (disabled);
  o upload real é feito pelo botão de ícone ao lado.
- Paginação: o indicador mostra "página_atual – total_páginas" (ex.: "1 – 5", "2 – 5").
  Quando resultado vazio: "1 – 0".
- Estado vazio de busca exibe linha "Nenhum resultado encontrado" dentro da tabela (sem ícone
  adicional, sem mensagem fora da tabela).
- Validação no formulário de adicionar/editar: bordas vermelhas + mensagens inline abaixo do campo:
    - Nome → "Campo Obrigatório"
    - CPF → "CPF com formato inválido"
    - Email → "Campo Obrigatório"
    - Telefone → "Telefone com formato inválido"
- Volume de dados no ambiente de teste: **23 usuários** (21 Ativos · 2 Inativos).

## Fluxos especiais

- **Formulário de edição não usa modal** — navega para `/usuarios/editar/:id` (rota própria).
  Diferente de "Minha Conta", que usa modal inline para edição.
- **Breadcrumb como texto plano**: os títulos de página são "Usuários > Detalhes" e
  "Usuários > Editar Usuário" (texto estático `<h1>`, sem links clicáveis no breadcrumb).
  Bug de UI menor: inconsistência (poderia ser link); **replicar o comportamento atual** e
  avaliar padronização com o design system.

## Rotas

- `/usuarios`                    — listagem
- `/usuarios/detalhes/:id`       — detalhe (somente-leitura)
- `/usuarios/editar/:id`         — edição
- `/usuarios/adicionar`          — criação
```

---

## `gestao-de-usuarios/usuarios/dom.md`

````markdown
# dom.md — Usuários

---

## ..dom.txt
Capturado via read_page em /usuarios
Estado: Listagem preenchida (25 itens por página, filtros fechados)

- button [ref_14] — ícone funil (toggle painel de filtros)
- label "Pesquise" [ref_15]
- textbox "Pesquise" [ref_16] type="text" — value: "" (live search)
- button "Adicionar Usuário" [ref_18] type="button" — navega para /usuarios/adicionar
- table [ref_19]
  cols: NOME [ref_20] · PERFIL [ref_21] · STATUS [ref_22]
  rows (23 visíveis, sem paginação com 25/pág):
    [ref_23] "Agatha Mendonça"      · "" · "Ativo"
    [ref_26] "Amanda Manoel"        · "" · "Ativo"
    [ref_29] "Ana Kécia Gomes"      · "" · "Ativo"
    [ref_32] "Bruno Morais da Costa"· "" · "Ativo"
    [ref_35] "Cadu"                 · "" · "Ativo"
    [ref_48] "Caio Martinelli"      · "" · "Ativo"
    [ref_51] "Fernanda Rochetti"    · "" · "Ativo"
    [ref_54] "Gabriel Kyomen"       · "" · "Ativo"
    [ref_57] "Guilherme Donizetti G2"·"" · "Ativo"
    [ref_60] "Heloisa de Brito"     · "" · "Inativo"
    [ref_63] "Hugo Santos"          · "" · "Inativo"
    [ref_66] "Isis Giacomele"       · "" · "Ativo"
    [ref_69] "Karine Marques Campelo"·""· "Ativo"
    [ref_72] "Laura Cobo"           · "" · "Ativo"
    [ref_75] "Nicole Ruivo"         · "" · "Ativo"
    [ref_78] "Nicole Ruivo G2-2"    · "" · "Ativo"
    [ref_81] "Renan"                · "" · "Ativo"
    [ref_84] "Victor Bernardo"      · "" · "Ativo"
    [ref_87] "vinicius"             · "" · "Ativo"  ← * bug de dados: nome em minúsculas
    [ref_90] "Vinícius Basílio"     · "" · "Ativo"
    [ref_93] "Vinícius Basílio"     · "" · "Ativo"  ← * duplicata de nome — sanear ou preservar?
    [ref_96] "Vinicius Bianco"      · "" · "Ativo"
    [ref_99] "Walquiria Santiago"   · "" · "Ativo"

  * coluna PERFIL: todas as células vazias — bug de API, sanear (não remover a coluna)
  * "vinicius" com inicial minúscula — bug de dados, sanear (capitalizar no display)

- generic "Itens por página: [combobox]  1 - 1" [ref_38]
  combobox [ref_39] — opções: 5 (selected) · 10 · 25
  button anterior [ref_40]
  button próximo  [ref_41]

---

## ..dom.txt
Capturado via read_page em /usuarios
Estado: Filtros abertos (painel de filtros expandido)

- button [ref_14] — ícone funil (ativo/destacado)
- textbox "Pesquise" [ref_16] type="text"
- button "Adicionar Usuário" [ref_18]
- label "Status" [ref_15b]
- combobox "Status" [ref_63] type="text" — opções: Todos (selected) · Ativo · Inativo
- button "Open" [ref_64] type="button" — abre o dropdown
- button "Filtrar" [ref_65] type="button" — aplica o filtro (não é live)
- table [ref_19] — (mesma estrutura da listagem)

---

## ..dom.txt
Capturado via read_page em /usuarios
Estado: Busca com resultado vazio

- textbox "Pesquise" [ref_16] — value: "xyzabc123naoexiste"
- table [ref_19]
  row: "Nenhum resultado encontrado" (colspan implícito)
- generic "Itens por página: [combobox]  1 - 0"

---

## ..dom.txt
Capturado via read_page em /usuarios/detalhes/83
Estado: Detalhe — usuário ATIVO (Amanda Manoel)

- button [ref_79] — ← voltar para listagem
- generic "Usuários > Detalhes" [ref_80]
- form [ref_81]
  - label "Nome"         [ref_82] / textbox "Nome"         [ref_83] disabled — value: "Amanda Manoel"
  - label "CPF"          [ref_85] / textbox "CPF"          [ref_86] disabled — value: "797.795.460-57"
  - label "Email"        [ref_88] / textbox "Email"        [ref_89] disabled — value: "amanda-manoel@tuamaeaquelaursa.com"
  - label "Telefone"     [ref_91] / textbox "Telefone"     [ref_92] disabled — value: "(15)99713-3502"
  - label "Foto de Perfil" [ref_94] / textbox "Foto de Perfil" [ref_95] disabled — value: "" (vazio para este usuário)
  - button [ref_97] — upload icon (disabled em detalhe)
    - button type="file" [ref_98]
  - label [ref_99]
    - checkbox "false" [ref_101] type="checkbox" disabled — "Aprovador em Massa" (desmarcado)
  - button "Voltar" [ref_103] type="button"
  - button "Editar" [ref_104] type="button" — navega para /usuarios/editar/83

---

## ..dom.txt
Capturado via read_page em /usuarios/detalhes/6
Estado: Detalhe — usuário INATIVO (Hugo Santos)

- form [ref_81]
  - textbox "Nome"        disabled — value: "Hugo Santos"
  - textbox "CPF"         disabled — value: "430.348.548-97"
  - textbox "Email"       disabled — value: "hugo.santos@going2.com.br" (truncado visualmente)
  - textbox "Telefone"    disabled — value: "(12)98254-4147"
  - textbox "Foto de Perfil" disabled — value: "1697575671678-Foto pe" (truncado — nome de arquivo)
  - checkbox "Aprovador em Massa" disabled — false
  - button "Voltar"
  - button "Editar" → /usuarios/editar/6

---

## ..dom.txt
Capturado via read_page em /usuarios/editar/83
Estado: Editar — usuário ATIVO (Amanda Manoel)

- button [ref_105] — ← voltar
- generic "Usuários > Editar Usuário" [ref_106]
- form [ref_107]
  - label "Nome"     / textbox "Nome"     [ref_109] enabled — value: "Amanda Manoel"
  - label "CPF"      / textbox "CPF"      [ref_112] enabled — value: "797.795.460-57"
  - label "Email"    / textbox "Email"    [ref_115] enabled — value: "amanda-manoel@tuamaeaquelaursa.com"
  - label "Telefone" / textbox "Telefone" [ref_118] enabled — value: "(15)99713-3502"
  - label "Foto de Perfil" / textbox [ref_121] disabled — value: ""  (display do nome do arquivo)
  - button [ref_123] — wrapper do upload
    - button type="file" [ref_124] enabled
  - checkbox "Aprovador em Massa" [ref_126] enabled — value: false
  - button "Desativar" [ref_128] type="button" — vermelho/coral (usuário ATIVO)
  - button "Cancelar"  [ref_129] type="button"
  - button "Salvar"    [ref_130] type="submit"

---

## ..dom.txt
Capturado via read_page em /usuarios/editar/6
Estado: Editar — usuário INATIVO (Hugo Santos)

- form
  - textbox "Nome"     enabled — value: "Hugo Santos"
  - textbox "CPF"      enabled — value: "430.348.548-97"
  - textbox "Email"    enabled — value: "hugo.santos@going2.com.br"
  - textbox "Telefone" enabled — value: "(12)98254-4147"
  - textbox "Foto de Perfil" disabled — value: "1697575671678-Foto pe"
  - checkbox "Aprovador em Massa" enabled — false
  - button "Ativar"    type="button" — azul (usuário INATIVO)
  - button "Cancelar"  type="button"
  - button "Salvar"    type="submit"

---

## ..dom.txt
Capturado via read_page em /usuarios/adicionar
Estado: Adicionar — formulário vazio

- button [ref_13] — ← voltar
- generic "Novo Usuário" [ref_14]
- form [ref_15]
  - label "Nome"     [ref_16] / textbox "Nome"     [ref_17] type="text" — value: ""
  - label "CPF"      [ref_19] / textbox "CPF"      [ref_20] type="text" — value: ""
  - label "Email"    [ref_22] / textbox "Email"    [ref_23] type="text" — value: ""
  - label "Telefone" [ref_25] / textbox "Telefone" [ref_26] type="text" — value: ""
  - label "Foto de Perfil" [ref_28] / textbox [ref_29] disabled — value: ""
  - button [ref_31] — wrapper upload / button type="file" [ref_32]
  - label [ref_33]
    - checkbox [ref_34] type="checkbox" — "Aprovador em Massa" false
  - button "Cancelar" [ref_36] type="button"
  - button "Adicionar" [ref_37] type="submit"

---

## ..dom.txt
Estado: Adicionar — validação (formulário submetido vazio)

- textbox "Nome"     — borda vermelha; helper: "Campo Obrigatório"
- textbox "CPF"      — borda vermelha; helper: "CPF com formato inválido"
- textbox "Email"    — borda vermelha; helper: "Campo Obrigatório"
- textbox "Telefone" — borda vermelha; helper: "Telefone com formato inválido"

---

## ..dom.txt
Estado: Modal — Confirmação de Desativar (sobre /usuarios/editar/83)

- generic [ref_131] — dialog/modal com borda vermelha
  - ícone info (laranja/vermelho)
  - text: "Você está desativando este usuário. Tem certeza que deseja continuar?"
  - button "Não desativar"    [ref_132] — azul (ação primária = cancelar)
  - button "Sim, tenho certeza" [ref_133] — branco/outline (ação destrutiva = confirmar)

---

## ..dom.txt
Estado: Modal — Confirmação de Ativar (sobre /usuarios/editar/6)

- dialog
  - ícone info (laranja/vermelho)
  - text: "Você está ativando este usuário. Tem certeza que deseja continuar?"
  - button "Não ativar"       — azul (ação primária = cancelar)
  - button "Sim, tenho certeza" — branco/outline (confirmar)

---

## ..dom.txt
Estado: Loading (transição entre páginas de paginação)

- tabela não visível; spinner centralizado na área do card
- paginação permanece visível: "Itens por página: [combobox]  2 -"
````

---

## `gestao-de-usuarios/usuarios/screenshots.md`

```markdown
# screenshots.md — Usuários

Arquivo                              | ID da captura    | Descrição do estado
-------------------------------------|------------------|-------------------------------------------------------------------
01-listagem-preenchida-5pag.png      | ss_4069v9rcw     | Listagem p.1 com 5 registros, filtros fechados, 5 itens/pág
02-listagem-p2.png                   | ss_61810u2jr     | Listagem p.2 — inclui "Heloisa de Brito / Inativo"
03-listagem-25pag.png                | ss_8817nx57l     | Listagem com 25 itens/pág — rolagem superior (primeiros registros)
04-listagem-25pag-bottom.png         | ss_4473cyiqd     | Listagem com 25 itens/pág — rolagem inferior (últimos registros + paginação "1-1")
05-filtros-abertos.png               | ss_1789kyusm     | Painel de filtros expandido (Status = Todos)
06-filtros-dropdown-aberto.png       | ss_04816rjfl     | Dropdown de Status aberto — opções: Ativo · Inativo
07-filtros-ativo-aplicado.png        | ss_1105hie9e     | Status = "Ativo" aplicado — inativos removidos da lista
08-busca-amanda.png                  | ss_2924qjddn     | Busca "Amanda" — 1 resultado (Amanda Manoel, Ativo)
09-busca-sem-resultado.png           | ss_3197wi4fm     | Busca "xyzabc123naoexiste" — "Nenhum resultado encontrado"
10-loading.png                       | ss_9998qcfg6     | Estado de loading (spinner) durante mudança de página
11-detalhe-ativo.png                 | ss_8091yi9jw     | Detalhe usuário ativo (Amanda Manoel) — todos os campos disabled
12-editar-ativo.png                  | ss_555339wv6     | Editar usuário ativo — campos enabled, botão "Desativar" (vermelho)
13-modal-desativar.png               | ss_26654ojej     | Modal confirmação desativação
14-detalhe-inativo.png               | ss_5637sjwxw     | Detalhe usuário inativo (Hugo Santos) — campo Foto preenchido
15-editar-inativo.png                | ss_3368uoxvj     | Editar usuário inativo — botão "Ativar" (azul)
16-modal-ativar.png                  | ss_9111so2dg     | Modal confirmação ativação
17-adicionar-vazio.png               | ss_5320uhz6c     | Formulário "Novo Usuário" vazio
18-adicionar-validacao.png           | ss_2886xs07o     | Validação do formulário (4 campos com erro)
```

---

## `gestao-de-usuarios/minha-conta/context.md`

```markdown
# CONTEXT.md — Minha Conta

## O que é esta tela

Tela de perfil pessoal do usuário logado. Exibe e permite editar os próprios dados cadastrais
e redefinir a senha.

## O que ela faz

- Exibir card com dados do usuário logado: avatar (iniciais), nome, CPF, e-mail, telefone
- Editar perfil via modal inline (sem navegação para outra rota)
- Redefinir senha via modal separado (campos: Senha Atual, Nova Senha, Confirmar Nova Senha)
- Upload de foto de perfil (modal de edição tem botão "Alterar Imagem")

## O que importa manter (não mudar ao reconstruir)

- O card exibe ícones coloridos à esquerda de cada dado (ícone pessoa = CPF/azul,
  ícone envelope = e-mail/azul, ícone celular = azul).
- O avatar é gerado com as iniciais do nome (ex.: "Alessandra Castro" → "AC") sobre fundo
  cinza claro — padrão quando não há foto.
- Editar e Redefinir Senha são **modais** (não rotas), diferente da gestão de usuários que usa
  rotas para editar.
- O modal "Redefinir Senha" mostra inline os requisitos de senha com indicadores visuais
  (ícone X vermelho enquanto não atendidos):
    - No mínimo 8 e no máximo 15 caracteres
    - Uma letra maiúscula
    - Uma letra minúscula
    - Um número
    - Um símbolo especial como @ ^ ~ #
- Os campos de senha têm toggle de visibilidade (ícone olho).
- Botão "Salvar" do modal Redefinir Senha é azul e fica na posição superior dos botões;
  "Cancelar" fica abaixo (empilhados verticalmente — diferente do modal de editar perfil
  que usa layout horizontal Cancelar | Salvar).

## Fluxos especiais

- Tela única sem sub-rotas: tudo acontece via modais sobre `/minha-conta`.

## Rotas

- `/minha-conta` — tela principal (única rota; edição e redefinição via modais)
```

---

## `gestao-de-usuarios/minha-conta/dom.md`

````markdown
# dom.md — Minha Conta

---

## ..dom.txt
Capturado via read_page em /minha-conta
Estado: Tela principal (card exibindo dados)

- generic "Minha Conta" [ref_13] — título da página
- generic [card]
  - generic [avatar] — "AC" (iniciais) sobre fundo cinza claro
  - generic "Alessandra Castro - Teste" [ref_14]
  - generic "532.132.300-30" [ref_15]   ← CPF (com ícone pessoa azul)
  - generic "alessandracastro922@gmail.com" [ref_16] ← (com ícone envelope)
  - generic "(15)99713-3502" [ref_17]   ← Telefone (com ícone celular)
  - button "Redefinir Senha" [ref_18] type="button" — outline/bordado
  - button "Editar"          [ref_19] type="button" — azul (primário)

---

## ..dom.txt
Estado: Modal — Editar Perfil (aberto sobre /minha-conta)

- presentation [ref_22]
  - generic "Editar Perfil" [ref_25]
  - button [ref_26] — X fechar modal
  - form [ref_27]
    - button type="file" [ref_28] — input de upload oculto
    - button "Alterar Imagem" [ref_29] type="button"
    - label "Nome"     [ref_30] / textbox "Nome"     [ref_31] — value: "Alessandra Castro - Teste"
    - label "CPF"      [ref_33] / textbox "CPF"      [ref_34] — value: "532.132.300-30"
    - label "Email"    [ref_36] / textbox "Email"    [ref_37] — value: "alessandracastro922@gmail.com"
    - label "Telefone" [ref_39] / textbox "Telefone" [ref_40] — value: "(15)99713-3502"
    - button "Cancelar" [ref_42] type="button"
    - button "Salvar"   [ref_43] type="submit"

---

## ..dom.txt
Estado: Modal — Redefinir Senha (aberto sobre /minha-conta)

- presentation [ref_45]
  - generic "Redefinir Senha" [ref_48]
  - button [ref_49] — X fechar modal
  - form [ref_50]
    - label "Senha Atual"          [ref_51] / textbox "Senha Atual"          [ref_52] type="password"
      - button "toggle password visibility" [ref_53]
    - label "Nova Senha"           [ref_55] / textbox "Nova Senha"           [ref_56] type="password"
      - button "toggle password visibility" [ref_57]
    - label "Confirmar Nova Senha" [ref_59] / textbox "Confirmar Nova Senha" [ref_60] type="password"
      - button "toggle password visibility" [ref_61]
    - generic "Sua senha precisa de:" [ref_63]
      - "No mínimo 8 e no máximo 15 caracteres" [ref_64] — indicador: X vermelho
      - "Uma letra maiúscula"                   [ref_65] — indicador: X vermelho
      - "Uma letra minúscula"                   [ref_66] — indicador: X vermelho
      - "Um número"                             [ref_67] — indicador: X vermelho
      - "Um símbolo especial como @ ^ ~ #"      [ref_68] — indicador: X vermelho
    - button "Salvar"   [ref_69] type="submit" — azul (posição superior)
    - button "Cancelar" [ref_70] type="button" — branco/outline (posição inferior)
````

---

## `gestao-de-usuarios/minha-conta/screenshots.md`

```markdown
# screenshots.md — Minha Conta

Arquivo                          | ID da captura    | Descrição do estado
---------------------------------|------------------|---------------------------------------------
01-card-principal.png            | ss_4242l7hkl     | Card com dados do usuário logado
02-modal-editar-perfil.png       | ss_1831ope8r     | Modal "Editar Perfil" aberto, campos preenchidos
03-modal-redefinir-senha.png     | ss_88609f7y8     | Modal "Redefinir Senha" aberto, requisitos com X vermelho
```

---

## `gestao-de-usuarios/README.md`

```markdown
# README — Gestão de Usuários (Engenharia Reversa)

## O que é este material

Evidência bruta de engenharia reversa coletada diretamente no app legado ERP Financeiro
(https://erp-financeiro-frontend-558775345474.us-central1.run.app). É **insumo** para os specs
de design-system da reconstrução em TanStack Start + React 19 — não é spec final.

## Sub-telas cobertas

| Sub-tela      | Screenshots | DOM estados capturados |
|---------------|-------------|------------------------|
| Usuários      | 18          | 9 estados              |
| Minha Conta   | 3           | 3 estados              |

## Como foi coletado

Navegação manual via browser + read_page (accessibility tree) + javascript_tool para valores reais
dos inputs. Todos os campos foram inspecionados com seus valores reais de produção/teste.

## Política de fidelidade

Objetivo: clonar fielmente — o usuário não pode perceber a troca de tecnologia. Replicar o
comportamento visível; NÃO replicar bugs de API/encoding/dados.

### Decisões bug a bug

| Bug / Observação                                        | Origem         | Decisão              |
|---------------------------------------------------------|----------------|----------------------|
| Coluna PERFIL sempre vazia na tabela                    | Bug de API/dados| Sanear: renderizar o valor quando a API retornar; manter a coluna |
| Nome "vinicius" com inicial minúscula                   | Bug de dados   | Sanear: capitalizar no display (text-transform ou normalização) |
| Dois usuários com nome "Vinícius Basílio"               | Dados de teste | Manter: dados reais; não é bug de UI |
| Breadcrumb "Usuários > Detalhes" não é link clicável    | Bug de UI      | Avaliar: padronizar com design system (tornar link); comportamento de navegação pelo botão ← deve ser mantido |
| Campo "Foto de Perfil" exibe nome de arquivo truncado   | Bug de UI/UX   | Sanear: exibir nome de arquivo de forma legível ou preview da imagem |
| Paginação não exibe total real ("1 - 5" sem total absoluto) | Comportamento de UI | Replicar: é o comportamento atual; melhorar apenas se o design system padronizar diferente |
| Botões de confirmação do modal empilhados verticalmente em "Redefinir Senha" vs. horizontais no restante | Inconsistência de UI | Sanear: padronizar layout horizontal Cancelar \| Confirmar em todos os modais |

## Como usar

1. `usuarios/context.md` → entender capacidades, comportamentos obrigatórios e rotas.
2. `usuarios/dom.md` → fidelidade de campos, tipos, labels, valores reais e validações.
3. `usuarios/screenshots.md` → referência visual por ID de captura.
4. `minha-conta/` → mesma estrutura para a sub-tela de perfil do usuário logado.
5. `evidencias_soltas/reconstructed-spec.md` → spec aprofundado da tela principal (Usuários).
```

---

## `gestao-de-usuarios/evidencias_soltas/reconstructed-spec.md`

````markdown
# Reconstructed Spec — Usuários (tela-âncora)

## Contexto

Tela principal do módulo Gestão de Usuários. Ponto de entrada para todas as operações sobre
contas de usuário do ERP. Acessível via sidebar (item "Gestão de Usuários" > sub-item "Usuários").

---

## Layout geral (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Logo] [Sidebar collapsed icons]    Olá, Alessandra Castro – Teste [AC▾]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Usuários                                                               │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [⚗] [🔍 Pesquise________________________]  [Adicionar Usuário]  │   │
│  │ ← painel de filtros (oculto por padrão)                         │   │
│  │  Status [Todos ▾]  [Filtrar]                                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ NOME                    PERFIL          STATUS                  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Agatha Mendonça                         Ativo                   │   │
│  │ Amanda Manoel                           Ativo                   │   │
│  │ ...                                                             │   │
│  │ Heloisa de Brito                        Inativo                 │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                    Itens por página: [5▾]  1 – 5  [←] [→]     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Conteúdo da tela

**Cabeçalho de página**: `<h1>` "Usuários"

**Barra de ferramentas** (dentro do card):
- Botão funil (ícone) — toggle do painel de filtros
- Input "Pesquise" (live search)
- Botão "Adicionar Usuário" (primário/azul, alinhado à direita)

**Painel de filtros** (expansível, oculto por padrão):
- Dropdown "Status" (opções: Todos · Ativo · Inativo)
- Botão "Filtrar" (outline/bordado)

**Tabela**:
- 3 colunas: NOME · PERFIL · STATUS
- Linhas clicáveis → detalhe
- Estado vazio: texto "Nenhum resultado encontrado" na primeira célula
- Estado loading: spinner centralizado

**Paginação** (rodapé do card):
- Dropdown de itens por página: 5 · 10 · 25
- Indicador de página: "X – Y" (página atual – total páginas)
- Botões ← e → para navegar

---

## Estados

| Estado                        | Gatilho                              | Comportamento visual                         |
|-------------------------------|--------------------------------------|----------------------------------------------|
| Listagem preenchida           | Carga inicial                        | Tabela com linhas, paginação visível          |
| Loading                       | Mudança de página / busca em curso   | Spinner no lugar da tabela                   |
| Busca com resultado           | Digitar no campo Pesquise (>debounce)| Filtra linhas em tempo real                  |
| Busca vazia                   | Digitar string sem correspondência   | "Nenhum resultado encontrado", paginação "1-0" |
| Filtros abertos               | Clicar ícone funil                   | Linha extra com Status e Filtrar              |
| Filtro Status aplicado        | Clicar "Filtrar"                     | Recarrega tabela filtrada                     |

---

## Modelo de dados implícito (interfaces TypeScript inferidas)

```typescript
interface Usuario {
  id: number;                     // ex.: 83, 6
  name: string;                   // "Amanda Manoel"
  cpf: string;                    // "797.795.460-57" (formatado)
  email: string;                  // "amanda-manoel@tuamaeaquelaursa.com"
  telephone: string;              // "(15)99713-3502"
  profilePhoto?: string;          // nome de arquivo ou URL; opcional
  massApprovalPermission: boolean;// "Aprovador em Massa"
  status: 'Ativo' | 'Inativo';
  perfil?: string;                // (inferido) campo retornado pela API, vazio no ambiente de teste
}

interface UsuariosListResponse {
  data: Usuario[];
  page: number;
  totalPages: number;
  pageSize: number; // 5 | 10 | 25
}

interface UsuariosFilterParams {
  search?: string;   // live — debounced
  status?: 'Ativo' | 'Inativo' | 'Todos';
  page: number;
  pageSize: number;
}
```

---

## Comportamentos e interações

| Ação do usuário                    | Resposta do sistema                                         |
|------------------------------------|-------------------------------------------------------------|
| Digitar no campo Pesquise          | Live search com debounce — recarrega tabela sem botão       |
| Clicar ícone funil                 | Expande/colapsa painel de filtros                           |
| Selecionar Status no dropdown      | Não aplica ainda — aguarda clique em "Filtrar"              |
| Clicar "Filtrar"                   | Aplica filtro de status, recarrega tabela                   |
| Clicar linha da tabela             | Navega para /usuarios/detalhes/:id                          |
| Clicar "Adicionar Usuário"         | Navega para /usuarios/adicionar                             |
| Alterar itens por página           | Recarrega tabela com novo pageSize                          |
| Clicar ← / →                       | Navega entre páginas                                        |
| Clicar "Editar" no detalhe         | Navega para /usuarios/editar/:id                            |
| Clicar "Desativar" / "Ativar"      | Abre modal de confirmação                                   |
| Confirmar desativação/ativação     | Atualiza status, retorna para listagem                      |
| Cancelar no modal                  | Fecha modal, permanece na tela de edição                    |
| Clicar "Voltar" no detalhe/edição  | Retorna para /usuarios                                      |

---

## Design tokens observados

| Token                    | Valor aproximado          | Uso                                          |
|--------------------------|---------------------------|----------------------------------------------|
| Color primary            | `#29ABE2` (azul cyan)     | Botões primários, headers de coluna, ícones  |
| Color danger             | `#E05C5C` (coral/vermelho)| Botão "Desativar", borda de modal de confirm |
| Color success            | (mesmo primary)           | Botão "Ativar" usa azul também               |
| Color text               | `#1A2B4A` (azul escuro)
