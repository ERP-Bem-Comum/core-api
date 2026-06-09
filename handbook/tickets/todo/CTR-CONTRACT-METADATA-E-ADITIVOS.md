# Request — CTR-CONTRACT-METADATA-E-ADITIVOS

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Registro formal das **pendências de backend conhecidas que estavam SEM ticket** no README deste kanban
> (seção "ainda SEM ticket"). Origem: detalhe do contrato + tabela de aditivos. Verificado em 2026-06-09.

## Título

Persistência de metadados do contrato + dados próprios do aditivo

## Size

M/L (3 gaps relacionados — fatiável)

## Contexto

Durante a validação em tela do módulo Contratos, três lacunas de backend foram identificadas mas **não
tinham ticket**. Este card as registra. São independentes entre si e podem virar sub-tickets.

## Gaps (o que falta no backend)

### G1 — Metadados de categorização do contrato

O detalhe do contrato exibe `—` para **programa, categoria, centro de custo, plano orçamentário e
classificação (CT/OS)** — não há colunas no agregado nem no schema.

- **`programa`** → será uma **referência `program_id`** ao novo módulo `programs` (feature 008 /
  card `PRG-GESTAO-PROGRAMAS`). Cross-módulo **por ID/evento** (ADR-0014) — não importar `programs/domain`.
- **categoria, centro de custo, plano orçamentário** → provavelmente referências a outros BCs
  (Financeiro/Orçamento) quando existirem; até lá, definir se são VOs locais ou referências.
- **classificação (CT/OS)** → enum de domínio do contrato (`varchar + CHECK`, sem ENUM nativo — ADR-0020).

### G2 — `signedAt` por aditivo

O aditivo **não expõe data de assinatura própria** — a coluna "Assinatura" fica `—` no front.
Adicionar `signedAt` ao agregado Amendment (instante → `datetime(3)`).

### G3 — Numeração sequencial de aditivo no backend

Hoje o front exibe `AD NN-XXXX/ANO` **derivado por ordem de criação** (cálculo no cliente). O backend
deveria expor um número sequencial próprio do aditivo (padrão `sequential_number`, como em `contracts`).

## Estado atual (verificado)

- Agregado `Contract`/`Amendment` em `src/modules/contracts/domain/`. Schema em
  `src/modules/contracts/adapters/persistence/schemas/mysql.ts` (sem as colunas acima).
- `contracts.sequential_number` já existe (modelo para G3 no aditivo).

## Escopo (proposta)

Tickets separados por gap (G1/G2/G3), todos no **módulo Contratos** (`ctr_*`). G1 depende da existência
do módulo `programs` para a parte `programa` (as demais dimensões são independentes).

## Fora de Escopo

- Implementar o módulo `programs` (é a feature 008 / `PRG-GESTAO-PROGRAMAS`).
- Misturar módulos numa mesma sessão de implementação (ADR-0014) — G1-`programa` só **referencia** `program_id`.

## Critérios de Aceitação

1. **G1**: colunas/contrato expõem programa (`program_id`), categoria, centro de custo, plano orçamentário
   e classificação; detalhe deixa de exibir `—` onde houver dado.
2. **G2**: `signedAt` por aditivo no agregado + contrato HTTP.
3. **G3**: número sequencial de aditivo gerado/persistido no backend (não derivado no front).

## Notas

- G1-`programa` é o ponto de integração com a feature 008: assim que `programs` entregar `program_id`,
  abrir o sub-ticket de Contratos para referenciá-lo.
- G3 pode espelhar a geração de `program_number` decidida em `specs/008-gestao-programas/research.md` (D3).
