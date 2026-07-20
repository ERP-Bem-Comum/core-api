# W3 — Gate de Qualidade · REPORTS-TEAM-DEMOGRAPHICS

## Gates (local) — verificados pelo orquestrador

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ verde |
| Format | `pnpm run format:check` | ✅ verde |
| Lint | `pnpm run lint` | ✅ verde |
| Test | `pnpm test` | ✅ **4227 pass · 0 fail** · 19 skipped |

Trajetória: W0 4197 pass / 8 fail → W1 4227 pass / 0 fail → W3 estável.

## Integração

Sem suíte de integração nova: o filtro `active` e a agregação acontecem **em memória** (a função pura
recebe todas as linhas), então CA3/CA4/CA5 são verificáveis sem DB — decisão registrada no W0 (nota 4)
e confirmada no W2 (não-bloqueante 2). Se um dia o filtro migrar para SQL (`WHERE active = TRUE`), aí
passa a exigir teste gated `MYSQL_INTEGRATION=1` + registro no runner de CI.

O reader real (`openCollaboratorDemographicsReader`) é exercitado no boot da composição; o caminho
ponta-a-ponta com MySQL roda no CI junto do resto da suíte de integração do `reports`.

## Cobertura que sustenta o merge

- **32 casos** nas 2 suítes do ticket (23 da função pura + 9 da borda), todos verdes.
- **Invariante estrutural:** soma de cada dimensão == `totalActive` **por construção** — `distribute()`
  não tem caminho de descarte (verificado no W2, item 1). Ninguém some do gráfico.
- **CA2 provado na borda:** chaves do body exatamente `['ageRange','gender','race','totalActive']`,
  Zod `.strict()` nos dois níveis, e o corpo cru não casa `\d{4}-\d{2}-\d{2}` (nenhuma data vaza).
- **CA9:** os 2 testes-guarda do `/reports/team` verdes; a projeção das 9 colunas intocada.

## Follow-ups registrados no W2 (não bloqueiam — viram issue)

1. **Segundo pool MySQL do `partners` no boot** (teamReader + demographicsReader). Ambos boot-scoped
   (o incidente RDS 0001 era pool **por requisição**), mas a pegada cresce a cada reader novo. Se
   surgir um terceiro, vale um handle compartilhado.
2. **Filtro `active` em memória** — irrelevante na ordem de grandeza atual; vira SQL se a tabela crescer.
3. **Colisão teórica com o literal `'NA'`** gravado no legado: cairia no bucket de ausência em vez de
   `OUTROS`. Improvável (os literais vêm do formulário) e sem impacto na soma.
4. **Driver `memory` devolve listas vazias**, não o template canônico zerado — boot sem DB.
5. **`OUTRO` (categoria) vs `OUTROS` (balde residual)** lado a lado no gráfico de gênero. Se a P.O.
   achar confuso na tela, o ajuste é de label, não de estrutura.

## Veredito

**GREEN.** Os 3 gráficos demográficos entregues: distribuição real (sem k-anonimato, por decisão da
P.O. — replicar o legado), `INDIGENA` presente, `N/A` distinto de `PREFIRO_NAO_RESPONDER`, nada por
pessoa cruzando a fronteira, e a soma sempre batendo com o total de ativos.
