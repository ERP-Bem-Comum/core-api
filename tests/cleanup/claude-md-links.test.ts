/**
 * CLAUDE-MD-LINKS — todo caminho que a doc canônica de agente cita existe.
 *
 * O `CLAUDE.md` é o único documento que carrega em TODA sessão. Um link para caminho inexistente ali
 * é a forma mais barata de fazer um agente procurar no lugar errado — e o histórico deste repositório
 * mostra que acontece: o `AGENTS.md` que este arquivo substituiu citava
 * `.claude/output-styles/erp-contracts.md` e `handbook/domain/`, nenhum dos dois existente.
 *
 * A própria PROPOSTA de substituição (`context/CLAUDE-md-proposta.md`) nasceu com três caminhos
 * mortos — `.claude/runbooks/claude-code-cheatsheet.md` (o real é `context/runbooks/`),
 * `context/playbooks/` e `handbook/domain/`. Trocar um documento não-verificado por outro
 * não-verificado só reinicia o relógio; este gate é o que impede a reincidência.
 *
 * ESCOPO — o `CLAUDE.md` **e** as `.claude/rules/*.md` (issue #641). As rules ficaram de fora até
 * 2026-08-06 e o custo apareceu no mesmo dia, duas vezes: a `contracts-module.md` citava
 * `handbook/domain/`, morto havia tempo, e um link de ADR escrito com o nome de arquivo errado passou
 * verde no gate. Nos dois casos o erro só foi pego por conferência manual, link a link. Rule é doc
 * canônica pelo mesmo motivo que o `CLAUDE.md` é: carrega sozinha por `paths:` e instrui a edição —
 * o ADR-0057 §3 institui a verificação de caminho como invariante da doc canônica, e a rule é dela.
 *
 * ⚠️ O NOME deste arquivo é normativo e não deve mudar: o ADR-0057 `:47` o cita literalmente, e ADR
 * aceito é imutável. Ampliar o escopo mantendo o nome preserva a referência.
 *
 * Escopo de sintaxe: links markdown relativos — `[texto](./caminho)` e `[texto](../caminho)`,
 * resolvidos a partir do diretório do arquivo QUE CITA (uma rule usa `../../handbook/…`). URLs e
 * âncoras puras (`#secao`) ficam de fora; a âncora é validada pelo leitor, não pelo filesystem.
 *
 * ⚠️ A pergunta é "existe no REPOSITÓRIO", não "existe neste disco". A primeira versão usava
 * `existsSync` e passava na minha máquina enquanto falhava no CI: o `CLAUDE.md` cita
 * `handbook/guidelines/`, que está no `.gitignore` (PDFs Bradesco, restrição de redistribuição) e
 * portanto NÃO chega num clone limpo. Material local-only citado de propósito não é link morto — o
 * próprio `CLAUDE.md` explica que ele não é versionado. Link morto é caminho que não está no
 * repositório NEM foi deliberadamente excluído dele.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, globSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

const posix = (p: string): string => p.split(sep).join('/');

/** Documentos que instruem o agente e, por isso, não podem apontar para o vazio. */
const SOURCES = (): readonly string[] =>
  ['CLAUDE.md', ...globSync('.claude/rules/*.md', { cwd: PROJECT_ROOT }).map(posix)].sort();

// `[texto](./x)` ou `[texto](../x)`. O `[^)\s#]+` para no `#`, então `arquivo.md#secao` é verificado
// como `arquivo.md` — o arquivo tem de existir, a âncora dentro dele não é problema do filesystem.
const RELATIVE_LINK = /\]\((\.{1,2}\/[^)\s#]+)/g;

/** Função pura: os alvos relativos citados num conteúdo markdown. */
const extractLinks = (content: string): readonly string[] => {
  const out = new Set<string>();
  for (const m of content.matchAll(RELATIVE_LINK)) {
    const raw = m[1];
    if (raw !== undefined) out.add(decodeURIComponent(raw));
  }
  return [...out].sort();
};

/** Alvo do link resolvido a partir do diretório de QUEM CITA, devolvido relativo ao root. */
const resolveFromSource = (sourceRel: string, linkRel: string): string =>
  posix(relative(PROJECT_ROOT, resolve(PROJECT_ROOT, dirname(sourceRel), linkRel)));

const git = (args: readonly string[]): string =>
  execFileSync('git', [...args], { cwd: PROJECT_ROOT, encoding: 'utf-8' });

/** Caminhos rastreados pelo git — a resposta a "está no repositório", independente deste disco. */
const trackedPaths = (): ReadonlySet<string> =>
  new Set(git(['ls-files']).split('\n').filter(Boolean));

/**
 * `true` se o caminho foi DELIBERADAMENTE excluído do repositório (entrada de `.gitignore`).
 *
 * ⚠️ Um padrão só-diretório do `.gitignore` (`handbook/guidelines/`, com barra final) só casa no
 * `check-ignore` quando o alvo TAMBÉM traz a barra — ou quando o diretório existe neste disco. Mas
 * `resolveFromSource` passa por `path.resolve`, que remove a barra final: o alvo chega aqui como
 * `handbook/guidelines`, e num clone limpo (CI, ou máquina sem o material local-only) o diretório
 * não existe, então a forma sem barra NÃO casa e o local-only virava falso "link morto". Por isso
 * tentamos as duas formas — a barra restaura a semântica de diretório do padrão.
 */
const isDeliberatelyIgnored = (rel: string): boolean => {
  const clean = rel.replace(/^\.\//, '').replace(/\/$/, '');
  for (const candidate of [clean, `${clean}/`]) {
    try {
      git(['check-ignore', '--quiet', '--', candidate]);
      return true;
    } catch {
      // este candidato não está ignorado — tenta a próxima forma
    }
  }
  return false; // nenhuma forma casou → não está ignorado
};

describe('CLAUDE-MD-LINKS — a doc canônica não aponta para o vazio', () => {
  it('todo caminho relativo citado está no repositório (ou é local-only declarado)', () => {
    const tracked = trackedPaths();
    const inRepo = (rel: string): boolean => {
      const clean = rel.replace(/^\.\//, '').replace(/\/$/, '');
      if (tracked.has(clean)) return true; // arquivo rastreado
      for (const p of tracked) if (p.startsWith(`${clean}/`)) return true; // diretório com conteúdo
      return false;
    };

    const dead: string[] = [];
    for (const source of SOURCES()) {
      const content = readFileSync(join(PROJECT_ROOT, source), 'utf-8');
      for (const link of extractLinks(content)) {
        const target = resolveFromSource(source, link);
        if (!inRepo(target) && !isDeliberatelyIgnored(target)) dead.push(`${source} → ${link}`);
      }
    }

    assert.deepEqual(
      dead,
      [],
      'doc canônica cita caminhos que não existem (arquivo → link):\n' + dead.join('\n'),
    );
  });

  it('as rules estão no escopo (guarda contra glob que esvaziou)', () => {
    // Sem esta guarda, um glob quebrado faria o gate voltar a cobrir só o CLAUDE.md — verde e cego,
    // que é exatamente o estado que a #641 corrigiu.
    const rules = SOURCES().filter((s) => s.startsWith('.claude/rules/'));
    assert.ok(rules.length > 0, 'nenhuma rule no escopo: o glob `.claude/rules/*.md` casa nada');
    assert.ok(
      SOURCES().includes('CLAUDE.md'),
      'o CLAUDE.md saiu do escopo — o ADR-0057 §3 o exige verificado',
    );
  });

  it('há links a verificar (guarda contra regex que casa nada)', () => {
    const total = SOURCES().reduce(
      (n, s) => n + extractLinks(readFileSync(join(PROJECT_ROOT, s), 'utf-8')).length,
      0,
    );
    assert.ok(
      total > 0,
      'nenhum link relativo encontrado: a regex ou a convenção do arquivo mudou',
    );
  });

  it('extrai `./` e `../`, e a âncora não vira parte do caminho', () => {
    // `../` é a forma que as rules usam; a versão anterior só casava `./` e por isso não as via.
    assert.deepEqual(extractLinks('[a](./x.md) [b](../../y.md)'), ['../../y.md', './x.md']);
    // Âncora: verifica-se o ARQUIVO, nunca o fragmento.
    assert.deepEqual(extractLinks('[c](./z.md#uma-secao)'), ['./z.md']);
    // Âncora pura e URL não são caminho de filesystem.
    assert.deepEqual(extractLinks('[d](#secao) [e](https://exemplo.dev/x)'), []);
  });

  it('resolve o caminho a partir de quem cita, não da raiz', () => {
    // O erro que este gate precisa evitar: tratar `../../handbook/x` como se fosse relativo ao root.
    assert.equal(
      resolveFromSource('.claude/rules/auth-module.md', '../../handbook/architecture/adr/0024.md'),
      'handbook/architecture/adr/0024.md',
    );
    assert.equal(
      resolveFromSource('CLAUDE.md', './handbook/CHANGELOG.md'),
      'handbook/CHANGELOG.md',
    );
  });

  // O escape do `.gitignore` é o ponto onde este gate pode ficar cego: se `check-ignore` passasse a
  // responder `true` para tudo, link morto nenhum seria acusado e a suíte seguiria verde. Estes dois
  // casos provam que os dois lados do predicado discriminam.
  it('o escape de local-only não cega o gate', () => {
    assert.equal(
      isDeliberatelyIgnored('./caminho/que/nunca/existiu'),
      false,
      'check-ignore aceitou um caminho arbitrário — o escape virou anistia geral',
    );
    assert.equal(
      isDeliberatelyIgnored('./handbook/guidelines/'),
      true,
      'handbook/guidelines/ deixou de ser local-only: ou saiu do .gitignore, ou o CLAUDE.md precisa parar de tratá-lo como não-versionado',
    );
  });
});
