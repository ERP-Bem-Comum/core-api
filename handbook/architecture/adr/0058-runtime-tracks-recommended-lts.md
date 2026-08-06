[← Voltar para ADRs](./README.md)

# ADR-0058: O runtime acompanha o LTS recomendado — critério em vez de versão fixa

- **Status:** Accepted (`supersedes` parcialmente [ADR-0002](./0002-keep-nodejs-runtime.md) e [ADR-0009](./0009-node-24-typescript-6-with-7-roadmap.md) — apenas a FORMA de fixar versão, não a escolha de runtime nem de linguagem)
- **Date:** 2026-08-05
- **Deciders:** Gabriel (dono do repo — decisão declarada no gate humano da Fase 1 da spec 040)
- **Contexto de origem:** inventário de decisões em [`context/decisions/`](../../../context/decisions/), alegações `ADR-0002-C2` e `ADR-0009-C5`

## Contexto

Duas alegações deste acervo foram para o inventário com veredito `contradicted`, e **as duas pela mesma causa**:

| Alegação | O que o ADR fixou | Por que contradiz |
| --- | --- | --- |
| `ADR-0002-C2` | "A versão do runtime é Node.js 20 LTS" | `engines.node` é `>=24.0.0`. O Node 20 entrou em EOL em abril/2026 |
| `ADR-0009-C5` | "Migração completa para 7.0 (…) espera-se troca de comando e **ajustes mínimos**" | A [Inquiry-0023](../../inquiries/0023-typescript-7-native-spike.md) mediu e registrou a premissa como **REFUTADA**: `typescript-eslint` não importa sob TS 7 e nenhuma regra roda |

Nenhuma das duas foi erro de julgamento. Em 2026-04 o Node 20 **era** o LTS, e "ajustes mínimos" era estimativa razoável. O defeito é de **forma**: um ADR que fixa uma versão, ou que estima esforço futuro, produz uma afirmação que **envelhece sozinha** — sem ninguém errar, sem nada acontecer, só pelo tempo passar. ADR é imutável por desenho, então a afirmação envelhecida fica lá, e quem lê o documento isolado age sobre ela.

O acervo já mostra o custo: são 2 das 21 contradições entre ADR e código, e as duas se resolveram por descarte. Descartar funciona, mas só depois de alguém varrer o acervo inteiro e notar — foi o que a spec 040 precisou fazer.

## Decisão

### 1. O runtime acompanha o LTS recomendado — invariante

A versão do runtime **MUST** acompanhar o **LTS recomendado** (a linha `Active LTS` do Node.js), por atualização **GRADUAL**. "Gradual" quer dizer que a subida é ato deliberado, verificável em diff, com o gate verde antes e depois — nunca salto de major arrastado por dependência.

### 2. Nenhum ADR fixa a versão corrente — invariante

A versão corrente **MUST NOT** viver em ADR. Ela vive onde é **verificável e executável**:

| Onde | O que declara |
| --- | --- |
| `package.json` → `engines.node` | o piso aceito |
| `Dockerfile` → `FROM node:<versão>` | a versão que roda em produção, pinada por digest |
| `.github/workflows/*.yml` → `node-version` | a versão que o CI usa |

Este ADR **deliberadamente não escreve a versão-alvo no próprio texto**. Escrevê-la aqui repetiria o defeito que ele corrige — e é por isso que a §1 fixa o critério, não o número.

> **Observação, não norma:** na data desta decisão o alvo declarado é a linha 24.x, e os três lugares acima divergem entre si (`>=24.0.0`, `node:24.15`, `node-version: '24'`). Essa divergência é exatamente o que a §4 existe para tornar visível.

### 3. Troca de tecnologia se justifica por inquiry — invariante

Trocar runtime, linguagem, compilador ou qualquer tecnologia estrutural **MUST** ser justificado por uma **inquiry** em [`handbook/inquiries/`](../../inquiries/) que **meça** a alternativa, não que a argumente. A inquiry precede o ADR; o ADR registra o veredito.

O precedente é a Inquiry-0023: mediu Node 24/26, Deno, Bun e `tsgo` num harness executável, refutou uma premissa que estava num ADR aceito e chegou a um veredito. **Medir mudou a conclusão** — é o que distingue inquiry de opinião.

### 4. A concordância entre os pontos de declaração é cobrada — invariante

Os lugares que declaram a versão do runtime **MUST** concordar entre si, cobrado por gate. O molde já existe: `tests/cleanup/supply-chain-settings.test.ts` faz exatamente isso para o pnpm, exigindo que `packageManager`, `engines.pnpm` e `ENV PNPM_VERSION` concordem.

**O que NÃO é cobrado mecanicamente, e por quê:** "acompanha o LTS recomendado" depende de consultar a rede, e o gate local (`pnpm test`) é offline e determinístico por desenho — mesma razão pela qual `pnpm audit` vive no CI e não no gate. Verificar a linha LTS é trabalho de CI agendado, não de teste local.

## Consequências

### Positivas

- **A afirmação para de envelhecer sozinha.** Critério não tem data de validade; versão tem. Este ADR continua verdadeiro quando o Node 26 for LTS, sem ninguém tocá-lo.
- **A versão passa a viver onde é executável.** `engines.node`, `Dockerfile` e CI são lidos por máquina e falham quando divergem — um parágrafo em `.md` não.
- **A divergência atual fica visível.** O gate da §4 acusa o que hoje ninguém vê: três lugares declarando versões diferentes da mesma coisa.
- **A regra de troca de tecnologia ganha instrumento nomeado.** "Justificar por inquiry" transforma uma disposição em procedimento com endereço.

### Negativas, declaradas

1. **A §1 não é mecanizável offline.** O gate cobra a concordância interna, não a aderência ao LTS externo. Um repositório inteiro coerente numa versão EOL passa em todos os gates. A mitigação é CI agendado, e ela **ainda não existe** — ver gatilho.
2. **"Gradual" é qualitativo.** A palavra exclui o salto arrastado por dependência, mas não fixa cadência. Fixar cadência ("toda LTS em até N meses") seria reintroduzir número que envelhece.
3. **Este ADR restringe a forma de escrever ADRs futuros** (§2), o que é incomum — a maioria decide sobre o sistema, não sobre o próprio registro. É deliberado: a causa das duas contradições era de forma.

### Neutras

- A escolha de **Node como runtime** (ADR-0002) e de **TypeScript 6** (ADR-0009) permanece integralmente vigente. Este ADR não a reabre; muda apenas como a VERSÃO é fixada.
- A §2 é enunciada para runtime, mas o raciocínio vale para qualquer versão fixada em ADR. **Generalizar é candidato a ADR próprio**, não a esta decisão — o inventário é que dirá se o padrão se repete em outros pontos do acervo.

## Alternativas Consideradas

### A. Escrever um ADR novo a cada subida de versão

Rejeitada. É o que o acervo já fazia — o ADR-0009 nasceu **um dia** depois do ADR-0002 para trocar "20" por "24". O custo é um ADR por bump e, pior, cada um deixa para trás um documento imutável com uma versão morta escrita nele. O acervo cresce e a confiabilidade cai.

### B. Fixar a versão-alvo neste ADR ("Node 24.19")

Rejeitada, e é a alternativa mais tentadora porque parece mais concreta. Seria **exatamente** o defeito que este ADR corrige: em 12 meses `ADR-0058-C2` estaria no inventário com veredito `contradicted`, ao lado das duas que o originaram.

### C. Fixar cadência ("adotar toda LTS em até 6 meses")

Rejeitada. Reintroduz número que envelhece, e um número que o repositório não controla — a cadência de release do Node não é decisão nossa. "Gradual e deliberado" é o que se pode cumprir e verificar em diff.

### D. Não escrever ADR e deixar a política na rule de supply-chain

Rejeitada. `.claude/rules/` é regra operacional por camada, carregada por path; não carrega **ratio legis**. A razão desta decisão — "ADR fixa critério, não versão" — é o conteúdo mais valioso dela, e é o tipo de coisa que só sobrevive em ADR. A rule pode referenciar; não substituir.

## Gatilho de reavaliação

Este ADR **MUST** ser reaberto por um ADR que o supersede se **qualquer uma** destas ocorrer:

1. O gate da §4 for implementado e provar-se insuficiente — por exemplo, se a concordância interna passar verde com o repositório numa linha EOL por mais de um ciclo de release.
2. O projeto adotar um runtime cujo modelo de release **não** tenha linha LTS, tornando o critério da §1 inaplicável.
3. A §2 se mostrar excessiva — isto é, se surgir caso legítimo em que a versão precise estar no ADR para a decisão fazer sentido.

**Pendência declarada:** o CI agendado que verifica aderência ao LTS recomendado (mitigação da Negativa 1) **não existe**. Enquanto não existir, a §1 vale por disciplina — e este ADR registra isso em vez de fingir cobertura.
