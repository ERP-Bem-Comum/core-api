# Métricas & NFRs: Financeiro — Fatia 2: Listagem + Trilha por-campo (Time Travel)

**Feature**: `specs/010-fin-listagem-timeline/` · Skill: `requirements-engineer`. Estende `metrics.md` (009) — reusa
MP-003/MP-004 (alvos de lista/timeline já fixados lá). Borda HTTP é a UX (ADR-0037) — latência medida na borda `/api/v2`.

## Métricas funcionais (MF)

| ID     | Métrica                                                                       | Alvo                                             | Como medir                      |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------- |
| MF-001 | Listagem aplica filtros (status, supplierRef, type, dueFrom/dueTo) corretos   | 100% do conjunto esperado (AND dos filtros)      | teste de borda + integração     |
| MF-002 | Paginação correta (recorte + `total` da contagem filtrada)                    | 100%; sem itens repetidos/omitidos entre páginas | teste de integração             |
| MF-003 | Janela de vencimento inclusiva (`dueFrom..dueTo`)                             | 100%; janela invertida → conjunto vazio          | teste de integração             |
| MF-004 | Trilha registra cada alteração de campo (antes→novo) e transição de estado    | 100% reconstituível (quem, quando, valor)        | teste de integração             |
| MF-005 | Trilha gravada na MESMA transação do agregado (sem janela órfã)               | 0 mutações sem entry correspondente              | teste de integração (rollback)  |
| MF-006 | `GET /:id/timeline` ordenada cronologicamente com `changes[]` por marco       | 100% conforme contrato                           | teste de borda                  |
| MF-007 | Optimistic lock: versão stale → `409 document-version-conflict` (sem aplicar) | 100% dos conflitos detectados                    | teste de integração concorrente |
| MF-008 | Autorização de leitura (`fiscal-document:read`) em lista e timeline           | 100% negado sem a permissão (403)                | teste de borda                  |
| MF-009 | Permissões inertes removidas do catálogo (`payable:read`/`undo-approval`)     | 0 permissões declaradas sem rota                 | teste do catálogo RBAC          |

## Métricas não-funcionais (NFRs)

| ID      | Categoria    | Alvo mensurável                                                                           | Como medir                               |
| ------- | ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| NFR-001 | Integridade  | 100% das mutações produzem trilha consistente com o agregado (mesma tx); rollback atômico | teste de integração (commit + rollback)  |
| NFR-002 | Auditoria    | 100% das mudanças de campo/estado reconstituíveis pela trilha (SC-006 da fatia 1)         | teste de integração                      |
| NFR-003 | Isolamento   | Trilha em `fin_*`; diff em tabela filha 1FN (sem JSON — ADR-0020); 0 import cross-módulo  | ESLint boundaries + schema review        |
| NFR-004 | Concorrência | Edição/aprovação concorrente com versão stale rejeitada (409), nunca last-write-wins      | teste de integração concorrente          |
| NFR-005 | Segurança    | Lista/timeline exigem permissão; refs de filtro validadas na borda (UUID) → 400           | review `security-backend-expert` + borda |
| NFR-006 | Overhead     | Escrita do read-model não regride a latência de mutação além do orçamento (MP-005)        | benchmark antes/depois                   |

## Métricas de performance (MP)

| ID     | Indicador                                                   | Baseline (fatia 1)   | Alvo (p95)             | Orçamento (p99) |
| ------ | ----------------------------------------------------------- | -------------------- | ---------------------- | --------------- |
| MP-003 | `GET /documents` (lista paginada, 20/página, carteira ~10³) | stub (N/A)           | < 400 ms               | < 800 ms        |
| MP-004 | `GET /documents/:id/timeline` (trilha por-campo)            | N/A                  | < 400 ms               | < 800 ms        |
| MP-005 | Overhead da trilha numa mutação (`POST`/`PATCH`/`approve`)  | fatia 1 (sem trilha) | +≤ 50 ms (vs baseline) | +≤ 100 ms       |

> **Gatilho da dívida técnica (ADR-0003):** se, sob carga real, MP-003 estourar o p95 (< 400 ms) com o read path no pool
> writer, **acionar a revisão do split reader/writer** (ADR-0026) com o time de back. As métricas MP-003/MP-005 são o
> sinal de decisão — por isso o split foi diferido, não descartado.

## Critérios de sucesso (mensuráveis, tech-agnostic)

- **SC-001..006** da `spec.md` (010): filtros corretos, paginação consistente, trilha 100% reconstituível, nenhuma mutação
  sem trilha, latência interativa, regra de boundary no cancelamento.
- **SC-007** (processo): gate W3 verde (typecheck + format + lint + test) + integração `fin_*` (lista, timeline,
  optimistic lock) verde, sem regressão na suíte global.

## Observabilidade

- Logs estruturados (Pino) por requisição (`requestId`/correlation) nas rotas de lista e timeline; 5xx com code interno só
  no log (não no envelope — padrão `shared/http/reply.ts`, reforçado na W2 da fatia 1).
- Métrica de conflito de versão (contagem de 409 `document-version-conflict`) como sinal de contenção concorrente.
- Latência de lista/timeline (MP-003/004) e overhead de mutação (MP-005) instrumentáveis na borda para alimentar a decisão
  do split reader/writer.
