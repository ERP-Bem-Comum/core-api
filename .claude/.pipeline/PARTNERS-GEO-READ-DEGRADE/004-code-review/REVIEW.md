# W2 — code review (self, read-only) — PARTNERS-GEO-READ-DEGRADE

**Veredito: APPROVED.**

## Escopo revisado
`src/modules/partners/adapters/persistence/repos/geography-read.drizzle.ts` (diff único).

## Achados
- **`err('partner-geography-read-unavailable')` só no `catch`** — prova por grep: 2 ocorrências de
  código (linhas 89, 104), ambas dentro do `catch` da query real. Nenhum caminho de linha inconsistente
  retorna erro. Satisfaz **CA4**.
- **Estado órfão → fallback de sigla** (`name = uf`), nunca omitido — paridade com o legado (**CA1**).
- **Município órfão → omitido** via `null` do mapper unitário + `if (view !== null)` no mapper de lista;
  não há coluna `name` para exibir (**CA2**). Nenhuma linha crua vaza.
- **Mappers puros exportados** (`mapStateRows`/`mapMunicipalityRows`) — testáveis sem banco; o store só os
  chama dentro do `try/catch`. Loops manuais removidos (menos superfície).
- **ADR-0014/0020**: segue só-leitura `par_*`, SELECT, zero escrita, zero throw cruzando a borda.
- **Logs preservados** — órfã sempre logada (`[partners-geography-read:*]`), nada some em silêncio.

Sem Blocker/Major/Minor. 1 round.
