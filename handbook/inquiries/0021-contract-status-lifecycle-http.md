# Inquiry-0021: Ciclo de vida (status) do Contrato — 3 estados do domínio vs. 5 do legado

- **Status:** Decided (2026-05-27) → [ADR-0023](../architecture/adr/0023-contract-lifecycle-pending-state.md) — **aciona revisão do agregado `Contract`** (regra nova: estado `Pendente`)
- **Opened:** 2026-05-27
- **Decided:** 2026-05-27
- **Opened by:** Gabriel Aderaldo
- **Asked to:** P.O.
- **Impact:** ADR de adoção da camada HTTP (futuro), ACL do módulo Contratos (`src/modules/contracts/adapters/http/`), [`../api_documentations/contracts/openapi.yaml`](../api_documentations/contracts/openapi.yaml) (enum `ContractStatus`), eventualmente `src/modules/contracts/domain/contract/types.ts` (se a regra mudar).

---

## 1. Contexto

Ao planejar a exposição HTTP do módulo Contratos (front consumindo o contrato derivado do `openapi.yaml`, traduzido por uma Anti-Corruption Layer), surgiu uma **divergência de regra de negócio** — não de forma — no ciclo de vida do contrato.

Princípio fixado com o time: **a forma do contrato HTTP é negociável; as regras de negócio do domínio NÃO.** Logo, esta pergunta precisa de decisão definitiva da P.O. antes de cravarmos o enum de status.

---

## 2. Achados confirmados (regra oficial atual)

O handbook [`../domain_questions/contratos/bounded-contexts/gestao-contratos.md`](../domain_questions/contratos/bounded-contexts/gestao-contratos.md) define **3 estados**:

- l.27 — `status: StatusContrato; // Vigente, Encerrado, Distratado`
- l.35 — *"**StatusContrato**: `Vigente`, `Encerrado`, `Distratado`."*
- l.48 — no cadastro, *"Define status como `Vigente`"* → **o contrato nasce Vigente** (já assinado).
- l.67-72 — máquina de estado: `Vigente → Vigente` (atualização por aditivo) e `Vigente →` terminal (`Encerrado`/`Distratado`).
- l.81 (R1) — *"O `valorVigente` nunca pode ser editado manualmente."*
- l.83 (R3) — *"Um contrato `Encerrado` ou `Distratado` não pode receber novos aditivos."*

O código implementa fielmente: `Contract = ActiveContract | ExpiredContract | TerminatedContract` (`domain/contract/types.ts:36-59`), com `signedAt` **obrigatório** no `CreateContractInput` (contrato sempre nasce assinado).

## 3. A divergência

O `openapi.yaml` legado (sistema antigo, NestJS) declara **5 estados** (l.591-604):

> `Pendente` · `Assinado` · `Em andamento` · `Finalizado` · `Distrato`
> *"Pendente (sem documento assinado) ou Em andamento (com documento assinado + data de assinatura)."*

Os conflitantes:

| Status legado | Existe no domínio novo? | Observação |
| :--- | :--- | :--- |
| `Pendente` (sem assinatura) | ❌ | domínio força `signedAt` — não há "registrado mas não assinado" |
| `Assinado` | ❌ (parcial) | colapsa em `Vigente` |
| `Em andamento` | ❌ | colapsa em `Vigente` |
| `Finalizado` | ≈ `Encerrado` | fim normal de prazo |
| `Distrato` | ≈ `Distratado` (`Terminated`) | rescisão antecipada |

**A questão de fundo:** o ciclo `Pendente → Em andamento` é uma **regra de negócio real** que o sistema precisa ter (e então o domínio estaria incompleto), ou é um artefato do sistema antigo que o modelo novo deliberadamente simplificou para 3 estados?

---

## 4. Pergunta para a P.O. (linguagem de negócio)

> **Decisão necessária — Quais são os "status" de um contrato?**
>
> Hoje há duas visões:
> - **Tela atual (sistema antigo):** Pendente · Assinado · Em andamento · Finalizado · Distrato (5).
> - **Modelo novo:** Vigente · Encerrado · Distratado (3) — e o contrato só é cadastrado **depois de assinado**.
>
> **1. Cadastro antes da assinatura.** O operador cadastra um contrato **antes** de ter o documento assinado?
> - ( ) Sim — existe "registrado mas ainda não assinado" (= Pendente). *Se sim:* o que o operador faz com ele nesse estado?
> - ( ) Não — só cadastra quando **já está assinado**.
>
> **2. "Assinado" vs "Em andamento".** Qual a diferença prática entre os dois para a operação? Ou são a mesma coisa?
>
> **3. Fim do contrato.** Fim normal de prazo/conclusão → você chama de `Finalizado` ou `Encerrado`? E rompimento antecipado → confirma que é `Distrato`?
>
> **4. Lista final.** Quais status o operador **realmente** precisa ver e usar na tela? Algum da lista antiga já não faz sentido?
>
> ⚠️ Esta resposta vira **regra fixa**; mudar depois da API no ar custa caro.

---

## 5. Resposta da P.O. (colar aqui)

RESPOSTA DA P.O:
> Resposta registrada em 2026-05-27.

    **1. Cadastro antes da assinatura:**
    Sim. O operador pode cadastrar um contrato sem ter o documento assinado. O sistema deve registrar com o status de **PENDENTE**, o que significa que o contrato assinado será upado em breve.

    O status de **PENDENTE** **não permite** que o registro tenha efetividade: não dispara o início da vigência, não permite aditivos e nem execução contratual com vínculo financeiro. Tudo isso só acontecerá quando o status do contrato for **EM ANDAMENTO**.

    **2. Assinado vs Em andamento:**
    Não há distinção prática. **Assinado** e **Em Andamento** representam exatamente o mesmo estado: o contrato efetivamente vigente.

    Quando o operador faz o upload do arquivo assinado e preenche o campo obrigatório da data de assinatura, o contrato torna-se vigente — ou seja, passa para **EM ANDAMENTO**.

    **3. Fim do contrato (Finalizado/Encerrado + Distrato):**
    O ciclo final do contrato é **FINALIZADO**, quando ocorre o fim normal do prazo contratual.

    Sim, o rompimento antecipado do prazo contratual caracteriza um **DISTRATO**.

    **4. Lista final de status:**
    `PENDENTE` → `Em Andamento` → `Finalizado` / `DISTRATO`

**Observações livres:**
    *Sem observações adicionais.*

---

## 6. Decisão consolidada

A regra de negócio definitiva (autoridade: P.O.) são **4 estados**, com o contrato nascendo **`Pendente`**:

```
Pendente ──(anexa doc assinado + data de assinatura)──▶ Em Andamento ──┬──▶ Finalizado  (fim do prazo)
                                                                        └──▶ Distrato    (rescisão antecipada)
```

| Estado (negócio) | Efetividade | Mapeia para (domínio) |
| :--- | :--- | :--- |
| **Pendente** | SEM efetividade: não inicia vigência, **não aceita aditivos**, sem vínculo financeiro. Aguarda upload do documento assinado | ❌ **estado novo** (não existe hoje) |
| **Em Andamento** (≡ "Assinado") | vigente — recebe aditivos, executa | `Active` (`'Active'`) |
| **Finalizado** | terminal — fim normal do prazo | `Expired` (`'Expired'`) |
| **Distrato** | terminal — rompimento antecipado | `Terminated` (`'Terminated'`) |

Notas da P.O.: `Assinado` e `Em Andamento` são **o mesmo estado** (vigente). A transição `Pendente → Em Andamento` é disparada pelo **upload do documento assinado + preenchimento da data de assinatura**.

## 7. Impacto — o domínio atual está INCOMPLETO

O risco previsto na pergunta se materializou. O agregado `Contract` hoje (`domain/contract/types.ts`) tem **3 estados** (`Active | Expired | Terminated`) e `signedAt` **obrigatório** em `CreateContractInput` — ou seja, **não modela `Pendente`**. A decisão da P.O. exige revisão estrutural do domínio **antes** de qualquer trabalho HTTP:

1. **Novo estado refinado `PendingContract`** — sem `signedAt`/documento, sem `currentValue`/`currentPeriod` efetivos (vigência não iniciada).
2. **`create` passa a poder nascer `Pendente`** (sem doc) **ou** já `Active` (com doc + data) — espelha `CreateAmendmentInput`/`Amendment` (`PendingWithoutDocument → PendingWithDocument → Homologated`).
3. **Nova transição `activate`**: `PendingContract + documento assinado + signedAt → ActiveContract`.
4. **Invariante**: `Pendente` rejeita aditivos (alinha com R3, que hoje só cobre terminais).
5. **Atualizar o handbook** [`gestao-contratos.md`](../domain_questions/contratos/bounded-contexts/gestao-contratos.md) (l.27/35/48/67-72) — a máquina de estados oficial passa de 3 para 4 estados.

> ⚠️ Isto é trabalho de **domínio** (skill `ts-domain-modeler`), não de ACL/HTTP. O ciclo HTTP fica **bloqueado** até esta revisão entrar.

## 8. Encaminhamento

- [x] Abrir ADR de **revisão do ciclo de vida do `Contract`** → [ADR-0023](../architecture/adr/0023-contract-lifecycle-pending-state.md) (Accepted, 2026-05-27).
- [x] Atualizar handbook [`gestao-contratos.md`](../domain_questions/contratos/bounded-contexts/gestao-contratos.md) (máquina de estados 4 nós, RN-CV-01/02, evento `ContractActivated`) — feito 2026-05-27.
- [ ] Série de tickets de domínio: estado `PendingContract` + `create` dual + `activate` + invariante anti-aditivo em Pendente + persistência + CLI.
- [ ] **Só então** retomar o desenho da ACL/HTTP, agora com enum de 4 estados (`Pendente | Em Andamento | Finalizado | Distrato`).
