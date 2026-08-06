# W2 REPROVADO — CNPJ alfanumérico no reader de PDF (2026-08-04)

Parecer da wave W2 (`/w2-review`, agente `w2-reviewer` em contexto isolado) sobre a tentativa de
fazer o `structureText` extrair CNPJ alfanumérico (ADR-0044).

**Veredito: REPROVADO.** A mudança resolve o que se propôs e **introduz uma regressão** em CPF.

Diff revisado: `src/modules/financial/adapters/document-reader/native-pdf.ts` (+19/−4) e
`tests/modules/financial/adapters/document-reader/danfse-cnpj-alphanumeric.test.ts` (novo).

---

## O achado

A captura foi alargada de `[\d.\-/\s]` para `[0-9A-Za-z.\-/\s]`, mas o ramo numérico legado de
`normalizeTaxId` continua derivando `digits` do **mesmo `raw`, agora mais largo**:

```ts
const digits = raw.replace(/\D/g, '');
if (digits.length >= 14) return digits.slice(0, 14);
```

Quando o emitente é **pessoa física**, o checksum de CNPJ recusa (correto) e a execução cai nesse
ramo. Só que `raw` agora atravessou as letras vizinhas e trouxe os dígitos que vêm **depois**
delas — os 11 dígitos do CPF viram 14 caracteres inventados.

### Reprodução confirmada nesta base

Entrada (bloco DANFSe; o rótulo `CNPJ / CPF / NIF` existe justamente porque admite CPF):

```
EMITENTE DA NFS-e
Prestador do Serviço CNPJ / CPF / NIF 52998224725 IM 0012345 Telefone
TOMADOR DO SERVIÇO CNPJ / CPF / NIF 35.400.736/0001-31
```

| Cenário | HEAD | working tree |
| --- | --- | --- |
| CPF + Inscrição Municipal | `52998224725` ✅ | **`52998224725001`** ❌ |
| CPF puro | `52998224725` ✅ | `52998224725` ✅ |
| CNPJ alfanumérico | `undefined` ❌ | `12ABC34501DE35` ✅ |

O `001` vem do número da inscrição municipal.

## Por que é pior que o bug que se queria corrigir

O valor corrompido tem **comprimento plausível** (14) e segue por dois caminhos sem erro:

- `ingest-document.ts:84` → `resolveSupplierByCnpj` → não casa parceiro algum, `supplierRef` fica
  vazio **em silêncio**. É exatamente a falha que o #566 existia para eliminar.
- `dto.ts:323` → `supplierTaxId` volta ao front no parse-only (#580) e **auto-preenche o formulário
  com um documento corrompido**.

Viola `.claude/rules/adapters.md`: _"a cascata termina em **erro explícito**, nunca em valor errado
silencioso"_ (ADR-0050). `undefined` seria melhor que isto.

## Por que a suíte ficou verde

A fixture real (`danfse-fortaleza.txt`) traz `Inscrição` logo após o identificador, e o **`ç` não
entra na classe de caracteres nova** — a captura para em `Inscri`, sem dígitos. A imunidade é
**ortográfica, não de desenho**: bastaria a fixture dizer `IM` ou `Insc.` para o teste falhar.

O docstring do teste novo declarava o buraco: _"Regressões (#566 com quebra, **CPF numérico**,
comprimento canônico) entram no ciclo seguinte."_ O caso que falharia foi conscientemente adiado —
e era o que reprovava a mudança.

## O que o parecer aprovou

- `Cnpj.isValidCnpj` no adapter: consumo correto do VO do kernel, no estilo `import * as Cnpj`.
- Regex de `CPF:` mantido numérico — CPF não é alfanumérico.
- Caminho alfanumérico feliz (mascarado, sem máscara, com quebra de linha): `12ABC34501DE35` sai
  íntegro, e o HEAD devolvia `undefined`.
- Teste no mirror correto, sufixo `.test.ts` — conforme `.claude/rules/testing.md`.

---

## Para o próximo W0

O teste que faltava, e que deve nascer vermelho:

> Documento cujo emitente é **pessoa física** (CPF de 11 dígitos) seguido de texto com dígitos
> (`IM 0012345`, `Inscrição Estadual 123`, nome com número) devolve o **CPF íntegro**, nunca um
> identificador de 14 caracteres montado com dígitos do texto vizinho.

Casos mínimos: `CPF + IM`, `CPF + Inscrição Estadual`, `CPF + nome com número`, e o controle de que
o CNPJ alfanumérico continua saindo íntegro.

**Causa a atacar:** o ramo legado precisa de um `raw` restrito ao que ele mesmo entende (dígitos e
máscara), não do `raw` alargado que a captura de CNPJ passou a produzir. Alargar a captura sem
estreitar o consumidor foi o erro.

## Lição de método

O comentário que eu havia escrito em `native-pdf.ts:233-237` **nomeava este risco com precisão** —
"aceitar letras na captura faz o regex alcançar o texto vizinho… um CPF seguido de palavra
produziria 14 caracteres errados" — e concluía que o checksum resolvia. O checksum resolve o ramo
**novo**; o CPF cai no ramo **legado**, que ficou sem tratamento.

Escrever o risco no comentário criou a sensação de tê-lo tratado. A revisão em contexto isolado é o
que separou as duas coisas: quem leu o diff sem o meu raciocínio junto viu que a frase seguinte —
_"o caminho numérico legado também preserva o comportamento"_ — não se sustenta, porque ele
preservou o **código**, não o comportamento: a **entrada** dele mudou.
