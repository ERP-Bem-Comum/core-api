# 000 — Request PRG-PROGRAMS-POLISH

> **Polish & Cross-Cutting da Gestão de Programas.** Size: S. Fecha a **Phase 10** do
> `specs/008-gestao-programas/tasks.md` (T058, T060, T061) — os únicos itens planejados
> que restaram após o MVP completo (`PRG-PROGRAMS-MODULE`, closed-green).
>
> **Não há código de produção novo.** A funcionalidade (US1–US6 + logo) já está entregue,
> verde e commitada. Este ticket cobre só E2E HTTP real, validação manual e rastreabilidade.

## Contexto

O módulo `programs` (`src/modules/programs/`) está completo: domínio puro, persistência
Drizzle/MySQL (`prg_*`), 7 use cases, borda HTTP `/api/v1/programs` (7 rotas) e logo storage.
Gate W3 verde (2631 pass · `test:integration:programs` 8 pass). Resta apenas a Phase 10 do
`tasks.md`, cujos itens são de qualidade/documentação e não bloqueiam o MVP.

## Escopo (Phase 10 — itens remanescentes)

| Task | Item | Entregável |
| --- | --- | --- |
| **T058** | Coleção Bruno (ADR-0034) | `<dir de coleções>/programs/` exercitando `/api/v1/programs`: criar → listar → detalhar → editar → desativar → reativar (+ logo). Integração HTTP real, rodável no CI (`bru run --reporter junit`). |
| **T060** | Quickstart manual | Executar `specs/008-gestao-programas/quickstart.md` (curls contra servidor + MySQL real) e registrar a saída observada. |
| **T061** | Rastreabilidade (Princípio IX) | Registrar no ticket as citações das decisões-chave: Evans/Vernon (BC/agregado), Ramakrishnan (identidade/chaves), Beck (TDD). Fonte: `specs/008-gestao-programas/research.md`. |

**Já entregues (não reabrir):** T059 (regressão do catálogo de permissões — feito em `PRG-PROGRAMS-MODULE`) e T062 (gate W3 + fechar pipeline — feito).

## Fora de escopo

- Qualquer mudança em `src/modules/programs/**` (a funcionalidade está fechada). Se a coleção
  Bruno revelar um bug de borda, abrir ticket próprio (`PRG-*`), não emendar aqui.
- **FR-020** (ocultar inativos em fluxos operacionais) — regra dos módulos consumidores.
- **Plano Orçamentário** (`handbook/research/feture_propose/plano_orcamentario/`) — Bounded
  Context novo, spec futura separada.

## Critérios de aceitação

- **CA1 (T058)** Coleção Bruno cobre o ciclo de vida completo via `/api/v1/programs` com auth
  Bearer; asserções de status (201/200/409/422) e de corpo (recurso retornado nas escritas);
  roda verde de ponta a ponta contra o servidor com driver real.
- **CA2 (T060)** `quickstart.md` executado; divergências (se houver) viram correção de doc ou
  ticket de bug — nunca fechado com curl vermelho não-endereçado (regressão zero).
- **CA3 (T061)** Citações das 3 decisões-chave registradas com referência literal a `research.md`.
- **CA4** Gate aplicável verde: a coleção Bruno no CI e, se algum script for tocado,
  `typecheck`/`lint`/`format`/`test` permanecem verdes.

## Pipeline

Size **S**. Waves: W0 (cenários Bruno + asserções como "testes" RED contra servidor não-iniciado
ou rota ausente) → W1 (coleção + execução do quickstart + citações) → W2 (review da coleção/docs)
→ W3 (gate: `bru run` verde + suíte intacta). Roteamento: `bruno-api-client-expert` para a
coleção `.bru`.
