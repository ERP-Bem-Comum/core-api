# Request — INT-RUNNER-ALL (US4 da spec 007)

## Título
Runner único de integração (`test:integration:all`) verde — alinhar os `.bru` ao server real

## Size
M

## Contexto
A US4 montou o runner único (`scripts/e2e-bruno-all.sh`) que sobe MySQL+MinIO, boota os 3 módulos em
mysql + seed completo, e roda a coleção unificada. A 1ª execução expôs **26 falhas na suíte principal**,
**todas alinhamento de teste** (`.bru` desalinhado do server real — coleções que nunca rodaram via Bruno).
Diagnóstico completo (via `--reporter-json`, bodies reais) em `specs/007-integration-test-suite/safety-net/runner-findings.md`.

## Estado (W0 RED — já capturado pelo runner)
Principal: 145/171. As 26 falhas, por causa-raiz:
- **A contracts (6):** body sem `mode:'Pending'` (schema é `discriminatedUnion('mode')`) + cascata.
- **B collaborators (7):** CPF `12345678901` inválido (módulo 11) + cascata.
- **C PAG boundary (5):** server retorna 400 `validation` (correto); teste espera `[422,200]` → aceitar 400.
- **D PAG-5d (1):** contracts usa `meta.total`; teste espera `totalItems`.
- **E partners (2):** `.bru` sem `?type=invalido` na URL + param de limit — server correto.
- **F deactivate-self (1):** captura do `adminUserId`.
- **G foto (1):** body binário não enviado.

**Nenhum bug de produção.** Server correto em todos.

## Escopo (W1 GREEN)
Alinhar os `.bru` ao comportamento real, seguindo **ADR-0038** (autoria `.bru`) e `.claude/rules/api-collections.md`.
Especialista: `bruno-api-client-expert`. **Obrigatório rodar o CLI** (`pnpm run test:integration:all`) até a
suíte principal ficar verde (ADR-0038 invariante #1).

## Critérios de Aceitação
1. `pnpm run test:integration:all` → suíte **PRINCIPAL verde** (exit 0).
2. `z-pending-fixes` continua reprovando por design (não bloqueia).
3. Nenhuma mudança em `src/` (todas as 26 são `.bru`); se algo exigir código, escalar (não previsto).
4. Sem órfãos de Docker (teardown do runner).

## Achado lateral (registrar, não bloqueia)
Inconsistência de naming de paginação entre módulos (`total` / `totalItems` / `itemCount`) — candidato a
ticket de harmonização.

## Referências
ADR-0038, `.claude/rules/api-collections.md`, `safety-net/runner-findings.md`, `scripts/e2e-bruno-all.sh`.
