# REPORTS-TEAM-DEMOGRAPHIC-COLUMNS — escopo (as 3 colunas demográficas da tabela Equipe ABC)

> Size **M**. A tabela do relatório "Equipe ABC" exibe **Idade**, **Identidade de gênero** e
> **Raça/cor**, mas essas 3 colunas mostram `—` em todas as linhas: o contrato do
> `GET /api/v2/reports/team` não manda os campos. Este ticket os manda — **paridade com o legado**.
>
> ⚠️ **Reverte parcialmente uma decisão do `REPORTS-TEAM-ABC` (#238).** Ver §Conflito.

## Problema

O front replicou a tabela do legado com 8 colunas de exibição:

```
Nome · Idade · Área de atuação · Função · Vínculo · Identidade de gênero · Raça/cor · Escolaridade
```

O contrato atual (`teamMemberSchema`, `reports/adapters/http/schemas.ts:8`) manda **10 campos**, e
**nenhum** deles é idade, gênero ou raça:

```
id · name · program · role · employmentRelationship · startOfContract ·
registrationStatus · active · education · experienceInPublicSector
```

Resultado: 3 das 8 colunas da tela estão **permanentemente vazias**. Não é bug de front — é lacuna de
contrato.

## Conflito com o #238 — e por que a decisão mudou

O `REPORTS-TEAM-ABC` (#238) definiu a projeção como "9 colunas LGPD-safe" e cravou:

> "Dado sensível (CPF/RG/salário/raça/gênero/saúde/endereço/contato) **NUNCA** cruza a public-api."

**A P.O. decidiu (2026-07-20) que a régua é replicar o legado**, e os fatos levantados sustentam a
mudança:

1. **O legado exibia raça e gênero por pessoa** nesta mesma tela — o front só replicou.
2. **O CSV do legado** (verificado: 26 colunas, 110 linhas) trazia `raca_cor`, `identidade_de_genero`,
   `cpf`, `rg`, `endereco_completo`, `alergias`, `biografia` **e `remuneracao`**.
3. **O nosso próprio backend já entrega isso por pessoa**: `GET /api/v1/collaborators/export`
   (`partners/adapters/export/collaborator-csv.ts`, 26 colunas) devolve `race`/`genderIdentity`/`cpf`/
   `allergies` sob a permissão genérica `collaborator:read`. A barreira do #238 já está contornada por
   outra porta — e o nosso export é, inclusive, **mais restritivo** que o do legado (não manda salário).
4. **ADR-0053 rejeitado**: durante a aceitação o acesso é liberado a todo autenticado, com o cliente
   ciente. Segregação é assunto do **redesenho do RBAC**, não de recorte de contrato nesta tela.

**Não é "abrir dado sensível novo"** — é fechar a incoerência entre uma tela que promete 3 colunas, um
export que já entrega tudo, e uma projeção que finge proteger.

## Escopo (in)

1. **`partners/public-api/collaborator-projection.ts`** — `CollaboratorTeamProjection` ganha:
   - `genderIdentity: string | null`
   - `race: string | null`
   - **`age: number | null`** (anos completos) — **NÃO** `dateOfBirth`. Ver §Decisão da idade.
2. **`reports/adapters/http/schemas.ts`** — `teamMemberSchema` ganha os 3 campos.
3. Mapper da projeção (`toProjection`) calcula `age` a partir de `date_of_birth` + `Clock`.

## Decisão da idade: manda `age`, não `dateOfBirth`

A tela mostra **idade**, não data de nascimento. Mandar `age: 41` em vez de `dateOfBirth:
'1985-03-12'` entrega exatamente o que a coluna precisa e não expõe a data exata (que identifica mais
e não é exibida em lugar nenhum). É minimização sem perda de função.

Mantém a inversão do FR-012 já adotada no relatório demográfico: **a idade é calculada no servidor**,
via `Clock` injetado (nunca `Date.now()` em função pura).

## Fora de escopo

- **Escopo do export CSV** (26 colunas, incl. CPF/alergias/biografia) — pendente de resposta do
  cliente sobre o uso real. Ver issue **#482** e §Pendente.
- Redesenho do RBAC (ticket próprio, com LGPD + regras do cliente).
- Os 3 gráficos agregados — são o `REPORTS-TEAM-DEMOGRAPHICS`, endpoint separado, já em andamento.

## Critérios de aceite

- **CA1** `GET /api/v2/reports/team` devolve `genderIdentity`, `race` e `age` por colaborador.
- **CA2** `age` é **anos completos** na data de referência (aniversário não feito no ano conta a idade
  menor); `date_of_birth` nulo → `age: null`.
- **CA3** **`dateOfBirth` NÃO aparece no payload** (só `age`).
- **CA4** Nulos preservados: colaborador sem `race`/`gender_identity` → `null` (o front mostra `—`),
  nunca string vazia nem valor inventado.
- **CA5** RBAC inalterado: a rota segue sob `collaborator:read` (mesma permissão de hoje) — este
  ticket **não** cria permissão nova; a segregação vem no redesenho do RBAC.
- **CA6** Regressão zero: os 10 campos atuais seguem idênticos; o `REPORTS-TEAM-DEMOGRAPHICS`
  (agregados) não é afetado.

## Pendente antes do W1 — confirmar com o cliente

A P.O. vai perguntar ao cliente **para que serve o export do relatório Equipe e quais campos o
destinatário exige**. A resposta:

- **Não bloqueia este ticket** (a tela replica o legado de qualquer forma), mas
- **define o escopo do CSV** (#482): se o destinatário é financiador, raça/gênero fazem sentido; CPF,
  alergias e biografia dificilmente.

**Invariante a respeitar:** tabela e CSV andam **juntos**. Tirar de um e deixar no outro parece
proteção e não é.

## Pipeline

| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — CA1..CA6 (projeção + DTO + cálculo da idade) |
| W1 | `ports-and-adapters` (par `zod-expert` no schema) | projeção + mapper + schema |
| W2 | `code-reviewer` | audit read-only |
| W3 | `ts-quality-checker` | gate + integração MySQL |

## DoD

Gate W3 verde + as 3 colunas com dado real na tela + `dateOfBirth` ausente do payload + os 10 campos
atuais intactos.
