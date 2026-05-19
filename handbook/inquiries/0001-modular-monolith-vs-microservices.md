# Inquiry-0001: Granularidade de serviço — Modular Monolith vs. Microservices

- **Status:** Decided
- **Opened:** 2026-04-27
- **Closed/Decided:** 2026-04-27
- **Opened by:** Gabriel Aderaldo
- **Asked to:** IA externa de pesquisa (literatura arquitetural) + análise interna do handbook
- **Impact:** [ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md)

---

## 1. Contexto

Após fechar a Strangler Fig (ADR-0001) e os schemas isolados (ADR-0003), restava a pergunta: **os 4 BCs do handbook devem viver em quantos serviços deployáveis?**

O time é pequeno, sem SRE dedicado. Tenho trauma honesto de monorepos pesados (Lerna, Nx mal configurado) e resistência a microserviços prematuros.

---

## 2. Pergunta(s) feita(s)

> "Os 4 Bounded Contexts (Documentos, Títulos, Bradesco, OCR) devem viver em quantos serviços deployáveis?"

Espectro analisado: 1 serviço (Modular Monolith) → 4+ serviços (microservices proper).

Pesquisa solicitada à IA externa cobrir literatura: Newman, Richardson, Richards/Ford, Vernon, Brown, Fowler, Nygard, Skelton/Pais, Forsgren.

---

## 3. Respostas / Investigação

### 2026-04-27 — Primeira resposta da IA externa
Recomendou **Modular Monolith (Opção 1)** como início, com Opção 2 (3 serviços, isolando OCR e Banco) como fallback condicionado a requisitos operacionais não declarados.

**Erros identificados na primeira resposta:**
- Inventou "time pequeno (<10 devs)" e "centenas de docs/mês" — números não estavam no handbook.
- Afirmou atomicidade ACID entre `DocumentoSelado` e `GerarTitulos` que o handbook NÃO exige (usa "dispara"/"gatilha", vocabulário canônico de evento de domínio).
- Não citou os invariantes que de fato pesam: R3 Sincronia (`domain/04` l.56) e R3 Reabertura (`domain/09` l.132).

### 2026-04-27 — Confronto + segunda resposta
Após confronto estruturado (ver [`drafts/`](.) hipotético), a IA reconheceu os 3 erros e refinou a recomendação:

- **Recomendação reforçada:** Modular Monolith.
- **Argumentos atualizados ancorados em invariantes do handbook:**
  - R3 Sincronia: transmitir título exige ler documento → in-process query gratuita em monolith.
  - R3 Reabertura: reabrir documento exige checar todos os títulos filhos → in-process command/query.
  - Time Travel cross-BC desde OCR até baixa final → commit atômico.

---

## 4. Análise interna

### Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| Microservices proper (4 serviços) | Escala assimétrica, deploy independente | R3 cross-BC vira saga, custo operacional 4× | ❌ Rejeitada |
| Macro-serviços (Doc+Tit + Banco/OCR) | Isola integrações instáveis | Não há sinal operacional que justifique | ❌ Rejeitada nesta fase |
| Modular Monolith | Invariantes respeitados, simplicidade, evolução barata | SPOF lógico, escala uniforme | ✅ Escolhida |

### Invariantes cross-BC identificados

| Invariante | Localização | Implicação |
| :--- | :--- | :--- |
| R3 Sincronia | `domain/04` l.56 | Cross-read Títulos → Documentos |
| R3 Reabertura | `domain/09` l.132 | Cross-read+write Documentos → Títulos |
| R8 Integridade Imposto | `domain/04` l.61 | Herança Documentos → Títulos |
| Auditoria Shared Kernel | `domain/02` l.53 | Modelo obrigatoriamente compartilhado |
| Time Travel cross-BC | `domain/08` l.94 | Trace único OCR → baixa |

---

## 5. Decisão final

**Modular Monolith no `core-api`** com os 4 BCs como módulos internos em `apps/core-api/src/contexts/`.

**3 deployables durante migração:** `bff-gateway` + `legacy-api` + `core-api`.
**2 deployables após desligamento do legado:** `bff-gateway` + `core-api`.

---

## 6. Saídas

- [x] [ADR-0006](../architecture/adr/0006-modular-monolith-core-api.md) criado.
- [x] CHANGELOG atualizado.
- [x] handbook/README.md atualizado.

---

## 7. Referências

- ADR-0001, ADR-0003, ADR-0004, ADR-0005 (premissas).
- Vernon — *Strategic Monoliths and Microservices*.
- Newman — *Building Microservices*, cap. "When NOT to Use Microservices".
- Richards & Ford — *Software Architecture: The Hard Parts*.
