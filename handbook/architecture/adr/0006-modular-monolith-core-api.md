[← Voltar para ADRs](./README.md)

# ADR-0006: Modular Monolith para o `core-api` (Granularidade de Serviço)

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Arquiteto técnico (decisão tomada após análise convergente entre revisão própria do handbook e validação cruzada com fonte externa de literatura arquitetural)

---

## Contexto

[ADR-0001](./0001-strangler-fig-over-rewrite.md) estabeleceu Strangler Fig como estratégia de migração. [ADR-0005](./0005-thin-bff-gateway.md) definiu o BFF Gateway burro como porta de entrada. Permanecia em aberto **uma pergunta crítica**:

> **Os 4 Bounded Contexts do handbook (Documentos, Títulos, Bradesco, OCR) devem viver em quantos serviços deployáveis?**

O espectro de respostas analisado:

1. **1 serviço** — Modular Monolith único: `core-api` contendo os 4 BCs.
2. **2 serviços** — Híbrido: `core-api` (Documentos + Títulos) + `bank-ocr-api` (Bradesco + OCR).
3. **3 serviços** — Granular: `core-api` (Core BCs) + serviços separados para Bradesco e OCR.
4. **4 serviços** — Microservices proper: 1 serviço por BC.

A análise foi conduzida com base **estrita** no handbook em [`../../domain/`](../../domain/), forçando que a decisão se ancore em invariantes de negócio explícitos, não em estética arquitetural.

### Restrições já fixadas (não-negociáveis)

- Handbook é fonte da verdade (P.O. estabeleceu como imutável).
- ADRs 0001-0005 vigentes e respeitados.
- 4 BCs como definidos em [`../../domain/02-context-map.md`](../../domain/02-context-map.md).
- Time pequeno, sem SRE dedicado, volume baixo-médio (centenas a poucos milhares de documentos/mês).

### Invariantes cross-BC identificados no handbook

Cinco regras do domínio exigem leitura/escrita consistente entre BCs:

| # | Invariante | Localização | BC Origem | BC Alvo |
|---|---|---|---|---|
| 1 | R3 Sincronia de Status: título só pode ser `Transmitido` se documento estiver `Selado` | [`domain/04-titulos-liquidacao-context.md`](../../domain/04-titulos-liquidacao-context.md) l.56 | Títulos | Documentos |
| 2 | R3 Reabertura: reabrir documento exige cancelar/checar todos os títulos filhos | [`domain/09-status-maquina-estados.md`](../../domain/09-status-maquina-estados.md) l.132 | Documentos | Títulos |
| 3 | R8 Integridade de Imposto: títulos imposto herdam regras do documento | [`domain/04-titulos-liquidacao-context.md`](../../domain/04-titulos-liquidacao-context.md) l.61 | Títulos | Documentos |
| 4 | Auditoria como Shared Kernel (DDD) | [`domain/02-context-map.md`](../../domain/02-context-map.md) l.53 | Todos | Governança |
| 5 | Time Travel cross-BC: trace único *"desde a leitura do OCR até a baixa final"* | [`domain/08-glossario-ubiquo.md`](../../domain/08-glossario-ubiquo.md) l.94 | Todos | Governança |

---

## Decisão

**O `core-api` é implementado como Modular Monolith** — um único serviço deployável contendo os 4 BCs como módulos internos.

### Estrutura interna

```
apps/core-api/
└── src/
    ├── contexts/
    │   ├── documentos/    ← Core BC (Fato Gerador)
    │   ├── titulos/       ← Core BC (Ciclo de Liquidação)
    │   ├── banco/         ← Generic BC (ACL Bradesco — interna)
    │   └── ocr/           ← Supporting BC
    ├── shared/            ← Código transversal do app (não BC)
    └── server.ts          ← Composition root
```

Cada BC organiza-se internamente em camadas: `domain/`, `application/`, `adapters/`.

### Total de deployables

- **Durante a transição:** 3 serviços — `bff-gateway` + `legacy-api` (NestJS, intocado) + `core-api` (Modular Monolith).
- **Após desligamento do legado:** 2 serviços — `bff-gateway` + `core-api`.

### Fronteiras entre BCs (DENTRO do core-api)

Aplicadas via:

| Mecanismo | Garantia |
| :--- | :--- |
| Estrutura de pastas (`contexts/<bc>/`) | Localidade física do código de cada BC |
| ESLint rule `no-cross-context-import` | Impede `import` direto entre BCs (exceto via contratos) |
| Ports/adapters explícitos | Cada BC expõe interface de leitura/comando para outros |
| Eventos in-process | Comunicação cross-BC mesmo dentro do processo (mesmo contrato dos eventos cross-deployable) |
| Schema único `core.*` (ADR-0003) | Tabelas namespaceadas por BC: `core.documentos_*`, `core.titulos_*`, etc. |

---

## Consequências

### Positivas

- **Invariantes cross-BC respeitados gratuitamente.** R3 Sincronia, R3 Reabertura e R8 Integridade são leitura in-process consistente, sem latência de rede e sem risco de stale read.
- **Auditoria como Shared Kernel implementável diretamente.** Tabela `core.audit_log` recebe entradas via commit ACID na mesma transação da mutação de origem — Time Travel ordenado pela ordem real do banco.
- **Simplicidade operacional.** 1 pipeline CI/CD para o core, 1 deploy, 1 conjunto de logs, 1 ponto de monitoração. Time pequeno consegue operar.
- **Refactor de fronteira via IDE.** Quando uma fronteira entre BCs se mostrar errada (esperado durante a inversão de paradigma), o ajuste é feito sem mudar contrato HTTP, banco ou deploy.
- **Caminho de extração futuro preservado.** Os BCs já estão isolados como módulos. Extrair um BC para serviço próprio = mover pasta + trocar chamada de função por evento outbox + adicionar Dockerfile. Estimativa: dias, não meses.
- **Honra todas as ADRs vigentes.** Não cria atrito com 0001 (Strangler Fig), 0003 (schemas isolados legacy/core), 0004 (Outbox legacy↔core), 0005 (BFF burro).
- **Reduz vetores de risco simultâneos.** O projeto já absorve mudança de paradigma de domínio + arquitetura de migração + cultura de código + infra nova. Microservices proper seria a 7ª mudança simultânea (ver ADR-0001).

### Negativas

- **SPOF lógico.** Bug crítico em qualquer BC pode derrubar o `core-api` inteiro. Mitigado por: testes rigorosos, sistema interno com janela de manutenção tolerável, e mecanismos de circuit breaker entre BCs in-process.
- **Escala uniforme.** Todos os BCs escalam juntos (mesma instância, mesma memória). Aceitável dado o volume baixo-médio do projeto. Re-avaliar se sinal de escala assimétrica aparecer.
- **Deploy acoplado.** Mudança em qualquer BC exige redeploy do `core-api` inteiro. Aceitável para frequência de deploy esperada (semanal/quinzenal típica de ERP interno).
- **Tentação de violar fronteiras de BC sob pressão.** Conviver no mesmo processo facilita o atalho `import`. Mitigado por ESLint rule + revisão de PR obrigatória + presença explícita deste ADR como referência.

### Neutras

- BCs Generic e Supporting (Bradesco, OCR) ficam no mesmo deployable que os Core (Documentos, Títulos). ACL é preservada via isolamento lógico (módulo) conforme exigência do handbook em [`domain/05-integracao-bancaria-context.md`](../../domain/05-integracao-bancaria-context.md) l.51 — *"O Core do sistema não conhece 'posições de memória' ou 'espaços em branco' do CNAB. Apenas este contexto lida com strings de texto fixo."*
- Histórico financeiro permanece no schema `legacy.*`, congelado, conforme [ADR-0001](./0001-strangler-fig-over-rewrite.md).

---

## Alternativas Consideradas

### A. Microservices Proper — 1 serviço por Bounded Context (4 serviços novos)

**Rejeitada porque:**

- **R3 Sincronia** viraria chamada HTTP síncrona ou projeção local com risco de stale read.
- **R3 Reabertura** viraria saga distribuída, com falhas parciais possíveis em fluxo crítico.
- **Auditoria Shared Kernel** demandaria distributed tracing pesado e dependência de relógios sincronizados (NTP) para ordenar Time Travel.
- **Custo operacional 4x** (4 pipelines, 4 deploys, 4 monitorações) sem ganho proporcional.
- **Time pequeno** não tem capacidade de operar microservices proper sem SRE dedicado.
- **Volume médio** não justifica granularidade fina.

### B. Macro-serviços híbridos — `core-api` (Documentos + Títulos) + `bank-ocr-api` (Bradesco + OCR)

**Rejeitada NESTA FASE porque:**

- Não há sinais operacionais que justifiquem a separação:
  - OCR moderno é tipicamente delegado a serviço externo (Google Vision, AWS Textract) — sem risco de event loop starvation no Node.
  - CNAB Bradesco é estável; certificados rotacionam via Secrets Manager sem deploy.
- Adiciona complexidade (2 deploys, outbox adicional, eventos cross-deployable) sem benefício atual.
- **Mantida como caminho de evolução natural** se sinais aparecerem (ver "Quando Re-avaliar").

### C. Microservices granulares — separação por aggregate ou feature

**Rejeitada sem aprofundamento porque:**

- Granularidade abaixo do BC é universalmente reconhecida como cargo cult em literatura recente (Newman, Richards/Ford, Vernon).
- Multiplica todos os problemas da Opção A sem nenhum benefício adicional.

---

## Garantias técnicas (para evitar virar monolito caótico)

> Modular Monolith mal feito é monolito disfarçado. As garantias abaixo são obrigatórias.

| Guarda | Mecanismo | Falha esperada se ausente |
| :--- | :--- | :--- |
| Sem cross-import entre BCs | ESLint rule + estrutura de pastas | Acoplamento implícito entre BCs |
| Comunicação explícita | Eventos in-process com contrato versionado | "Deus-classe" emergente |
| Domínio sem framework | Camadas domain/application/adapters por BC | Lógica de negócio acoplada a Hono/Fastify |
| Auditoria atômica | Tabela `core.audit_log` em Shared Kernel | Time Travel inconsistente |
| Schema namespaceado | Prefixo de tabela por BC (`core.documentos_*`) | Joins acidentais cross-BC |
| Revisão de PR sobre fronteiras | Reviewer dedicado a BC | Erosão lenta da arquitetura |

---

## Quando Re-avaliar

A decisão deve ser revisitada (gerando ADR novo que `supersedes` este) se **qualquer** dos sinais abaixo for observado em produção:

1. **OCR vira CPU/memory intensive in-process** — medição de event loop lag superior a 500ms p99 atribuível ao OCR.
2. **Volume em algum BC explode assimetricamente** — ex: 100k+ documentos/mês só em OCR enquanto demais BCs continuam em volume médio.
3. **Time cresce para 10+ desenvolvedores** com squads dedicadas a BCs específicos com necessidade de ciclos de release independentes.
4. **Surgir requisito operacional de deploy independente** — ex: integração Bradesco precisa atualizar com frequência sem reiniciar o resto.
5. **SPOF de algum BC vira problema operacional documentado** em incidentes recorrentes.

### Caminho preferencial de evolução

Se sinais aparecerem, **extrair primeiro o que é mais fácil e mais isolado**:

```
Estado atual (este ADR):
core-api { documentos, titulos, banco, ocr }

Primeira evolução possível (se sinais aparecerem):
core-api { documentos, titulos } + bank-ocr-api { banco, ocr }

Evolução improvável (alto custo, baixo retorno esperado):
core-api { documentos, titulos } + bank-api { banco } + ocr-api { ocr }
```

> ⚠️ **Documentos e Títulos devem permanecer juntos sempre.** Os invariantes R3 Sincronia, R3 Reabertura e R8 Integridade tornam essa fronteira a mais cara de atravessar — a literatura é unânime nesse tipo de caso.

---

## Referências

### Handbook (fonte primária)

- [`../../domain/02-context-map.md`](../../domain/02-context-map.md) — Mapa de Bounded Contexts, Shared Kernel de auditoria.
- [`../../domain/03-gestao-documentos-context.md`](../../domain/03-gestao-documentos-context.md) — BC Documentos (Core).
- [`../../domain/04-titulos-liquidacao-context.md`](../../domain/04-titulos-liquidacao-context.md) — BC Títulos (Core), invariantes R3 e R8.
- [`../../domain/05-integracao-bancaria-context.md`](../../domain/05-integracao-bancaria-context.md) — BC Bradesco (Generic, ACL).
- [`../../domain/06-event-line-context.md`](../../domain/06-event-line-context.md) — Matriz de eventos cross-BC.
- [`../../domain/08-glossario-ubiquo.md`](../../domain/08-glossario-ubiquo.md) — Time Travel, Saída Bancária, Shared Kernel.
- [`../../domain/09-status-maquina-estados.md`](../../domain/09-status-maquina-estados.md) — Máquina de estados, R3 Reabertura, regras transversais.

### ADRs relacionados

- [ADR-0001](./0001-strangler-fig-over-rewrite.md) — Estratégia Strangler Fig (premissa).
- [ADR-0003](./0003-shared-db-isolated-schemas.md) — Schemas isolados legacy/core (mantido; este ADR opera DENTRO do `core.*`).
- [ADR-0004](./0004-postgres-outbox-pattern.md) — Outbox entre `core-api` e `legacy-api` (mantido; comunicação intra-`core-api` é in-process).
- [ADR-0005](./0005-thin-bff-gateway.md) — BFF burro (mantido; roteia `/api/v2/*` ao `core-api` único).

### Documentos de arquitetura

- [`../01-migration-strategy.md`](../01-migration-strategy.md) — Estratégia geral de migração.
- [`../02-system-topology.md`](../02-system-topology.md) — Topologia dos serviços.

### Literatura de apoio

- Vernon, V. — *Strategic Monoliths and Microservices* (defesa do modular monolith para sistemas de domínio coeso).
- Brown, S. — palestras e materiais sobre Modular Monolith Architecture.
- Newman, S. — *Building Microservices*, 2ª ed., capítulo *"When NOT to Use Microservices"*.
- Richards, M. & Ford, N. — *Software Architecture: The Hard Parts*, capítulos sobre service granularity disintegrators e integrators.
- Fowler, M. — *MonolithFirst* (https://martinfowler.com/bliki/MonolithFirst.html).
