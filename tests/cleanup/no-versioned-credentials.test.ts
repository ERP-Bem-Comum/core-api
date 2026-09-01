/**
 * NO-VERSIONED-CREDENTIALS — credencial não entra em arquivo versionado.
 *
 * Por que existe, e a data importa: um Bearer token vivo esteve em `.mcp.json` — arquivo
 * versionado, repositório **público** — de 08/06/2026 a 27/08/2026 (#883). Dois commits o
 * carregam e seguem legíveis: reescrever histórico não recupera segredo já distribuído, então o
 * preço de deixar entrar é permanente e só a rotação no emissor o encerra.
 *
 * O que faltava não era atenção de quem escreveu — era detector. Antes deste gate, `tests/cleanup/`
 * tinha 41 testes e `.semgrep/rules.yml` nenhuma regra sobre credencial: **nada no repositório
 * olhava para isso**. Regra que não bloqueia não vale, e aqui não havia nem a regra.
 *
 * ⚠️ PERGUNTA AO GIT QUAIS ARQUIVOS EXISTEM. A propriedade cobrada é "versionado" — uma pergunta
 * sobre o índice do git, não sobre o filesystem. Um `.env` real na máquina de quem desenvolve está
 * no disco, está gitignorado e **não é problema deste gate**: não sai daqui. Varrer o disco
 * reprovaria exatamente o arranjo correto.
 *
 * ⚠️ A MENSAGEM DE FALHA NÃO ECOA O VALOR. Este repositório é público e o log de CI dele também:
 * um assert que imprimisse o segredo transformaria o build no vazamento que o gate impede. Aponta
 * arquivo, linha e QUE detector mordeu; quem for corrigir abre o arquivo.
 *
 * ⚠️ DISTINGUE USO DE MENÇÃO — e aqui a distinção não é comentário-versus-código, é **valor
 * concreto versus placeholder**. O `handbook/` tem centenas de páginas de documentação de
 * terceiros mostrando `Authorization: Bearer <token>` e `"apiKey": "YOUR_API_KEY"`; um gate que
 * casasse a palavra reprovaria a doc inteira e seria desligado na primeira semana. O detector
 * procura a FORMA de um segredo real — ver `looksLikeSecret`, e as três recusas que ele acumulou
 * ao ser calibrado contra os 16 achados da primeira rodada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT } from '../support/source-scan.ts';

/**
 * Comprimento mínimo para ser suspeito. 20 fica acima de toda senha de exemplo curta (`hunter2`,
 * `changeme`) e abaixo de qualquer token real — JWT, opaco base64 e chave de provedor partem de ~32.
 */
const MIN_SECRET_LENGTH = 20;

/**
 * Caracteres DISTINTOS mínimos — entropia de pobre. Segredo real embaralha o alfabeto; placeholder
 * repete (`aaaaaaaa…`, `XXXXXXXX…`). Sem esta barra, uma régua de `====` num markdown vira achado.
 */
const MIN_DISTINCT_CHARS = 12;

/** Charset em que credencial é escrita: base64url, hex, e os separadores de JWT. */
const TOKEN_CHARSET = /^[A-Za-z0-9+/=._-]+$/;

/**
 * Palavras que denunciam exemplo. Inclui os próprios nomes de conceito (`token`, `secret`,
 * `password`, `key`): um valor que **se descreve** — `YOUR_SECRET_TOKEN` — é documentação, porque
 * nenhum emissor gera credencial que soletra o que ela é.
 */
const PLACEHOLDER_WORDS =
  /your|example|placeholder|redacted|changeme|change_me|dummy|fake|sample|xxx|todo|foo|bar|secret|password|passwd|token|apikey|api_key|here|value|insert|replace|abcdef|123456/i;

/** Marca de interpolação ou campo a preencher: `<token>`, `${VAR}`, `{{x}}`, `%s`. */
const INTERPOLATION = /[<>{}$%]/;

/** Nome de variável de ambiente gritado, não o valor dela: `AWS_SECRET_ACCESS_KEY`. */
const ENV_VAR_NAME = /^[A-Z][A-Z0-9_]*$/;

/**
 * Palavra legível delimitada por `-`, `_`, `.` ou borda.
 *
 * ⚠️ Esta é a recusa que a calibração exigiu, e sem ela o gate reprova onze arquivos de teste
 * legítimos. Fixture de infra nomeia o próprio propósito no valor — `migrate_database_url`,
 * `apppw-migration-test-only`, `isto-nao-e-um-pem-pkcs8` — e todos passavam nas outras barreiras:
 * têm mais de 20 caracteres, charset de token e variedade suficiente. O que os denuncia como
 * identificador é serem PRONUNCIÁVEIS: duas ou mais palavras separadas. Credencial gerada não tem
 * três letras minúsculas seguidas entre delimitadores, porque não foi escrita por gente.
 *
 * O preço: um segredo em forma de passphrase (`correct-horse-battery-staple`) escapa. É a troca
 * deliberada — gate que grita em fixture de teste é desligado, e gate desligado protege zero.
 */
const READABLE_WORD = /(?:^|[-_.])[a-z]{3,}(?=[-_.]|$)/g;

const looksLikeIdentifier = (value: string): boolean =>
  [...value.matchAll(READABLE_WORD)].length >= 2;

/**
 * O coração do gate: este valor tem a FORMA de um segredo real?
 *
 * As recusas estão na ordem do mais barato ao mais caro. Errar para o lado de deixar passar é
 * deliberado — ver a nota de `READABLE_WORD`.
 */
const looksLikeSecret = (value: string): boolean => {
  if (value.length < MIN_SECRET_LENGTH) return false;
  if (INTERPOLATION.test(value)) return false;
  if (ENV_VAR_NAME.test(value)) return false;
  if (PLACEHOLDER_WORDS.test(value)) return false;
  if (!TOKEN_CHARSET.test(value)) return false;
  if (looksLikeIdentifier(value)) return false;
  return new Set(value).size >= MIN_DISTINCT_CHARS;
};

type Detector = Readonly<{
  /** Nome que aparece na falha — diz ao humano o que procurar, sem citar o valor. */
  name: string;
  /** Casa a linha e CAPTURA o valor no grupo 1. */
  pattern: RegExp;
}>;

/**
 * Detectores de LINHA: a credencial e o campo que a carrega cabem na mesma linha. Todos capturam o
 * valor no grupo 1, porque em todos o veredito depende da forma dele.
 */
const LINE_DETECTORS: readonly Detector[] = [
  {
    name: 'header Authorization com credencial literal',
    pattern: /["']?[Aa]uthorization["']?\s*[:=]\s*["']?(?:Bearer|Basic|Token)\s+([^\s"',}]+)/g,
  },
  {
    name: 'campo de segredo com valor literal',
    pattern:
      /["']?(?:api[_-]?key|apikey|secret|password|passwd|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)["']?\s*[:=]\s*["']([^"']+)["']/gi,
  },
  {
    name: 'AWS access key id',
    // Formato inconfundível e sem uso legítimo versionado — mas `AKIAIOSFODNN7EXAMPLE` é a chave
    // que a própria AWS publica na documentação, então o valor ainda passa por `looksLikeSecret`.
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
  },
];

/** Cabeçalho de chave privada PEM, em qualquer das variantes (RSA, EC, OPENSSH, PKCS#8). */
const PEM_HEADER = /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/;

/**
 * Linha que é SÓ base64 longo — o corpo de uma chave real.
 *
 * ⚠️ A segunda recusa que a calibração exigiu. O header PEM sozinho não é segredo: `handbook/` o
 * exibe quatro vezes ensinando a configurar OAuth2 e `.npmrc`, sempre com o corpo elidido
 * (`\nXXXX\n`, `MIIEvgIBADANBg...`). Uma chave de verdade traz dezenas de linhas de base64 puro —
 * é a presença do CORPO, não do cabeçalho, que separa a chave do exemplo.
 */
const PEM_BODY_LINE = /^[A-Za-z0-9+/=]{40,}$/;

/** Extensões varridas: credencial vaza em configuração e em prosa, nunca em binário. */
const TEXT_EXTENSIONS = [
  '.json',
  '.jsonc',
  '.yml',
  '.yaml',
  '.toml',
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
  '.sh',
  '.bash',
  '.env',
  '.ini',
  '.conf',
  '.pem',
  '.key',
  '.md',
  '.txt',
  '.xml',
  '.properties',
] as const;

/**
 * Os arquivos que o git RASTREIA — a definição operacional de "vai para o repositório público".
 *
 * `-z` porque nome de arquivo pode conter espaço, e a saída padrão do git o escaparia com aspas,
 * produzindo um caminho que `readFileSync` não abre.
 */
const trackedFiles = (): readonly string[] =>
  execFileSync('git', ['ls-files', '-z'], { cwd: PROJECT_ROOT, encoding: 'utf-8' })
    .split('\0')
    .filter((f) => f !== '' && TEXT_EXTENSIONS.some((ext) => f.endsWith(ext)));

type Hit = Readonly<{ file: string; line: number; detector: string }>;

/**
 * O próprio gate fica de fora: ele escreve as FORMAS que vigia para provar que o detector morde, e
 * se auto-varresse reprovaria a si mesmo — a armadilha nº 6 de `source-scan.ts:9-14`.
 */
const SELF = 'tests/cleanup/no-versioned-credentials.test.ts';

const hitsIn = (relPath: string, content: string): readonly Hit[] => {
  const out: Hit[] = [];
  const lines = content.split('\n');
  // O corpo PEM é propriedade do ARQUIVO, não da linha: o cabeçalho e o base64 vivem em linhas
  // diferentes numa chave de verdade. Decidido uma vez, consultado a cada cabeçalho encontrado.
  const hasPemBody = lines.some((l) => PEM_BODY_LINE.test(l.trim()));

  lines.forEach((line, i) => {
    if (PEM_HEADER.test(line) && hasPemBody) {
      out.push({ file: relPath, line: i + 1, detector: 'chave privada PEM' });
    }
    for (const detector of LINE_DETECTORS) {
      // `lastIndex` é estado no regex global: sem zerar, a linha seguinte começa a busca de onde a
      // anterior parou e o gate passa a pular ocorrências em silêncio.
      detector.pattern.lastIndex = 0;
      for (const m of line.matchAll(detector.pattern)) {
        const value = m[1];
        if (value === undefined || !looksLikeSecret(value)) continue;
        out.push({ file: relPath, line: i + 1, detector: detector.name });
      }
    }
  });
  return out;
};

const scan = (): readonly Hit[] =>
  trackedFiles()
    .filter((f) => f !== SELF)
    .flatMap((f) => {
      // Arquivo rastreado pode não estar no disco durante rebase ou checkout parcial; ausência não
      // é achado.
      try {
        return hitsIn(f, readFileSync(join(PROJECT_ROOT, f), 'utf-8'));
      } catch {
        return [];
      }
    });

describe('NO-VERSIONED-CREDENTIALS — credencial não entra em arquivo versionado', () => {
  it('nenhum arquivo rastreado pelo git carrega credencial com forma de segredo real', () => {
    const hits = scan();
    assert.deepEqual(
      hits.map((h) => `${h.file}:${h.line} [${h.detector}]`),
      [],
      'Credencial em arquivo VERSIONADO, num repositório público.\n' +
        'Tire o valor do arquivo — `~/.secrets`, cofre sops/age ou variável de ambiente — e\n' +
        'ROTACIONE no emissor: apagar a linha não invalida o que já foi publicado, porque o\n' +
        'histórico permanece legível em todo clone e fork.\n' +
        'Locais (valor omitido de propósito):\n' +
        hits.map((h) => `  ${h.file}:${h.line} [${h.detector}]`).join('\n'),
    );
  });

  // Guarda contra verde por vacuidade: se `git ls-files` parar de responder — export sem `.git`,
  // filtro de extensão errado —, a varredura devolveria vazio e o gate aprovaria tudo calado.
  it('a varredura enxerga arquivos versionados (guarda contra verde vazio)', () => {
    const files = trackedFiles();
    assert.ok(
      files.length > 100,
      `a varredura devolveu ${files.length} arquivos — esperava centenas`,
    );
    assert.ok(
      files.includes('package.json'),
      'a varredura não encontrou o package.json — o filtro está errado',
    );
  });

  // O detector precisa MORDER a forma exata que motivou o gate: um Bearer opaco num JSON de
  // configuração. Sem esta prova, o verde acima não significa nada.
  it('acusa um Bearer opaco em JSON de configuração', () => {
    const sintetico =
      '{ "headers": { "Authorization": "Bearer q7SxK9vLmR2tW4yZ8bN3cF6hJ1dP5gA0eU" } }';
    assert.equal(
      hitsIn('sintetico.json', sintetico).length,
      1,
      'o detector deixou passar um Bearer com forma de segredo real',
    );
  });

  // PEM só conta COM corpo — é a diferença entre a chave e o exemplo do handbook.
  it('acusa PEM com corpo e ignora PEM elidido', () => {
    // 64 caracteres, a largura em que uma chave real quebra as linhas do corpo.
    const comCorpo = [
      '-----BEGIN RSA PRIVATE KEY-----',
      'MIIEowIBAAKCAQEAx7Kj9vQm2LpZ4NfR8sT1uW3yB6cD0eG5hJ2kL4mN7pQ9rS8t',
    ].join('\n');
    assert.equal(hitsIn('k.pem', comCorpo).length, 1, 'PEM com corpo real passou');
    assert.deepEqual(
      hitsIn('doc.md', 'key="-----BEGIN PRIVATE KEY-----\\nXXXX\\n-----END PRIVATE KEY-----"'),
      [],
      'PEM elidido de documentação foi acusado',
    );
  });

  // O outro lado, e o que decide se este gate sobrevive: documentação e fixture NÃO podem ser
  // reprovadas. Cada linha aqui é uma forma real que vive hoje no repositório.
  it('não acusa placeholder, interpolação, env var nem identificador de fixture', () => {
    const legitimas = [
      'Authorization: Bearer <your-token-here>',
      'Authorization: Bearer ${API_TOKEN}',
      'curl -H "Authorization: Bearer $TOKEN" https://api.example.com',
      '"apiKey": "YOUR_API_KEY"',
      '"password": "changeme"',
      'secret: "{{ vault_secret }}"',
      "const token = process.env['AUTH_TOKEN'];",
      // As quatro que a calibração acrescentou — fixtures reais deste repositório.
      "const SECRET = 'migrate_database_url';",
      "AUTH_JWT_PRIVATE_KEY: 'isto-nao-e-um-pem-pkcs8',",
      "password: 'apppw-migration-test-only',",
      "secret: 'contracts_sweeper_database_url',",
    ];
    for (const line of legitimas) {
      assert.deepEqual(hitsIn('doc.md', line), [], `falso positivo em: ${line}`);
    }
  });

  // As duas heurísticas que sustentam tudo, provadas isoladamente: elas são fáceis de quebrar num
  // refactor, e nada mais no gate perceberia.
  it('a heurística separa segredo de repetição e de identificador', () => {
    assert.ok(looksLikeSecret('q7SxK9vLmR2tW4yZ8bN3cF6hJ1dP5gA0eU'), 'reprovou um segredo real');
    assert.ok(!looksLikeSecret('a'.repeat(40)), 'aceitou repetição de um caractere só');
    assert.ok(!looksLikeSecret('short'), 'aceitou valor curto demais');
    assert.ok(looksLikeIdentifier('migrate_database_url'), 'não reconheceu um identificador');
    assert.ok(
      !looksLikeIdentifier('q7SxK9vLmR2tW4yZ8bN3cF6hJ1dP5gA0eU'),
      'segredo virou identificador',
    );
  });
});
