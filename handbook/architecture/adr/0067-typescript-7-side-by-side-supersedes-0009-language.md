[← Voltar para ADRs](./README.md)

# ADR-0067: TypeScript 7 nativo como compilador de tipos, com TS 6 retido **apenas** para o `typescript-eslint` — side-by-side por alias, e `@typescript/native-preview` sai (supersede parcial do ADR-0009, parte "Linguagem")

- **Status:** Proposed
- **Date:** 2026-08-25
- **Deciders:** Gabriel Aderaldo (Tech Lead) — decisão de levar o TS 7 na release `1.0.0` · agente assistente — medição e redação
- **Supersedes (parcial):** [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) — as seções **"Linguagem"** (`:32-34`) e **"Plano de migração TS 6.0 → 7.0"** (`:36-42`). **Tudo o mais no ADR-0009 permanece vigente**, inclusive a escolha de runtime, o `tsconfig` strict total desde o dia 1 e o "Estilo de código alinhado" (`:44-48`). A forma de fixar a versão do runtime já havia sido superseded pelo [ADR-0058](./0058-runtime-tracks-recommended-lts.md).
- **Conformidade com:** [ADR-0011](./0011-supply-chain-hardening.md) §5 (checklist de dependência nova) · [ADR-0029](./0029-pnpm-11-supply-chain-defaults.md) (quarentena e `trustPolicy`)
- **Origem:** [Inquiry-0023](../../inquiries/0023-typescript-7-native-spike.md) §5 e §6.1, `decided` em 2026-07-31

---

## Contexto

### O gatilho do ADR-0009 disparou

O ADR-0009 `:90-96` marcava: _"Quando TypeScript 7.0 estável for lançado (estimativa Q3/Q4 2026) […] ADR novo `supersedes` este."_ **O TypeScript 7.0 é GA desde 8 de julho de 2026**, e o registry serve `typescript@7.0.2`. O gatilho não é interpretação: é a condição literal que o próprio ADR-0009 escreveu.

### Duas previsões do ADR-0009 estavam erradas, e é preciso dizê-lo

O ADR-0009 `:41` previa que _"como port é estrutural, espera-se troca de comando + ajustes mínimos"_. **Não é o caso.** Medido em 2026-08-25 contra o registry:

| medição | resultado |
| :--- | :--- |
| `typescript-eslint@8.68.0` (`latest`, publicado hoje) — peer `typescript` | `">=4.8.4 **<6.1.0**"` |
| `typescript-eslint@8.68.1-alpha.3` (`canary`) — mesmo peer | `">=4.8.4 **<6.1.0**"` |
| Existe `typescript-eslint` v9 ou alpha de v9? | **não** — nenhuma publicada |
| Issue [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) (_Use TS 7 for type information_) | **OPEN**, sem movimento desde 2026-07-09 |

Não existe **nenhuma** versão do `typescript-eslint` que aceite TypeScript 7. Como o casing do repositório é enforced por `@typescript-eslint/naming-convention` (invariante do CLAUDE.md) e o `eslint.config.js` importa `typescript-eslint` diretamente, trocar o compilador de uma vez **desliga o lint tipado**. Daí o side-by-side — que é exatamente o que a Inquiry-0023 §5 concluiu em 31/07.

O ADR-0009 `:39` também exigia _"CI roda `tsc` e `tsgo --noEmit` em paralelo"_. Isso **nunca foi implementado** — nenhum workflow, script ou `package.json` invoca o `tsgo`. A exigência existiu no papel por quatro meses sem enforcement, e este ADR a resolve em vez de repeti-la (D6).

### O que já está pronto, e não por acaso

Nenhum dos breaking changes do TS 7 atinge este `tsconfig.json` — medido campo a campo:

| breaking do TS 7 | `tsconfig.json` do core-api |
| :--- | :--- |
| `target: es5` removido | `"target": "ES2024"` ✅ |
| `moduleResolution: node`/`node10` removidos | `"moduleResolution": "NodeNext"` ✅ |
| `baseUrl` descontinuado | **ausente** ✅ |
| `module: amd/umd/systemjs/none` removidos | `"module": "NodeNext"` ✅ |
| novo default `types: []` | `"types": ["node"]` — **explícito**, imune a mudança de default ✅ |
| novo default `strict: true` | `"strict": true` — explícito ✅ |

Isso é o ADR-0009 `:38` cobrando o seu preço a favor: _"`tsconfig.json` em modo strict total desde o dia 1 (minimiza incompatibilidades futuras)"_. Funcionou.

## Decisão

**D1 — O TypeScript 7 passa a ser o compilador de tipos do gate.** `pnpm run typecheck` roda o `tsc` do TS 7.

**D2 — O TypeScript 6 é retido exclusivamente como biblioteca do `typescript-eslint`**, não como compilador de ninguém. O mecanismo é alias de pacote, conforme Inquiry-0023 §6.1:

```jsonc
"devDependencies": {
  "typescript": "npm:@typescript/typescript6@^6.0.2",  // o que o typescript-eslint importa
  "@typescript/native": "npm:typescript@^7.0.2"        // o compilador de verdade
}
```

O nome `typescript` continua resolvendo para um TS 6 porque é esse o nome que o `typescript-eslint` importa; trocá-lo quebraria o peer sem que nada avisasse até o lint rodar.

**D3 — `@typescript/native-preview` é removido.** A Microsoft o descontinuou ao lançar o 7.0 estável, e o ADR-0009 `:67-69` o citava como "sinal positivo de proatividade" — condição que deixou de existir. Nenhum script do repositório o invoca hoje (medido), então a remoção não altera comportamento algum.

**D4 — O gate roda UM checker, não dois.** A exigência de paralelo do ADR-0009 `:39` fica **revogada**, não reafirmada, por três razões: (a) nunca foi implementada, então revogá-la não perde cobertura que exista; (b) sob side-by-side, o TS 6 não é mais um checker — é dependência interna do lint; (c) a paridade de diagnóstico medida na Inquiry-0023 §3.3 foi **9/9** nas probes, com as divergências documentadas e não silenciosas — exceto o caso de D5.

**D5 — O breaking semântico de template literal com emoji é risco DECLARADO.** Em `type ComEmoji = Chars<'a😀b'>`, o TS 6 conta **4** (unidades UTF-16, com surrogate pairs) e o TS 7 conta **3** (code points). O TS 6 emite `TS2322`; **o TS 7 compila limpo**. É o único caso conhecido em que o TS 7 muda o tipo inferido **sem erro** — e portanto o único que um gate verde não pegaria.

**Exposição medida hoje: nula.** O repositório não tem **nenhum** template literal type — nem declarado (`type X = \`…\``) nem com `infer` em posição de template. O risco é futuro, não presente, e o gatilho está em "Quando Re-avaliar".

**D6 — A instalação respeita a quarentena, sem exceção.** `typescript@7.0.2` foi publicado em `2026-08-25T08:53Z` e `typescript-eslint@8.68.0` em `2026-08-25T09:25Z`; com `minimumReleaseAge: 1440` e `minimumReleaseAgeStrict: true` (`pnpm-workspace.yaml:64-67`), nenhum dos dois é instalável antes de **2026-08-26**. A política **não se afrouxa para destravar install** — se algo travar, a saída é `minimumReleaseAgeExclude` por pacote, nunca baixar a guarda global (ADR-0029).

## Consequências

### Positivas

- Typecheck uma ordem de magnitude mais rápido — o `core-api` está na escala onde o ganho aparece (Inquiry-0023 §5).
- Sai uma dependência descontinuada do manifesto, e o repositório passa a usar o compilador que terá suporte nos próximos anos.
- O `1.0.0` nasce com a toolchain corrente, em vez de estrear já carregando um pacote que o fornecedor abandonou.

### Negativas — declaradas, não omitidas

- **O compilador que o lint consome sofre downgrade efetivo de `6.0.3` para `6.0.2`**: o alias `@typescript/typescript6` só foi publicado até `6.0.2` (`latest`), enquanto o repositório roda `typescript@6.0.3`. É downgrade de conteúdo, ainda que não de nome — a `trustPolicy: no-downgrade` não o barra, porque o pacote é outro. Fica registrado como custo consciente.
- **Duas cópias do compilador no `node_modules`**, com o custo de disco e de instalação correspondente.
- **O nome `typescript` passa a não significar o que aparenta.** Quem ler o manifesto sem este ADR concluirá que o projeto está em TS 6. É dívida de legibilidade aceita em troca do peer do `typescript-eslint` continuar satisfeito.
- Persiste a negativa do ADR-0009 `:63`: **TS 6 foi a última implementação em JS**, e libs presas a ela tendem a ficar para trás — agora com um caso concreto, o próprio `typescript-eslint`.

### Neutras

- `erasableSyntaxOnly` já está ligado no `tsconfig.json` e o repositório tem **zero** `enum`/`namespace` (medido), então a troca de compilador não esbarra no modo strip-only do Node.

## Alternativas rejeitadas

- **Trocar `typescript` para 7 e pronto** — desliga o lint tipado, incluindo o `@typescript-eslint/naming-convention` que o CLAUDE.md declara como enforcement de casing. Falha silenciosa até alguém rodar o lint.
- **Esperar a #10940 fechar** (prevista para o TS 7.1) — a issue está parada desde 09/07 e não tem data. Esperar mantém no manifesto um pacote que o fornecedor descontinuou, sem ganho.
- **Fixar `@typescript/native-preview` e seguir com ele** — é o que existe hoje; o pacote está descontinuado e as nightlies migraram para `typescript@next`.
- **Rodar os dois checkers no gate** (reafirmar o ADR-0009 `:39`) — custo de pipeline por uma cobertura que a paridade 9/9 não justifica, e que em quatro meses ninguém implementou.

## Quando Re-avaliar

- **Quando a [#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940) fechar** (prevista para TS 7.1): o alias colapsa, `typescript` volta a ser o 7 e o `@typescript/typescript6` sai. É a condição que encerra o side-by-side.
- **Se o repositório passar a usar template literal types** — aí o risco de D5 deixa de ser teórico, e é preciso decidir se o TS 6 volta ao gate como segundo checker.
- Quando o Node 26 LTS sair (outubro/2026) — gatilho do ADR-0058, não deste.
