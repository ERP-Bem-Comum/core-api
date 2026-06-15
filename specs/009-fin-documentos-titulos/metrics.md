# Métricas & NFRs: Financeiro — Fatia 1: Gestão de Documentos + Geração de Títulos

**Feature**: `specs/009-fin-documentos-titulos/` · **Consultores**: `/acdg-skills:software-architect` + `/acdg-skills:requirements-engineer`

> Fase 4 da pipeline `core-api-sdd`. NFRs ancorados em citação canônica via **fallback local**
> `acdg/skills_base/shared-references/` (MCP `acdg-skills` off — ver memória `acdg-skills-base-fallback`).
> Roteamento: skill `requirements-engineer`. Toda métrica é **mensurável**.

## Métricas funcionais

> "O sistema faz a coisa certa" — verificáveis por teste/BDD (Fases 6–7).

| ID     | Métrica                                                                                  | Alvo                                              | Como medir                |
| ------ | --------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------- |
| MF-001 | Cálculo do líquido (`Bruto − DescFonte − Retenções − Descontos + Multa + Juros`)         | 100% correto; rejeita líquido não-positivo        | teste de domínio          |
| MF-002 | Geração de filhos por tipo (NFS-e/RPA = N retenções; demais = 0)                          | 100% conforme tabela de origem                     | teste de domínio          |
| MF-003 | Impostos registrados (ICMS/IPI/PIS/COFINS/CBS/IBS) não entram no líquido                  | 0 impacto no cálculo                               | teste de domínio          |
| MF-004 | Herança de aprovação (aprovar Pai → Filhos `Aprovado`)                                    | 100% dos filhos aprovados junto                    | teste de domínio          |
| MF-005 | Imutabilidade pós-aprovação (só `description`/`dueDate`)                                  | 0% alterações de campo vital aceitas               | teste de domínio          |
| MF-006 | Máquina de estados — transições inválidas rejeitadas                                      | 100% rejeitadas com erro tipado                    | teste de domínio          |
| MF-007 | Cancelamento só em `Open` → hard delete (pai+filhos)                                      | 100%; bloqueado em outros estados                  | teste de domínio          |
| MF-008 | Desfazer aprovação com mudança de valores → hard delete + recriação de filhos            | 100% conforme R8.1                                 | teste de domínio          |
| MF-009 | Separação de funções (Operador não aprova)                                               | 100% negado sem `payable:approve`                  | teste de borda (autorização) |
| MF-010 | Trilha por-campo (autor, instante, antes→novo) por alteração/transição                   | 100% reconstituível                                | teste de integração       |

## Métricas não-funcionais (NFRs)

| ID      | Categoria      | Alvo mensurável                                                                  | Como medir                                |
| ------- | -------------- | ------------------------------------------------------------------------------- | ----------------------------------------- |
| NFR-001 | Integridade    | Zero divergência aritmética líquido/soma das obrigações                          | property-based test + teste de domínio    |
| NFR-002 | Auditoria      | 100% das mudanças de estado/campo na timeline; 100% emitem evento ao outbox      | teste de integração (timeline + outbox)   |
| NFR-003 | Isolamento     | 0 import cross-módulo de `domain/`/`application/`; `fin_*` não compartilha tabela | ESLint boundaries + review + EXPLAIN schema |
| NFR-004 | Segurança      | Toda rota exige permissão (`fiscal-document:*`/`payable:*`); input validado na borda | review `web-security-backend` + teste de borda |
| NFR-005 | Concorrência   | Edição/aprovação concorrente do mesmo documento não corrompe (versionamento)     | teste de integração                       |

**Citação que sustenta os NFRs (isolamento — NFR-003):**

> "Microservices embrace the concept of information hiding. Information hiding means hiding as much information as
> possible inside a component and exposing as little as possible via external interfaces. This allows for clear
> separation between what can change easily and what is more difficult to change. Implementation that is hidden from
> external parties can be changed freely..."
> — _(building-microservices--sam-newman.md:266; Sam Newman, *Building Microservices*, 2ª ed.)_

> Aplicação ao core-api: o módulo `fin_*` expõe apenas `public-api` (ADR-0006) e não compartilha tabelas (ADR-0014) —
> o equivalente intra-monólito de _information hiding_ + _loosely coupled_ (Newman:296: "the sharing of databases... is
> especially problematic").

## Métricas de performance

> A UX primária é HTTP (ADR-0037) — mede-se na **borda `/api/v1`** (não há CLI). Baseline N/A (feature nova).

| ID     | Indicador                                            | Baseline | Alvo (p95) | Orçamento (p99) |
| ------ | --------------------------------------------------- | -------- | ---------- | --------------- |
| MP-001 | `POST /documents` (salva + gera pai+filhos, N≤5)     | N/A      | < 300 ms   | < 600 ms        |
| MP-002 | `POST /documents/:id/approve` (herança aos filhos)   | N/A      | < 200 ms   | < 400 ms        |
| MP-003 | `GET /documents` (lista paginada, 20/página)         | N/A      | < 400 ms   | < 800 ms        |
| MP-004 | `GET /documents/:id/timeline` (trilha por-campo)     | N/A      | < 400 ms   | < 800 ms        |

## Critérios de sucesso (mensuráveis, tech-agnostic)

- **SC-001**: 100% dos documentos salvos geram ≥1 título pai cujo valor é exatamente o líquido (zero divergência).
- **SC-002**: nº de filhos = nº de retenções para NFS-e/RPA; zero para os demais tipos — em 100% dos casos.
- **SC-003**: 0% das tentativas de alterar campo vital após aprovação são bem-sucedidas.
- **SC-004**: 100% das operações fora da máquina de estados são rejeitadas com erro explícito.
- **SC-005**: o Operador conclui o lançamento de um documento fiscal com retenções (preencher → salvar → ver títulos) em < 3 min.
- **SC-006**: 100% das alterações de campo/transições são reconstituíveis pela trilha por-campo (quem/quando/antes→novo).

## Observabilidade

- **Correlação**: todo request carrega correlation id via `AsyncLocalStorage` (`src/shared/observability/correlation.ts`),
  propagado a logs e à outbox.
- **Logs estruturados** por caso de uso (documento salvo, título aprovado, aprovação desfeita, cancelamento) com `documentId`/`payableId`.
- **Contadores**: documentos salvos, títulos gerados (pai/filho), aprovações, desfazimentos, cancelamentos; sinalizações de
  divergência de alíquota.
- **Outbox lag**: nº de eventos pendentes e idade do mais antigo (saúde da entrega — ADR-0015).
- **OpenTelemetry** (evolução): instrumentar a borda e o worker de outbox conforme `handbook/.../opentelemetry-handbook` quando a
  observabilidade distribuída entrar.
