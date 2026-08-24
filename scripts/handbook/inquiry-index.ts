import process from 'node:process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fase 1 do plano `handbook/specs/041-handbook-reference-integrity/plan.md`.
//
// O `INDEX.md` das inquiries declarava "Gerado a partir do disco. Não editar à mão" e o
// `inquiry-hygiene.test.ts` mandava "regere com o script do README" — esse script NUNCA existiu. O
// índice era mantido à mão fingindo ser derivado, e o teste era a muleta que segurava a ficção.
// Este arquivo é o script que faltava.
//
// SEM DATA DE GERAÇÃO — decisão deliberada. O `INDEX.md` trazia "Última geração: 2026-08-06", e
// carimbar a data de hoje num arquivo derivado faz o `--check` ficar vermelho amanhã sem ninguém
// ter tocado em nada. Gate que acende sozinho é gate que se aprende a ignorar. O que data o índice
// é o `git log` do arquivo, que não mente nem precisa ser mantido.

export interface Inquiry {
  /** Prefixo de 4 dígitos — a identidade estável. */
  readonly id: string;
  readonly file: string;
  readonly title: string;
  readonly state: string;
  readonly opened: string;
  readonly decided: string;
}

interface StateView {
  readonly heading: string;
  readonly unblockedBy: string;
}

/** Ordem de apresentação = ordem de urgência. `superseded` fecha a lista. */
const STATE_ORDER = ['open', 'blocked', 'decided', 'deferred', 'superseded'] as const;

const STATES: Readonly<Record<string, StateView>> = {
  open: { heading: '🟢 Em investigação', unblockedBy: 'quem trabalha nela' },
  blocked: { heading: '⛔ Bloqueadas — esperam terceiro', unblockedBy: 'terceiro (banca, upstream, P.O.)' },
  decided: { heading: '✅ Decididas', unblockedBy: 'ninguém — fechada' },
  deferred: { heading: '🔵 Adiadas (com gatilho)', unblockedBy: 'o gatilho declarado' },
  superseded: { heading: '♻️ Revisadas', unblockedBy: '—' },
};

/** Lê o primeiro bloco de frontmatter. Valor entre aspas é desembrulhado; comentário inline cai. */
export function parseFrontmatter(raw: string): Readonly<Record<string, string>> {
  const m = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (m === null) return {};
  const out: Record<string, string> = {};
  for (const line of (m[1] ?? '').split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    const key = kv?.[1];
    if (key === undefined) continue;
    out[key] = (kv?.[2] ?? '')
      .replace(/\s+#.*$/, '')
      .trim()
      // Aspas simples E duplas: as duas são YAML válido, e o `\1` exige que a que fecha seja a
      // mesma que abriu — senão um título que termina em apóstrofo perderia o último caractere.
      .replace(/^(["'])(.*)\1$/, '$2');
  }
  return out;
}

export function readInquiries(dir: string): readonly Inquiry[] {
  return readdirSync(dir)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort()
    .map((file) => {
      const fm = parseFrontmatter(readFileSync(join(dir, file), 'utf-8'));
      return {
        id: file.slice(0, 4),
        file,
        title: fm['title'] ?? '',
        state: fm['state'] ?? '',
        opened: fm['opened'] ?? '',
        decided: fm['decided'] ?? '',
      };
    });
}

const row = (i: Inquiry): string =>
  `| [${i.id}](./${i.file}) | ${i.title} | ${i.opened} | ${i.decided} |`;

export function renderIndex(inquiries: readonly Inquiry[]): string {
  const of = (state: string): readonly Inquiry[] => inquiries.filter((i) => i.state === state);

  const panorama = STATE_ORDER.filter((s) => of(s).length > 0)
    .map((s) => `| \`${s}\` | ${String(of(s).length)} | ${STATES[s]?.unblockedBy ?? ''} |`)
    .join('\n');

  const sections = STATE_ORDER.filter((s) => of(s).length > 0)
    .map(
      (s) =>
        `## ${STATES[s]?.heading ?? s}\n\n` +
        '| # | Título | Aberta | Decidida |\n| :--- | :--- | :--- | :--- |\n' +
        of(s).map(row).join('\n'),
    )
    .join('\n\n---\n\n');

  return `[← Voltar ao README de Inquiries](./README.md)

# 📑 Índice de Inquiries

> **Gerado por \`pnpm run docs:index\`.** Não editar à mão — o estado de cada inquiry vive no
> frontmatter do próprio arquivo, e \`tests/cleanup/inquiry-hygiene.test.ts\` trava qualquer divergência.

## Panorama

| Estado | Quantas | Quem destrava |
| :--- | ---: | :--- |
${panorama}

Total: **${String(inquiries.length)}**.

---

${sections}

---

> 🔍 **Filosofia:** decisão sem trilha de raciocínio é decisão frágil. Esta pasta existe para que
> toda decisão arquitetural relevante tenha um "show your work" quando alguém perguntar "por que
> escolheram assim?". Consulta pelo agente: skill [\`inquiry\`](../../.claude/skills/inquiry/SKILL.md).
`;
}

const BEGIN = '<!-- BEGIN:generated -->';
const END = '<!-- END:generated -->';

/**
 * A região derivada do checklist executivo: contagens e cobertura. As colunas "Aguardando" e
 * "Bloqueia" da visão geral são PROSA e ficam fora daqui — o plano previu esta falsificação
 * ("se a prosa não se separar limpo do gerado, só o INDEX.md é gerado"), e é o que se observou.
 */
export function renderCounts(inquiries: readonly Inquiry[], openQuestions: number): string {
  const awaiting = inquiries.filter((i) => i.state === 'open' || i.state === 'blocked');
  // Link para o ARQUIVO, não para a âncora interna: âncora depende do heading em prosa (que muda),
  // o nome do arquivo vem do disco. Derivado só pode citar o que ele mesmo consegue verificar.
  const ids = awaiting.map((i) => `[${i.id}](./${i.file})`).join(' · ');
  const others = inquiries.length - awaiting.length;
  const count = (s: string): number => inquiries.filter((i) => i.state === s).length;
  return `${BEGIN}

- **Inquiries cobertas:** ${String(awaiting.length)} de ${String(inquiries.length)} — ${ids}
- **Total de perguntas em aberto:** **${String(openQuestions)}**

As demais ${String(others)} estão \`decided\` (${String(count('decided'))}), \`deferred\` (${String(count('deferred'))}, com gatilho declarado) ou \`superseded\` (${String(count('superseded'))}) — nenhuma
espera resposta de alguém. Ver [\`INDEX.md\`](./INDEX.md).

${END}`;
}

/** Substitui a região marcada, preservando tudo fora dela. Sem marcadores, devolve o original. */
export function applyGeneratedRegion(current: string, generated: string): string {
  const start = current.indexOf(BEGIN);
  const end = current.indexOf(END);
  if (start === -1 || end === -1) return current;
  return current.slice(0, start) + generated + current.slice(end + END.length);
}

/** Conta as perguntas ainda abertas do checklist — checkbox desmarcado. */
export function countOpenQuestions(checklist: string): number {
  return (checklist.match(/^- \[ \]/gm) ?? []).length;
}

function main(): void {
  const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
  const dir = join(root, 'handbook/inquiries');
  const check = process.argv.includes('--check');

  const inquiries = readInquiries(dir);
  const targets: readonly { readonly file: string; readonly next: string }[] = [
    { file: join(dir, 'INDEX.md'), next: renderIndex(inquiries) },
    ...(((): readonly { readonly file: string; readonly next: string }[] => {
      const file = join(dir, 'PERGUNTAS-EM-ABERTO.md');
      const current = readFileSync(file, 'utf-8');
      const next = applyGeneratedRegion(
        current,
        renderCounts(inquiries, countOpenQuestions(current)),
      );
      return [{ file, next }];
    })()),
  ];

  const stale = targets.filter((t) => readFileSync(t.file, 'utf-8') !== t.next);

  if (check) {
    if (stale.length > 0) {
      process.stderr.write(
        `Derivado desatualizado:\n${stale.map((t) => `  ${t.file}`).join('\n')}\n\n` +
          'Rode `pnpm run docs:index` e commite o resultado.\n',
      );
      process.exit(1);
    }
    process.stdout.write(`OK — ${String(targets.length)} derivado(s) em dia.\n`);
    return;
  }

  for (const t of stale) writeFileSync(t.file, t.next);
  process.stdout.write(
    stale.length === 0
      ? 'Nada a fazer — derivados já em dia.\n'
      : `Regerado:\n${stale.map((t) => `  ${t.file}`).join('\n')}\n`,
  );
}

if (process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
