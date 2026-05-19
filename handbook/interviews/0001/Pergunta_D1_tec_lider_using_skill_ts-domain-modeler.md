---
entrevista: 0001
bloco: D
pergunta: D1
título: "Strings literais vs tagged errors com payload"
skill: ts-domain-modeler
status: respondida
---

# Pergunta_D1_tec_lider_using_skill_ts-domain-modeler

> **Status:** respondida ✅
> **Origem:** entrevista 0001
> **Skill canônica:** `ts-domain-modeler`

---

## Q (host) — versão formal

```ts
export type ContractError =
  | 'contract-not-active'
  | 'contract-cannot-expire-yet'
  | 'contract-amendment-already-applied'
  | …;
```

Vantagens: barato, serializável, comparável por `===`, narrowing automático.
Custo: erro sem payload (`currentEnd` do contrato quando rejeitei `expire`?), não compõe entre agregados.

- Manter string literal ou migrar para **tagged errors** com payload?
- Se tagged, como evitar reinventar `extends Error` com classe?
- Separar erros de invariante de erros de validação com tipos distintos?

## Q (host) — versão narrativa (para colar em chat externo)

Cara, deixa eu te contar de onde vem essa pergunta antes de fazer ela — vai ajudar a calibrar a resposta.

Semana passada a P.O. me chamou: ela tentou encerrar o contrato 042/2026 pela CLI e levou um erro `'contract-cannot-expire-yet'`. Aí veio a pergunta óbvia dela: **"então quando ele pode encerrar?"**. Fui ler o código e percebi que o erro é literalmente a string `'contract-cannot-expire-yet'` — não carrega o `currentPeriod.end` do contrato, não carrega o `at` que ela tentou. A CLI não tinha como formatar "ele pode encerrar a partir de 31/12/2026" sem ir buscar o contrato de novo. A gente colocou um `if (e === 'contract-cannot-expire-yet') { refetch… }` no formatter. Funciona, mas:

1. O refetch cheira mal — a informação **estava na mão** quando a regra rejeitou.
2. Se eu mudar o predicado (buffer de 7 dias após o fim, por exemplo), a CLI continua mostrando `currentEnd` em vez de `currentEnd + 7d`. A mensagem mente sem ninguém perceber.
3. Não escala — toda nova regra com contexto relevante vai querer um caso especial no formatter.

Aí olho pra essa lista venerada de string literals (`'contract-not-active'`, `'amendment-without-signed-document'`, `'contract-amendment-already-applied'`, …) e começo a desconfiar que ela é mais um **vestígio de "eu queria evitar `extends Error` a qualquer custo"** do que uma escolha deliberada. Tô tentado a virar tudo `{ tag: 'ContractCannotExpireYet', currentEnd, attemptedAt }` — mas hesito por três motivos:

**Primeiro:** Uncle Bob e Wlaschin batem na mesma tecla — classe-de-erro é anti-pattern. Eu tô só renomeando isso? Tagged record é "classe sem `extends`" e cai na mesma armadilha, ou tem diferença categorial?

**Segundo:** hoje meu use case devolve `Result<…, ContractError | AmendmentError | RepositoryError>`. Com strings, sopa achatada de ~40 strings. Migrando pra tagged, união de ~40 records com `tag` discriminante. O `switch (e.tag)` no formatter fica trivial, mas **ganho narrowing e perco simplicidade visual**. Tem ponto-ótimo, ou falsa dicotomia?

**Terceiro:** eu tinha na cabeça uma distinção intuitiva entre **erro de input** (campo obrigatório, formato CPF) e **erro de invariante** (contrato encerrado). Com Zod na borda, a primeira categoria some. Mas existe uma **terceira categoria** que merece tipo próprio — "erro semântico" — ou tô inventando distinção?

## R (PhD)

Migração para **tagged records** está correta e 100% aderente à modelagem funcional.

### (i) Tagged records ≠ classes disfarçadas

Diferença categorial fundamental. Aversão de Uncle Bob/Wlaschin a classes está ligada a encapsulamento de comportamento com estado + herança implícita. Tagged record é **Choice Type** construído pelo operador "OR" — pacote de dados imutável, sem métodos, sem estado escondido, sem hierarquia. Apenas conta um "fato" que ocorreu no domínio para que o shell imperativo (CLI) possa agir.

Regra de ouro do Wlaschin: **"Use the power of a composable type system: Choices rather than inheritance."**

### (ii) "Sopa" de 40 records vs 40 strings — falsa dicotomia

Simplicidade visual das strings era **falsa economia**: menos código escrito, mas contexto crítico perdido. Em TS, transformar em Discriminated Union é padrão-ouro — narrowing no `switch (e.tag)` + **Exhaustiveness Checking** via `never` força o formatter a tratar todas variantes.

**Ponto-ótimo:** não existe `DomainError` único com 40 variantes. Cada Use Case retorna apenas os erros que **ele** pode disparar. `ExpireContractUseCase` devolve `ContractCannotExpireYet | ContractNotActive | ContractNotFound` — três, não quarenta.

### (iii) Existe terceira categoria — é a única que sobra no domínio

Após Zod na borda:

| Categoria | Onde vive | Exemplo |
| :--- | :--- | :--- |
| Erro de input/forma | Borda (Zod) — morre antes do domínio | "campo obrigatório", "CPF inválido" |
| Erro semântico / regra de negócio | Domínio — Choice Type rico | "contrato encerrado", "encerramento antes da data" |

Alexis King: *"The set of remaining failure modes during execution is minimal by comparison, and they can be handled with the tender care they require."*

Esse "tender care" é a categoria que o host pressentiu. **Não são bugs — são resultados de negócio válidos e esperados.**

## Rules emergentes

- **DO:** Tagged records `{ tag: …, …payload }` para erros do domínio com contexto.
- **DO:** Cada Use Case devolve **apenas o subconjunto de erros que ele pode emitir** — não `DomainError` unificado.
- **DO:** Erros do domínio modelam resultado de negócio (tender care), não bug.
- **DON'T:** String literal quando o domínio tem contexto relevante para carregar.
- **DON'T:** Refetch no formatter para recuperar contexto que estava na mão quando a regra rejeitou.

## Cross-refs

- [D3+D4](./Pergunta_D3_D4_tec_lider_using_skill_ts-domain-modeler.md) (forma canônica + naming).
- [D5](./Pergunta_D5_tec_lider_using_skill_ts-domain-modeler.md) (invariantes contextuais).
