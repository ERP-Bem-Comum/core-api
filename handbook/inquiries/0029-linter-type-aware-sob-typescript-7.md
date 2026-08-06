---
inquiry: 0029
title: "Linter type-aware sob TypeScript 7 — oxlint/tsgolint · Biome · ESLint pinado"
state: open
opened: 2026-08-06
last_reviewed: 2026-08-06
open_outputs: 4  # migrar para issue — ver README §Saídas
---

[← Voltar ao Índice de Inquiries](./INDEX.md)

# Inquiry-0029: Linter type-aware sob TypeScript 7 — oxlint/tsgolint · Biome · ESLint pinado

- **Opened by:** Gabriel Aderaldo
- **Asked to:** IA externa (texto recebido) + verificação em fontes primárias + medição local
- **Impact:** [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) · `eslint.config.js` (342 linhas, 45 regras, 8 acopladas a ADR) · gate de qualidade
- **Continua:** [Inquiry-0023](./0023-typescript-7-native-spike.md) — **não a repete**

---

## 1. Contexto

A [Inquiry-0023](./0023-typescript-7-native-spike.md) (Decided, 2026-07-31) já **mediu** o TypeScript 7
neste repositório e já registrou a quebra do `typescript-eslint` (§3.7), sua causa-raiz (o pacote
`typescript@7` não expõe API programática) e a saída side-by-side com `tsc6` — concluindo que *"a adoção
não é 'trocar o compilador': é rodar dois, porque o `typescript-eslint` fica no TS 6"*.

**Esta inquiry não re-mede nada disso.** Ela responde a pergunta que a 0023 deixou aberta: **aceito viver
com o ESLint preso ao TS 6 até a API estável do 7.1, ou existe linter type-aware que já fale com o
compilador Go?**

O gatilho foi um texto externo recebido em 2026-08-06 apresentando três opções. Como todo insumo externo
neste handbook, ele foi **verificado antes de virar registro** — o mesmo tratamento dado ao EDD da P.O. na
[Inquiry-0028](./0028-edd-da-po-melhorias-m1-m4-e-relatorios-nibo.md).

---

## 2. Pergunta(s) feita(s)

```
[…] roda uma última anotação de inquiry […]
```

acompanhada do texto que apresenta **oxlint + oxlint-tsgolint**, **Biome v2** e **ESLint com compilador
pinado** como as três saídas para o bloqueio de lint type-aware sob TS 7.

Operacionalizada em: **(P1)** as alegações do texto procedem? **(P2)** qual delas serve a *este*
repositório, dado o que ele realmente usa?

---

## 3. Verificação das alegações externas

Fontes primárias consultadas em 2026-08-06.

| Alegação do texto | Verificação | |
| :--- | :--- | :-: |
| TS 7.0 chegou ao GA em **8 de julho de 2026**, port Go (Project Corsa) | Confirmado; RC em 18/06, GA em 08/07 | ✅ |
| O problema **não é desempenho** — é a ausência de API programática estável | Confirmado: o 7.0 não traz API; ela é esperada no **7.1** | ✅ |
| Issue pedindo suporte ao 7.0.2 aberta no dia do GA e **fechada como "not planned"** | Confirmado — [#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518), *closed as not planned* | ✅ |
| 7.1 "a vários meses de distância" | Estimativas públicas apontam **~outubro/2026** | ✅ |
| `tsgolint` roda regras type-aware sobre **typescript-go**, mirando TS 7 | Confirmado — arquitetura oxlint (Rust) + tsgolint (Go) | ✅ |
| Cobertura de **59 das 61** regras type-aware do typescript-eslint | Confirmado na documentação do Oxlint | ✅ |
| Biome v2 faz type-aware **sem o compilador TypeScript** | Confirmado — motor de inferência próprio | ✅ |
| `noFloatingPromises` pega **~75%** dos casos | **Desatualizado** — 75% era o número do lançamento (v2.0); na **v2.1 subiu para ~85%** | ⚠️ |
| Pacote de compatibilidade `@typescript/typescript6` com binário `tsc6` | Confirmado; publicado pela Microsoft para a transição | ✅ |

> **Veredito de P1: o texto procede em 8 de 9 pontos.** A única imprecisão é conservadora (subestima o
> Biome), e é o tipo de número que envelhece: foi medido no lançamento e melhorou depois.

**Um agravante que o texto omite:** o `typescript-eslint` publicado **recusa a instalação** ao lado de
`typescript@7` (ERESOLVE), porque o peer range só admite versões abaixo de 6.1.0. Não é "funciona mal" —
é conflito de resolução de dependência. Isso torna o side-by-side com alias de pacote (§4.3) não uma
preferência, e sim a única forma de ter os dois.

---

## 4. O dado local que decide

O texto encerra com uma ressalva genérica: *"se você depende de `eslint-plugin-import`, regras
customizadas da empresa ou plugins de framework, vale testar a cobertura antes de migrar"*. Medido neste
repositório, o perfil é **incomum e favorece a migração em um eixo, e a desfavorece em outro**:

| Medição em `eslint.config.js` (2026-08-06) | Valor | Leitura |
| :--- | :--- | :--- |
| Imports de plugin | **3** (`@eslint/js`, `eslint-config-prettier`, `typescript-eslint`) | **Favorece migrar** — não há ecossistema de plugins preso |
| Presets ativos | `strictTypeChecked` **+** `stylisticTypeChecked` | **Desfavorece** — são os dois presets mais completos |
| Regras customizadas | **45** | custo de porte real |
| Regras que citam ADR | **8** | **o ponto crítico** |
| Linhas | 342 | — |

A combinação é o achado: **o repositório não depende de plugins de terceiros (migração barata), mas
depende do preset type-aware mais agressivo que existe (perda cara).** A ressalva genérica do texto não se
aplica; o risco real está no outro eixo.

### 4.1 Por que as 8 regras acopladas a ADR mudam a natureza da decisão

O `eslint.config.js` não é só estilo — é **enforcement mecânico de decisão arquitetural**. Ele cita ADR em
8 pontos e usa `no-restricted-syntax` para banir `class` com a mensagem da regra do projeto, e
`no-restricted-imports` citando ADR-0011 §4.

Isso conecta esta inquiry à tese **T6b** da [Inquiry-0027](./0027-teses-orfas-de-branches-contaminadas.md)
(*"o harness verifica o código, mas não verifica a si mesmo"*), que classifica o `eslint.config.js` como um
dos **cinco mecanismos** que já traduzem decisão em verificação executável.

Consequência: trocar de linter aqui **não é trocar ferramenta de lint — é migrar parte do enforcement
arquitetural**. Qualquer regra que não sobreviva à migração vira norma-em-prosa outra vez, que é
exatamente o modo de falha que a T6b identificou.

### 4.2 O que a perda de cobertura significa em cada opção

- **oxlint + tsgolint:** 59/61 regras type-aware. Falta identificar **quais duas** e se alguma está entre
  as que este projeto usa — não é o mesmo perder uma regra que ninguém aciona e perder
  `strict-boolean-expressions`, que aparece duas vezes no config (`:136`, `:327`).
- **Biome:** ~85% de detecção no `noFloatingPromises`, com motor próprio. Aqui o risco é diferente e mais
  sutil: **falso-negativo silencioso**. Uma regra que pega 85% não avisa que passou dos 15% — o gate segue
  verde e a garantia é menor sem que nada sinalize.
- **ESLint pinado:** cobertura **100%** (é o mesmo linter), custo zero de migração, e o preço é ficar sem
  a velocidade do TS 7 no lint até o 7.1.

---

## 5. Alternativas avaliadas

| Alternativa | Prós | Contras | Veredito |
| :--- | :--- | :--- | :--- |
| **A — ESLint + `@typescript/typescript6` pinado** | cobertura integral; **zero** risco às 8 regras de ADR; caminho já validado na [0023](./0023-typescript-7-native-spike.md) §3.7; reversível | lint não herda a velocidade do TS 7; carrega dois compiladores até o 7.1 | ⏳ **Provisória recomendada** |
| **B — oxlint + tsgolint** | único que usa `typescript-go` de fato; 59/61 regras; alinhado ao alvo TS 7 | precisa portar 45 regras e provar as 8 de ADR; alpha em evolução | 🔬 **Candidata a spike** |
| **C — Biome v2** | imune ao ciclo de releases do TS; formatter no mesmo binário (substituiria Prettier) | inferência própria e parcial (~85%); **falso-negativo silencioso**; troca dois componentes de uma vez | ❌ **Não agora** |
| **D — não fazer nada** | — | o `typescript-eslint` **recusa instalar** com `typescript@7` (ERESOLVE): não é inércia, é impedimento | ❌ **Indisponível** |

**Racional da provisória A:** o gatilho da decisão é uma data externa (7.1, ~outubro/2026), não uma dor
interna. A [0023](./0023-typescript-7-native-spike.md) já mediu que o maior ganho disponível **não está no
lint nem no compilador** — está em parar de recriar o container de teste (~108s/bateria contra ~10× no
typecheck). Migrar o linter agora é pagar risco de enforcement por um ganho que não é o gargalo medido.

---

## 6. Decisão final

**PENDENTE.** Bloqueador: falta a medição que distingue B de A com fato em vez de preferência.

O experimento que decide, e é barato:

1. Levantar **quais** das 61 regras type-aware este repositório efetivamente aciona (via `--report-unused-disable-directives` e inventário do config).
2. Cruzar com as **59** que o tsgolint cobre → a interseção diz se a perda é nominal ou real.
3. Verificar se as **8 regras acopladas a ADR** têm equivalente em oxlint.
4. Só então comparar tempo de lint.

Sem o passo 3, trocar de linter é apostar o enforcement arquitetural numa métrica de velocidade.

---

## 7. Saídas (outputs concretos)

- [x] Verificação das 9 alegações do texto externo — 8 confirmadas, 1 desatualizada (Biome 75%→85%)
- [x] Agravante localizado: ERESOLVE impede coexistência `typescript-eslint` + `typescript@7`
- [x] Perfil local medido: 3 plugins · 2 presets completos · 45 regras · 8 acopladas a ADR
- [ ] Inventário das regras type-aware efetivamente acionadas
- [ ] Cruzamento com as 59 do tsgolint + checagem das 8 de ADR
- [ ] Decidir A (provisória) formalmente, com gatilho de reavaliação no **TS 7.1** (~out/2026)
- [ ] Alimentar o **ADR novo que supersedes o ADR-0009** — cujo gatilho a [0023](./0023-typescript-7-native-spike.md) §4.1 já declarou disparado; esta inquiry acrescenta a dimensão de *tooling*

---

## 8. Referências

- [Inquiry-0023](./0023-typescript-7-native-spike.md) §3.7, §3.8, §5 — medição do TS 7 e da quebra do `typescript-eslint` (**não repetida aqui**).
- [Inquiry-0027](./0027-teses-orfas-de-branches-contaminadas.md) T6b — o `eslint.config.js` como um dos 5 mecanismos de enforcement executável.
- [ADR-0009](../architecture/adr/0009-node-24-typescript-6-with-7-roadmap.md) — Node 24 + TS 6, com gatilho de reavaliação já disparado.
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — Microsoft.
- [typescript-eslint #12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518) — *closed as not planned*.
- [Type-Aware Linting | Oxlint](https://oxc.rs/docs/guide/usage/linter/type-aware.html) e [oxc-project/tsgolint](https://github.com/oxc-project/tsgolint) — 59/61 regras.
- [Biome v2 — Biotype](https://biomejs.dev/blog/biome-v2/) e [Exploring the Limits of Type Inference in Biome v2](https://zenn.dev/uhyo/articles/biome-v2-type-inference?locale=en) — inferência própria e seus limites.
- Estado local: `package.json` (`typescript@^6.0.0`, `typescript-eslint@^8.59.3`, `@typescript/native-preview@7.0.0-dev.20260515.1`), `eslint.config.js:46-52`.
