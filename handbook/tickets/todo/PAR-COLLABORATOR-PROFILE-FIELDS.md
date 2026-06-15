# PAR-COLLABORATOR-PROFILE-FIELDS — Campos novos do cadastro de Colaborador (perfil/saúde/familiar/contratual)

**Status**: todo (aguardando backend)
**Origem**: roteiro do **cliente** para o form de **Novo Colaborador** (pré-cadastro + cadastro completo, "2ª etapa") — web-app v2.
**Relacionado**: `PAR-FINANCIER-COLLAB-BANK` (banco), `PAR-COLLABORATOR-TERRITORY` (UF/município). Este ticket cobre os campos de **perfil pessoal, informações familiares, saúde/acessibilidade e contratuais**.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (o conteúdo abaixo reflete a visão do front em 2026-06-09/14).
>
> - **Já implementado:** nada dos campos novos. Busca global no módulo partners por `sex`, `maritalStatus`, `hasChildren`, `childrenCount`, `childrenAges`, `isPwd`, `pwdDescription`, `isOnLeave`, `leaveDuration`, `leaveRenewable`, `leaveRenewalDuration`, `publicSectorExperienceDuration` retorna **zero** ocorrências. O conjunto de campos pessoais hoje é fechado em `src/modules/partners/domain/collaborator/types.ts:25-40` (`PersonalFields`), persistido em `src/modules/partners/adapters/persistence/schemas/mysql.ts:160-174`, aceito em `src/modules/partners/adapters/http/schemas.ts:180-195` (`completeRegistrationBodySchema`) e devolvido em `schemas.ts:105-134` (`collaboratorDetailSchema`) — em nenhum deles há os campos pedidos. Confirma-se também que `genderIdentity` (8 valores) segue como o único campo de gênero (`schemas.ts:35-51`), sem o novo `sex: "F"|"M"`. Único item "front-only" do ticket — Raça/Cor restrita às 5 do IBGE — não exige backend (o enum `RACES` já tem `BRANCO/PRETO/PARDO/AMARELO/INDIGENA`, `schemas.ts:52-57`); o backend permanece inalterado.
> - **Escopo real restante:** TODOS os 12 campos 🔴 da tabela. Adicionar cada um (nullable) em `PersonalFields` (domínio), na tabela `par_collaborators` (+ migration), em `completeRegistrationBodySchema` + `collaboratorDetailSchema` (borda), no `Collaborator.completeRegistration` (merge), no mapper e no `collaborator-dto.ts`; decidir a relação `sex` × `genderIdentity` (manter ou aposentar).
> - **Veredito:** NÃO FEITO
> ---

## Contexto

O cadastro completo do Colaborador hoje tem (GET detalhe / PUT complete): `rg, completeAddress, dateOfBirth, telephone, emergencyContactName, emergencyContactTelephone, genderIdentity, race, allergies, foodCategory, foodCategoryDescription, education, experienceInThePublicSector, biography`. O cliente pediu **reorganização + campos novos**, agrupados em blocos.

> **Legenda:** 🟢 front-only (já dá pra fazer) · 🔴 precisa de campo novo/ajuste no backend.

## Bloco 1 — Dados Pessoais

| Campo | Mudança | Backend? |
|---|---|---|
| **Sexo** (substitui "Identidade de Gênero") | Select/Radio: **Feminino, Masculino** | 🔴 Novo campo `sex: "F" \| "M"` (nullable). `genderIdentity` é enum diferente (8 valores) — não reaproveitar. Decidir se mantém `genderIdentity` ou substitui por `sex`. |
| **Raça/Cor** | Ajustar opções para as **5 do IBGE**: Branca, Preta, Parda, Amarela, Indígena | 🟢 Front (o enum `RACES` já tem `BRANCO/PRETO/PARDO/AMARELO/INDIGENA`; basta o select não oferecer `PREFIRO_NAO_RESPONDER`). Backend não muda. |
| **Estado Civil** | Campo NOVO. Select: Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União Estável | 🔴 Novo enum `maritalStatus: "single"\|"married"\|"divorced"\|"widowed"\|"stable_union"` (nullable). |
| RG, Endereço completo, Data de nascimento, Celular, Escolaridade | **Permanecem iguais** | — |
| **Experiência no setor público** | Tornar CONDICIONAL: se **Sim** → abre "**Por quanto tempo?**" (input texto) | 🔴 `experienceInThePublicSector` já existe (bool); novo `publicSectorExperienceDuration: string` (nullable, só quando Sim). |

## Bloco 2 — Informações Familiares (SEÇÃO NOVA)

| Campo | Tipo | Backend? |
|---|---|---|
| **Possui filhos?** | Radio/Switch (Sim/Não) | 🔴 `hasChildren: boolean` (nullable). |
| **Quantos filhos?** (condicional: se Sim) | Input número | 🔴 `childrenCount: number` (nullable, ≥1 quando `hasChildren`). |
| **Idade dos filhos** (condicional: se Sim) | Input texto livre (ex.: "5 anos, 12 anos") | 🔴 `childrenAges: string` (nullable). *(Decidir: texto livre vs lista estruturada — front sugere texto livre.)* |

## Bloco 3 — Saúde e Acessibilidade

| Campo | Mudança | Backend? |
|---|---|---|
| Alergias / intolerância alimentar | Reaproveitar `allergies` (ajustar label/pergunta) | 🟢 Front (label/i18n). |
| Categoria alimentar + descrição | Reaproveitar `foodCategory` / `foodCategoryDescription` | 🟢 Front (reorganização). |
| **Possui deficiência (PCD)?** | Radio/Switch (Sim/Não) — NOVO | 🔴 `isPwd: boolean` (nullable). |
| **Qual?** (condicional: se PCD = Sim) | Input texto | 🔴 `pwdDescription: string` (nullable). |

## Bloco 4 — Informações Contratuais (SEÇÃO NOVA)

| Campo | Tipo | Backend? |
|---|---|---|
| **Afastado do município atualmente?** | Radio/Switch (Sim/Não) | 🔴 `isOnLeave: boolean` (nullable). |
| **Há quanto tempo está afastado?** (cond.: se Sim) | Input texto | 🔴 `leaveDuration: string` (nullable). |
| **O afastamento pode ser renovado?** (cond.: se Sim) | Radio (Sim/Não) | 🔴 `leaveRenewable: boolean` (nullable). |
| **Por quanto tempo pode ser renovado?** (cond.: se renovável = Sim) | Input texto | 🔴 `leaveRenewalDuration: string` (nullable). |

*(Mini biografia e Contato de emergência permanecem, no fim do formulário.)*

## Pedido ao backend (resumo)

Adicionar ao agregado/rotas de **Collaborator** (POST/PUT complete + GET detalhe), todos **opcionais/nullable** (aditivo, não quebra cadastros existentes):

```jsonc
"sex": "F | M",                       // | null  (decidir relação com genderIdentity)
"maritalStatus": "single|married|divorced|widowed|stable_union", // | null
"hasChildren": true,                  // | null
"childrenCount": 2,                   // | null
"childrenAges": "5 anos, 12 anos",    // | null
"isPwd": false,                       // | null
"pwdDescription": "string",           // | null
"isOnLeave": false,                   // | null
"leaveDuration": "string",            // | null
"leaveRenewable": true,               // | null
"leaveRenewalDuration": "string",     // | null
"publicSectorExperienceDuration": "string" // | null (só quando experienceInThePublicSector = true)
```

## Aceite
- POST/PUT (complete) e GET de Collaborator aceitam/retornam os campos acima.
- Front: habilitar os campos nos blocos, ligar condicionais (já validados em tela com o cliente), mapear em `core-api-collaborators.ts`, schemas de borda (io-schemas + response) e i18n.

## Notas / estado do front
- **Raça (IBGE)** já está aplicado no front sem backend (trim da opção `PREFIRO_NAO_RESPONDER` no select) — ATIVO.
- **Demais campos novos**: renderizados no detalhe do colaborador **VISÍVEIS porém DESABILITADOS ("gated")**, agrupados nos blocos (Dados Pessoais / Informações Familiares / Saúde e Acessibilidade / Informações Contratuais), com aviso "aguardando backend". O front **não envia** esses campos enquanto o backend não suportar (evita 422). A validação interativa com o cliente já foi feita (protótipo); o estado commitado é o gated seguro.
- Ao liberar o backend: habilitar os campos, ligar no controller (estado + buildComplete) e no mapeador `core-api-collaborators.ts`, com as condicionais (filhos / PCD / afastamento / experiência): "campos-filho" só aparecem quando o pai = Sim; ao voltar p/ Não, limpar os filhos.
- **Sexo × Identidade de Gênero**: enquanto não há campo `sex` no backend, o front mantém o valor de `genderIdentity` já gravado (não apaga) e exibe **Sexo** como gated. Ao entregar `sex`, decidir a aposentadoria de `genderIdentity`.
