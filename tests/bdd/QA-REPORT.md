# 📋 Relatório QA — Cobertura BDD via CLI

> **Build sob teste:** `core-api@0.1.0`
> **Entrypoint:** `npm run cli:contracts` (Node 24 + `--experimental-strip-types`)
> **Adapters:** in-memory (contract repo, amendment repo, event bus) — sem SDKs/HTTP/DB
> **Spec:** [`tests/bdd/contracts.bdd.md`](./contracts.bdd.md)
> **Executado em:** 2026-05-14
> **QA:** Claude (sessão automatizada)

---

## 1. Sumário executivo

| #   | Cenário BDD                                                                                         | Resultado                                      | Severidade defeito |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| 1.1 | Persistência e numeração `XXX/AAAA`, `valorVigente = valorOriginal`                                 | ✅ PASS                                        | —                  |
| 1.2 | Motor de cálculo: `valorVigente` 100k → 125k após Addition 25k homologada; `valorOriginal` imutável | ✅ PASS                                        | —                  |
| 2.1 | Bloquear homologação sem documento anexado                                                          | ✅ PASS (texto da mensagem difere do literal)  | Baixa              |
| 2.2 | Validação de sinal algébrico em Supressão                                                           | 🔴 FAIL (literal) / ✅ semântica equivalente   | Média              |
| 3   | Timeline `405 Method Not Allowed` em PUT/DELETE                                                     | ⚪ N/A nesta fase (precisa adapter HTTP)       | —                  |
| 4   | RBAC `403 Forbidden` para OPERADOR em `distratar`                                                   | ⚪ N/A nesta fase (precisa adapter HTTP + JWT) | —                  |
| 5   | Evento `EstadoContratualAtualizado` carrega `novoSaldoVigente` + `idContrato`                       | 🔴 FAIL                                        | **Alta**           |

**Total executável nesta fase:** 5 cenários (1.1, 1.2, 2.1, 2.2, 5).
**Passa:** 3 (1.1, 1.2, 2.1). **Falha:** 2 (2.2, 5).
**Bloqueador de release:** 1 (Defeito #1 — payload de evento sem `novoSaldoVigente`).

---

## 2. Ambiente e metodologia

- **Persistência:** `--state qa-state.json` (snapshot em disco entre comandos).
- **Inspeção de eventos:** harness Node temporário instanciando o use case `homologateAmendment` com `InMemoryEventBus` para capturar o array de eventos publicados (CLI não expõe eventos no stdout).
- **Limpeza:** todos os artefatos temporários (`qa-state.json`, `qa-state.bak.json`, harness) foram removidos ao final.
- **Datas:** clock real para a CLI; clock fixo (`2026-05-14T12:00:00Z`) para o harness de evento, para evidências determinísticas.

---

## 3. Evidências detalhadas por cenário

### Cenário 1.1 — Persistência e numeração ✅ PASS

**Spec:** `numeroSequencial` no formato `XXX/AAAA` e `valorVigente` igual ao `valorOriginal` na criação.

**Comando:**

```bash
npm run cli:contracts -- criar-contrato --state qa-state.json \
  --numero 001/2026 --titulo "Contrato Mãe QA" --objetivo "Validar BDD" \
  --assinado-em 2026-01-10 --valor-centavos 10000000 \
  --inicio 2026-01-15 --fim 2026-12-31
```

**Saída relevante:**

```
✅ Contrato criado.
Contrato 001/2026
  Valor original: R$ 100.000,00
  Valor vigente:  R$ 100.000,00
```

**Veredito:** PASS. Numeração `001/2026` ✓, igualdade de valores ✓.

---

### Cenário 1.2 — Motor de cálculo (Estado Vigente) ✅ PASS

**Spec:** contrato 100k + `AditivoHomologado` Addition 25k → `valorVigente=125k`, `valorOriginal=100k` (imutável), evento `EstadoContratualAtualizado` disparado.

**Comandos:**

```bash
npm run cli:contracts -- criar-aditivo --state qa-state.json \
  --contrato <CID> --numero "AD 01-001/2026" --descricao "Acréscimo" \
  --tipo Addition --valor-centavos 2500000

npm run cli:contracts -- anexar-documento --state qa-state.json \
  --aditivo <AID> --documento aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa

npm run cli:contracts -- homologar-aditivo --state qa-state.json \
  --aditivo <AID> --contrato <CID> --usuario 11111111-1111-4111-8111-111111111111
```

**Saída relevante:**

```
✅ Aditivo homologado.
Aditivo AD 01-001/2026   Status: Homologado   Homologado em: 14/05/2026
Contrato 001/2026
  Valor original: R$ 100.000,00
  Valor vigente:  R$ 125.000,00
  Aditivos homologados: 1
```

Inspeção do `InMemoryEventBus` confirma sequência publicada: `AmendmentHomologated` → `ContractStateUpdated` (mapeado para `EstadoContratualAtualizado` da spec).

**Veredito:** PASS quanto a saldo, imutabilidade do original e emissão do evento. Conteúdo do evento é tratado em 5.

---

### Cenário 2.1 — Impedir homologação sem evidência documental ✅ PASS

**Spec:** Aditivo `PENDENTE` com `arquivoAssinadoRef = null` → homologar deve retornar erro com mensagem "Documento assinado é obrigatório para homologação". HTTP 422 é N/A na CLI.

**Comando (antes de anexar documento):**

```bash
npm run cli:contracts -- homologar-aditivo --state qa-state.json \
  --aditivo <AID> --contrato <CID> --usuario <UID>
```

**Saída:**

```
❌ Aditivo precisa ter documento assinado anexado para ser homologado.
EXIT=1
```

Código de domínio que enforça a regra: `src/modules/contracts/domain/amendment/amendment.ts:123` → `return err('amendment-without-signed-document')`.

**Veredito:** PASS comportamental. Texto da mensagem difere ligeiramente da literal. Ver Defeito #4.

---

### Cenário 2.2 — Validação de sinal algébrico em Supressão 🔴 FAIL (literal)

**Spec:** Comando de aditivo com `tipo=SUPRESSAO` + `valorImpacto > 0` (positivo) → `DomainValidator` lança `InvalidImpactValueException` e a transação sofre rollback.

**Comandos:**

```bash
# (a) Suppression POSITIVA — spec exige FAIL
criar-aditivo --tipo Suppression --valor-centavos 500000
# (b) Suppression NEGATIVA
criar-aditivo --tipo Suppression --valor-centavos -500000
# (c) Suppression ZERO
criar-aditivo --tipo Suppression --valor-centavos 0
```

**Saídas:**
| Caso | Resultado real | Esperado pela spec |
|---|---|---|
| (a) positivo | ✅ "Aditivo criado em status Pendente." (Valor de impacto R$ 5.000,00) | ❌ rejeitar |
| (b) negativo | ❌ "Valor monetário não pode ser negativo." (`money-negative-value`) | ❌ rejeitar (ok) |
| (c) zero | ❌ "Valor de impacto não pode ser zero." (`amendment-impact-value-zero`) | — (não coberto pela spec) |

**Análise:** a implementação modela Supressão como **(kind=Suppression, magnitude ≥ 0)** — o sinal é inferido do `kind`. O efeito final após homologação está correto (vide teste de regressão: 125k → 120k subtraindo 5k da Supressão), mas o contrato externo diverge da spec, que pressupõe delta assinado.

**Veredito:** FAIL na interpretação literal da spec, PASS na semântica. Ver Defeito #3 para decisão arquitetural.

---

### Cenário 5 — Notificação para o sistema de Contas a Pagar 🔴 FAIL

**Spec:** Após `EstadoContratualAtualizado`, o payload publicado deve conter `novoSaldoVigente` e `idContrato`.

**Payload real capturado** (do `InMemoryEventBus` após homologação válida):

```json
{
  "type": "ContractStateUpdated",
  "contractId": "d673cc4b-d236-421a-a341-181ac3ab5a3b",
  "occurredAt": "2026-05-14T12:00:00.000Z",
  "amendmentId": "3d24245d-220c-411b-8d24-97dc161b0b75"
}
```

- `contractId` (≡ `idContrato`) ✓
- `novoSaldoVigente` ❌ **AUSENTE**

**Definição do tipo:** `src/modules/contracts/domain/contract/events.ts:5-10`.

**Impacto:** consumidor (Contas a Pagar) precisará fazer fetch adicional do contrato para descobrir o saldo. Quebra a contratualidade event-driven prometida pela spec e adiciona acoplamento.

**Veredito:** FAIL. Ver Defeito #1.

---

### Cenários 3 e 4 — ⚪ N/A nesta fase

- **3** (Timeline 405 PUT/DELETE) pressupõe um endpoint HTTP imutável; ainda não existe adapter HTTP.
- **4** (RBAC 403 OPERADOR) pressupõe Hono + middleware de JWT/role; idem.

Manter no spec e revalidar quando o adapter HTTP/Hono entrar.

---

## 4. Defeitos abertos (priorizados)

### 🔴 Defeito #1 — Evento `ContractStateUpdated` sem `currentValue` (BDD-5)

- **Severidade:** Alta (bloqueador de integração com Contas a Pagar).
- **Arquivo:** `src/modules/contracts/domain/contract/events.ts:5-10`.
- **Comportamento atual:** payload contém apenas `contractId`, `occurredAt`, `amendmentId`.
- **Esperado:** incluir `newCurrentValue` (≡ `novoSaldoVigente`) — em `Money` ou em `cents`.

**Patch sugerido (events.ts):**

```ts
import type { Money } from '../shared/money.ts';
import type { AmendmentId, ContractId } from '../shared/ids.ts';

export type ContractEvent = Readonly<
  | { type: 'ContractCreated'; contractId: ContractId; occurredAt: Date }
  | {
      type: 'ContractStateUpdated';
      contractId: ContractId;
      occurredAt: Date;
      amendmentId: AmendmentId;
      newCurrentValue: Money; // ← novo campo
    }
  | {
      type: 'ContractEnded';
      contractId: ContractId;
      occurredAt: Date;
      kind: 'Expired' | 'Terminated';
    }
>;
```

**Onde popular:** `src/modules/contracts/domain/contract/contract.ts` (função `applyHomologatedAdjustment`) já tem o `currentValue` atualizado em mãos. Basta espelhar no evento que é construído ao final.

**Cobertura de teste a adicionar:** assertion em `tests/modules/contracts/application/use-cases/homologate-amendment.test.ts` verificando que o evento `ContractStateUpdated` carrega `newCurrentValue.cents === 12_500_000` no fluxo de Addition 25k sobre contrato 100k.

---

### 🟡 Defeito #2 — Formatters CLI quebram linha com literal `\n` (2 occurrences)

- **Severidade:** Média (UX de QA/operador degradada; valores corretos, layout ilegível).
- **Arquivos:**
  - `src/modules/contracts/cli/formatters/contract.ts:23`
  - `src/modules/contracts/cli/formatters/amendment.ts:53`
- **Comportamento atual:** `lines.join('\\n')` resulta na string literal `\n` (barra + n) sendo impressa, não em quebra real.
- **Patch:**
  ```ts
  return lines.join('\n'); // remover o segundo backslash
  ```
- **Cobertura de teste a adicionar:** `tests/modules/contracts/cli/format.test.ts` — assertion `result.includes('\n') && !result.includes('\\n')` para `formatContract` e `formatAmendment`.

---

### 🟡 Defeito #3 — Contrato API de Supressão diverge da spec (BDD-2.2)

- **Severidade:** Média (decisão arquitetural pendente).
- **Arquivos envolvidos:**
  - `src/modules/contracts/application/use-cases/create-amendment.ts` (parse de `impactValueCents`)
  - `src/modules/contracts/domain/shared/money.ts` (rejeita negativos)
  - `src/modules/contracts/domain/amendment/amendment.ts:31-49` (`validateVariantInput`)
- **Conflito:** spec usa "delta assinado" (Suppression deve ter valor ≤ 0); código usa "magnitude + kind".

**Caminhos possíveis (decisão do PO/Arquiteto):**

**A. Manter código, atualizar spec.** Adequar `contracts.bdd.md` para refletir magnitude+kind. Vantagem: zero refactor; alinhado a `Money` (não-negativo). Spec passa a dizer: "Supressão exige `valor-centavos > 0` representando a magnitude da redução".

**B. Adequar código à spec.** Aceitar inteiros assinados na CLI/use case, validar:

- `Suppression` → `cents < 0`;
- `Addition` → `cents > 0`;
- `Misc`/`TermChange` → não usa.

Exige refactor de `Money` (ou criação de `SignedMoney`/`Delta` à parte) e novo erro `amendment-invalid-impact-sign`.

**Recomendação QA:** caminho A. Menor risco, mantém invariante "Money é não-negativo", e a perda informacional é zero — o `kind` já carrega o sinal.

---

### 🟢 Defeito #4 — Texto da mensagem de homologação difere literalmente do BDD (BDD-2.1)

- **Severidade:** Baixa (cosmético).
- **Arquivo:** `src/modules/contracts/cli/formatters/error.ts` (chave `amendment-without-signed-document`).
- **Atual:** "Aditivo precisa ter documento assinado anexado para ser homologado."
- **Spec:** "Documento assinado é obrigatório para homologação."
- **Patch:** trocar para o texto literal do BDD se quisermos pareamento exato com a evidência documental do Gherkin. Caso contrário, atualizar a spec.

---

## 5. Observações estruturais

1. **CLI não expõe stream de eventos.** Para QA observar payloads sem precisar de harness, considerar uma flag global `--verbose-events` (ou um subcomando `inspecionar-eventos`) que dumpe `eventBusHandle.published()` ao final do comando, somente em modo dev. Útil para Wave W3 e onboarding de novos devs.

2. **`--no-state` zera o contexto, inclusive para comandos que só leem.** Faz sentido para `criar-contrato`, mas penaliza testes de regressão multi-comando. Sugerir um `--state-readonly <arquivo>` para casos somente-leitura.

3. **`process.argv` ordem dos flags.** Não foi testado caso de flag inválida, valor com aspas embutidas, ou repetição. Não está no spec, mas vale ticket de hardening na próxima iteração.

4. **Cobertura de testes automatizados existentes:** `tests/modules/contracts/**/*.test.ts` cobre o domínio e use cases de forma sólida. O gap é o **end-to-end via CLI**, que este relatório cobriu manualmente. Recomendo um `tests/cli/contracts.cli.test.ts` que dispare `child_process.spawnSync` no `main.ts` e valide stdout/stderr/exit code dos cenários 1.1, 1.2, 2.1, 2.2.

---

## 6. Próximos passos sugeridos para o dev

1. **Corrigir Defeito #1 (Alta)** — incluir `newCurrentValue` em `ContractStateUpdated`. Adicionar teste de integração no use case.
2. **Corrigir Defeito #2 (Média)** — `join('\n')` nos dois formatters; adicionar teste.
3. **Decidir Defeito #3** com PO/Arquiteto — atualizar spec OU implementar delta assinado.
4. **Decidir Defeito #4** — alinhar texto da mensagem com spec OU vice-versa.
5. **Aguardar adapter HTTP** para reabrir cenários 3 e 4.
6. **(Opcional)** Estabilizar a suíte ponta-a-ponta CLI em `tests/cli/`, espelhando os comandos deste relatório.

---

# 📎 Apêndice — Re-teste adversarial "fora da caixa"

> **Executado em:** 2026-05-14 (após primeiro round de QA)
> **Escopo:** manter-se no módulo de Contratos; tentar quebrar invariantes, boundaries e contratos via uso legítimo da CLI.
> **Metodologia:** 12 baterias (A1–A12) cobrindo invariantes de identidade, parsing de input, máquina de estados, persistência e I/O.

## A. Sumário do apêndice

| Bateria | Foco                                            | Resultado  | Severidade max |
| ------- | ----------------------------------------------- | ---------- | -------------- |
| A1      | Unicidade de `sequentialNumber`                 | 🔴 FAIL    | **Crítica**    |
| A2      | Formato `XXX/AAAA` do número                    | 🔴 FAIL    | Alta           |
| A3      | Períodos / datas inconsistentes                 | 🟡 PARCIAL | Média          |
| A4      | Valor 0 / decimal / overflow IEEE 754           | 🔴 FAIL    | **Crítica**    |
| A5      | Supressão > valor vigente                       | ✅ PASS    | —              |
| A6      | Máquina de estados (replay anexo + homologação) | ✅ PASS    | —              |
| A7      | UUIDs inválidos / IDs cruzados                  | ✅ PASS    | —              |
| A8      | TermChange retroativo                           | 🟡 PARCIAL | Baixa          |
| A9      | Strings whitespace / controle / payloads        | 🟡 PARCIAL | Baixa          |
| A10     | Flag repetida / flag desconhecida               | 🟡 PARCIAL | Média          |
| A11     | Persistência rehidratada (datas, contagens)     | ✅ PASS    | —              |
| A12     | State corrompido / I/O sem boundary             | 🔴 FAIL    | Alta           |

**Defeitos novos elevados:** 7 (Defeitos #5–#11).
**Áreas bem testadas / robustas:** máquina de estados de Aditivo, validação de UUID v4, mismatch contrato↔aditivo, supressão > saldo, rehidratação de Date.

---

## A1. Duplicidade de `sequentialNumber` — 🔴 CRÍTICA

**Setup:** state limpo, dois `criar-contrato` com o mesmo `--numero 001/2026`.
**Saída real:**

```
✅ Contrato criado.   (id b786161e-...)
✅ Contrato criado.   (id bc93f8b5-...)
listar-contratos → 2 contrato(s): - 001/2026 [Ativo] R$ 100.000,00 / - 001/2026 [Ativo] R$ 50.000,00
```

**Esperado:** segundo `criar-contrato` deve falhar com `contract-sequential-number-duplicated` (ou equivalente). Numeração sequencial é chave de auditoria.

→ **Defeito #5**.

---

## A2. Formato `XXX/AAAA` não validado — 🔴 ALTA

Aceita: `ABC`, `1/26`, `001-2026`, `999/9999`, `0/2026`, `001/26`.
Rejeita: vazio, só whitespace.

A spec BDD-1.1 declara textualmente o formato. → **Defeito #6**.

---

## A3. Períodos / datas — 🟡 PARCIAL

| Caso                                    | Resultado  | Esperado   |
| --------------------------------------- | ---------- | ---------- |
| `--inicio` posterior a `--fim`          | ❌ rejeita | ✅         |
| `--assinado-em` posterior ao `--inicio` | ✅ aceita  | ⚠️ revisar |
| `--assinado-em "abacaxi"`               | ❌ rejeita | ✅         |
| mês 13                                  | ❌ rejeita | ✅         |
| ano `0001`                              | ✅ aceita  | ❌         |
| `--inicio == --fim` (período de 0 dias) | ✅ aceita  | ❌         |

→ **Defeito #7**.

---

## A4. Valor monetário — 🔴 CRÍTICA (corrupção silenciosa)

| Caso                                | Resultado real                                                     | Esperado             |
| ----------------------------------- | ------------------------------------------------------------------ | -------------------- |
| `--valor-centavos 0`                | ✅ aceita                                                          | ❌ rejeitar          |
| `--valor-centavos 100.5` (decimal)  | ❌ `money-non-integer-value`                                       | ✅                   |
| `--valor-centavos 1e25`             | ✅ aceita; formatter cospe `R$ 1.0.000.000.000.000.001e+23,64`     | ❌ rejeitar          |
| `--valor-centavos 9007199254740993` | ✅ aceita, **armazenado como `9007199254740992`** (perda IEEE 754) | ❌ rejeitar overflow |
| `--valor-centavos -100`             | ❌ `money-negative-value`                                          | ✅                   |
| `--valor-centavos "abc"`            | ❌ "precisa ser um número"                                         | ✅                   |

**Confirmação técnica:** `Number.isInteger(9007199254740993) === true`, porém `9007199254740993 === 9007199254740992 // true`. O `Money.fromCents` aceita o input, dando corrupção silenciosa de valor financeiro.

→ **Defeito #8** (overflow), **Defeito #9** (valor zero), **Defeito #10** (formatter de moeda para magnitudes grandes).

---

## A5. Supressão > valor vigente — ✅ PASS

Contrato 100k, Suppression 200k, homologar → `❌ Supressão excede o valor vigente — resultado ficaria negativo.` Boa proteção, retornada de `Money.subtract` via `Contract.applyHomologatedAdjustment`.

---

## A6. Máquina de estados de Aditivo — ✅ PASS

Ordem testada: criar (Misc) → anexar doc → tentar anexar doc 2 → homologar → tentar re-homologar → tentar anexar doc após homologar.

| Sub-cenário                            | Resultado                                |
| -------------------------------------- | ---------------------------------------- |
| Anexar segundo documento               | ❌ `amendment-document-already-attached` |
| Re-homologar                           | ❌ `amendment-not-pending`               |
| Anexar documento em aditivo homologado | ❌ `amendment-not-pending`               |

Máquina de estados sólida. Bem feito.

---

## A7. UUIDs e IDs cruzados — ✅ PASS

| Sub-cenário                                         | Resultado                        |
| --------------------------------------------------- | -------------------------------- |
| `--documento "nao-eh-uuid"`                         | ❌ `document-id-invalid-format`  |
| `--documento` UUID v3                               | ❌ rejeita (versão ≠ 4)          |
| `--documento` v4 com variant errado                 | ❌ rejeita (variant ≠ 8,9,a,b)   |
| Homologar aditivo de outro contrato (mismatch)      | ❌ `amendment-contract-mismatch` |
| `mostrar-contrato --id` UUID válido mas inexistente | ❌ `contract-not-found`          |
| `mostrar-contrato --id "not-a-uuid"`                | ❌ `contract-id-invalid-format`  |

Excelente diferenciação entre "formato inválido" e "não encontrado".

---

## A8. TermChange retroativo — 🟡 PARCIAL

| Caso                                               | Criação    | Homologação            |
| -------------------------------------------------- | ---------- | ---------------------- |
| `--nova-data-fim 2026-01-01` (< início 2026-01-15) | ✅ aceita  | ❌ "posterior à atual" |
| `--nova-data-fim 2026-01-15` (= início)            | ✅ aceita  | (não testado)          |
| `--nova-data-fim "abacaxi"`                        | ❌ rejeita | —                      |

Detecção tardia. Preferível **fail-fast na criação**. → **Defeito #11**.

---

## A9. Strings whitespace / controle / payloads — 🟡 PARCIAL

| Input                                    | Resultado                     |
| ---------------------------------------- | ----------------------------- |
| `--titulo "    "` (só whitespace)        | ❌ "Título é obrigatório."    |
| `--objetivo "   "`                       | ❌ "Objetivo é obrigatório."  |
| `--titulo $'linha1\nlinha2\ttab'`        | ✅ aceita literal `\n` e `\t` |
| `--titulo "'; DROP TABLE contracts;--"`  | ✅ aceita literal             |
| `--objetivo "<script>alert(1)</script>"` | ✅ aceita literal             |

Sem SQL/HTML hoje, mas falta normalização de `\n`/`\t` em campos curtos (quebra CSV/UI). Sanitização XSS é responsabilidade do adapter SSR futuro, mas vale registrar.

---

## A10. Flag repetida / desconhecida — 🟡 PARCIAL

| Caso                                         | Resultado                                  |
| -------------------------------------------- | ------------------------------------------ |
| `--valor-centavos 100 --valor-centavos 9999` | ✅ último vence (R$ 99,99) silenciosamente |
| `--flag-fake "lixo"`                         | ✅ ignorada silenciosamente                |
| `--valor-centavos=2500`                      | ✅ funciona (sintaxe `=`)                  |
| `--tipo Xpto`                                | ❌ enum rejeitado com lista válida         |

Comportamento típico de parser permissivo, mas pode mascarar scripts errados. Sugestão: warn em stderr para flags desconhecidas/duplicadas.

---

## A11. Persistência rehidratada — ✅ PASS

Verificado em `state.ts`: o `JSON.parse` usa `reviver` que converte strings ISO de chaves conhecidas (`signedAt`, `start`, `end`, `homologatedAt`, `occurredAt`, `createdAt`, `newEndDate`, `endedAt`) de volta para `Date`. `mostrar-contrato` após reload exibe datas em pt-BR corretamente; contagem de aditivos preservada.

---

## A12. State corrompido / I/O sem boundary — 🔴 ALTA

| Caso                                       | Saída                                                                    | Exit |
| ------------------------------------------ | ------------------------------------------------------------------------ | ---- |
| JSON inválido                              | `❌ Erro inesperado: SyntaxError: Unexpected token 'i'…`                 | 1    |
| `--state` aponta para diretório            | `❌ Erro inesperado: Error: EISDIR…`                                     | 1    |
| Path em pasta inexistente (escrita)        | `❌ Erro inesperado: Error: ENOENT: no such file or directory, open '…'` | 1    |
| Schema inválido (`{"contracts":"oops",…}`) | `❌ Erro inesperado: TypeError: snapshot.amendments is not iterable`     | 1    |

`src/modules/contracts/cli/state.ts` não envolve `readFileSync`/`writeFileSync`/`JSON.parse` em `try/catch → Result`. Viola a regra do CLAUDE.md: "**`try/catch` → Result** — Allowed here, but MUST convert to Result before returning to application".

→ **Defeito #12**.

---

# 🐞 Defeitos novos (apêndice)

### 🔴 Defeito #5 — `sequentialNumber` sem unicidade (Crítica · A1)

- **Arquivos:** `src/modules/contracts/application/use-cases/create-contract.ts` + `src/modules/contracts/application/ports/contract-repository.ts`.
- **Patch sugerido:**

  ```ts
  // ports/contract-repository.ts
  export type ContractRepository = Readonly<{
    findById: (id: ContractId) => Promise<Result<Contract | null, ContractRepositoryError>>;
    findBySequentialNumber: (n: string) => Promise<Result<Contract | null, ContractRepositoryError>>; // novo
    save: …
  }>;

  // use-cases/create-contract.ts (antes de salvar)
  const exists = await deps.contractRepo.findBySequentialNumber(cmd.sequentialNumber);
  if (!exists.ok) return exists;
  if (exists.value !== null) return err('contract-sequential-number-duplicated');
  ```

- **Teste a adicionar:** dois `createContract` com mesmo numero → segundo retorna `err('contract-sequential-number-duplicated')`.

---

### 🔴 Defeito #6 — Formato `XXX/AAAA` não validado (Alta · A2)

- **Arquivo:** `src/modules/contracts/domain/contract/contract.ts` (validação de input em `create`).
- **Patch sugerido:**
  ```ts
  const SEQUENTIAL_NUMBER_RE = /^\d{3}\/\d{4}$/;
  if (!SEQUENTIAL_NUMBER_RE.test(input.sequentialNumber)) {
    return err('contract-sequential-number-invalid-format');
  }
  ```
- **Teste:** tabela parametrizada com `ABC`, `1/26`, `001-2026`, `001/2026` (válido), `999/9999` (válido).

---

### 🔴 Defeito #8 — Overflow IEEE 754 em `Money.fromCents` (Crítica · A4)

- **Arquivo:** `src/modules/contracts/domain/shared/money.ts`.
- **Causa:** `Number.isInteger` retorna `true` para inteiros acima de `2^53-1`, mas eles já perderam precisão.
- **Patch sugerido:**

  ```ts
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok({ cents } as Money);
  ```

  Ou migrar `cents` para `bigint` (mais robusto para um ERP).

- **Teste:** `Money.fromCents(9007199254740993)` → `err('money-exceeds-safe-integer')`.

---

### 🟡 Defeito #9 — Aceita contrato com valor R$ 0,00 (Média · A4)

- **Arquivo:** `src/modules/contracts/domain/contract/contract.ts` (validação).
- **Patch sugerido:** rejeitar `originalValue.cents === 0` na criação (mas permitir 0 como saldo após supressão — diferente caminho).
- **Teste:** `createContract` com `originalValueCents: 0` → `err('contract-original-value-zero')`.

---

### 🟡 Defeito #10 — Formatter de moeda quebra com magnitudes grandes (Média · A4)

- **Arquivo:** `src/modules/contracts/cli/formatters/money.ts:7`.
- **Causa:** `integer.toString()` em número > 1e21 usa notação exponencial (`"1e+23"`); regex de milhares cospe `1.0.000.000.000.000.001e+23`.
- **Patch:** após corrigir #8, o caso fica inalcançável; mas é prudente formatar via `Intl.NumberFormat('pt-BR')` para robustez.
  ```ts
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  ```
  Atenção a precisão de centavos — `Intl` faz arredondamento. Se for migrar `cents` para `bigint`, escrever formatador manual com fallback para `BigInt(n).toLocaleString` ou string-puro.

---

### 🟡 Defeito #7 — Períodos exotéricos (Média · A3)

- **Arquivo:** `src/modules/contracts/domain/shared/period.ts`.
- **Patch sugerido:**
  - rejeitar `start.getTime() === end.getTime()` (período de 0 dias);
  - rejeitar `start.getFullYear() < 2000` (ou outro range definido pelo PO).
- **Decisão de PO:** assinatura posterior ao início (caso retroativo) — manter aceito ou exigir invariante? Documentar.

---

### 🟡 Defeito #11 — TermChange retroativo só detectado na homologação (Baixa · A8)

- **Arquivo:** `src/modules/contracts/application/use-cases/create-amendment.ts` (variant `TermChange`).
- **Patch sugerido:** carregar contrato antes de validar `newEndDate > currentPeriod.end`, retornando `err('term-change-not-extending')` na criação (fail-fast). Hoje a checagem está no `applyHomologatedAdjustment`.

---

### 🔴 Defeito #12 — `state.ts` sem boundary I/O em Result (Alta · A12)

- **Arquivo:** `src/modules/contracts/cli/state.ts`.
- **Causa:** `JSON.parse`, `readFileSync`, `writeFileSync` lançam; main.ts captura como "Erro inesperado".
- **Patch sugerido:** retornar `Result<void, StateError>` de `loadState` e `saveState`:

  ```ts
  export type StateError =
    | 'state-file-not-readable'
    | 'state-file-corrupted'
    | 'state-schema-invalid'
    | 'state-file-not-writable';

  export const loadState = (...): Result<void, StateError> => {
    if (!existsSync(path)) return ok(undefined);
    let text: string;
    try { text = readFileSync(path, 'utf-8'); }
    catch { return err('state-file-not-readable'); }
    if (text.trim() === '') return ok(undefined);
    let snapshot: unknown;
    try { snapshot = JSON.parse(text, reviver); }
    catch { return err('state-file-corrupted'); }
    if (!isSnapshot(snapshot)) return err('state-schema-invalid');
    for (const c of snapshot.contracts) void contractRepo.repo.save(c);
    for (const a of snapshot.amendments) void amendmentRepo.repo.save(a);
    return ok(undefined);
  };
  ```

  E adaptar `context.ts` + `main.ts` para tratar o erro com mensagem humana.

- **Teste:** snapshots `tests/cli/fixtures/` com (a) JSON inválido, (b) schema errado, (c) arquivo vazio, (d) arquivo OK.

---

## 🔧 Quick-win adicional — `formatMoney` com `Intl` evita bug correlacionado

Quando o Defeito #8 for fechado (`cents` saneado), trocar `formatMoney` por `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` mata os defeitos #2 (já listado anteriormente) e #10 de uma vez, e ainda passa a tratar zero/negativos (se permitidos) consistentemente.

---

## 🔁 Ranking final de defeitos (round 1 + apêndice)

| Ordem | Defeito                                                               | Severidade  | Origem       |
| ----- | --------------------------------------------------------------------- | ----------- | ------------ |
| 1     | #5 — `sequentialNumber` sem unicidade                                 | **Crítica** | A1           |
| 2     | #8 — Overflow IEEE 754 em `Money.fromCents`                           | **Crítica** | A4           |
| 3     | #1 — Evento `ContractStateUpdated` sem `newCurrentValue`              | **Alta**    | BDD-5        |
| 4     | #6 — Formato `XXX/AAAA` não validado                                  | **Alta**    | A2 / BDD-1.1 |
| 5     | #12 — `state.ts` não converte I/O em Result                           | **Alta**    | A12          |
| 6     | #3 — Contrato API de Supressão diverge da spec (decisão arquitetural) | Média       | BDD-2.2      |
| 7     | #2 — Formatters CLI com literal `\\n`                                 | Média       | round 1      |
| 8     | #7 — Períodos exotéricos (0 dias, ano < 2000)                         | Média       | A3           |
| 9     | #9 — Aceita contrato R$ 0,00                                          | Média       | A4           |
| 10    | #10 — Formatter de moeda em magnitudes grandes                        | Média       | A4           |
| 11    | #11 — TermChange retroativo detectado tarde                           | Baixa       | A8           |
| 12    | #4 — Texto da mensagem de homologação literal vs spec                 | Baixa       | BDD-2.1      |

---

## ✅ Áreas robustas confirmadas

- Máquina de estados de Aditivo (A6).
- Validação estrita de UUID v4 (A7).
- Detecção de mismatch contrato↔aditivo (A7).
- Supressão > saldo (A5).
- Rehidratação de `Date` no reload de state (A11).
- Recusa de período invertido (A3).
- Recusa de valor decimal / NaN / negativo (A4).
- Enum de `--tipo` em `criar-aditivo` (A10).
- Sintaxe `--flag=valor` (A10).
- Rejeição de strings só-whitespace (A9).

Essas áreas têm testes existentes em `tests/modules/contracts/` que justificam a robustez observada. Não precisam de ação.
