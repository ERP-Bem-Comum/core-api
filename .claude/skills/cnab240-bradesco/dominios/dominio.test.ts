/**
 * Trava a regra de vigência e o contrato da CLI.
 *
 *   bun test .claude/skills/cnab240-bradesco/dominios/
 *
 * Fora do `tsconfig.json` do repositório, logo fora de `pnpm run test` — este
 * arquivo não roda no gate. Rodar à mão ao mexer em `dominio.ts`.
 */
import { describe, expect, test } from 'bun:test';
import { dirname, join } from 'node:path';

import { classificarVigencia, type DomainRow } from './dominio.ts';

const HERE = dirname(Bun.fileURLToPath(import.meta.url));
const CLI = join(HERE, 'dominio.ts');

const linha = (over: Partial<DomainRow> = {}): DomainRow => ({
  tipo: 'X',
  dominio: '1',
  descricao: 'exemplo',
  controle: null,
  hom_inicio: null,
  prod_inicio: '2020-01-01',
  hom_fim: null,
  prod_fim: null,
  ...over,
});

describe('classificarVigencia — bordas fechadas nas duas pontas', () => {
  const HOJE = '2026-08-25';

  test('prod_fim igual a hoje ainda vale o dia inteiro', () => {
    expect(classificarVigencia(linha({ prod_fim: HOJE }), HOJE)).toBe('vigente');
  });

  test('prod_fim em ontem já expirou', () => {
    expect(classificarVigencia(linha({ prod_fim: '2026-08-24' }), HOJE)).toBe('extinto');
  });

  test('prod_inicio igual a hoje já vale desde o primeiro minuto', () => {
    expect(classificarVigencia(linha({ prod_inicio: HOJE }), HOJE)).toBe('vigente');
  });

  test('prod_inicio em amanhã ainda não vale', () => {
    expect(classificarVigencia(linha({ prod_inicio: '2026-08-26' }), HOJE)).toBe('futuro');
  });
});

describe('classificarVigencia — null é vigência infinita, não desconhecido', () => {
  const HOJE = '2026-08-25';

  test('sem prod_inicio: sempre valeu', () => {
    expect(classificarVigencia(linha({ prod_inicio: null }), HOJE)).toBe('vigente');
  });

  test('sem prod_fim: nunca desativado', () => {
    expect(classificarVigencia(linha({ prod_fim: null }), HOJE)).toBe('vigente');
  });

  test('sem nenhuma das duas: regra atemporal', () => {
    expect(classificarVigencia(linha({ prod_inicio: null, prod_fim: null }), HOJE)).toBe('vigente');
  });

  test('null em prod_inicio não impede a extinção por prod_fim', () => {
    expect(classificarVigencia(linha({ prod_inicio: null, prod_fim: '2020-05-05' }), HOJE)).toBe('extinto');
  });
});

describe('classificarVigencia — só a produção decide', () => {
  test('datas de homologação não alteram o veredito', () => {
    const row = linha({ hom_inicio: '2030-01-01', hom_fim: '2019-01-01' });
    expect(classificarVigencia(row, '2026-08-25')).toBe('vigente');
  });
});

// ─────────────────── contrato da CLI, contra o banco real ───────────────────

async function cli(...args: string[]): Promise<Record<string, unknown>> {
  const proc = Bun.spawn(['bun', 'run', CLI, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(out) as Record<string, unknown>;
}

describe('CLI', () => {
  test('retorno mínimo de um domínio vigente', async () => {
    expect(await cli('CanPgto', '4', '--em', '2026-08-25')).toEqual({
      desc: 'Pix',
      vig: 'vigente',
      prod: '2023-07-01',
    });
  });

  test('a busca por tipo é insensível a caixa', async () => {
    const [a, b] = await Promise.all([cli('canpgto', '4', '--em', '2026-08-25'), cli('CANPGTO', '4', '--em', '2026-08-25')]);
    expect(a).toEqual(b);
  });

  test('domínio que só entra em produção adiante é "futuro", não "vigente"', async () => {
    // FinlddTES/254 — Repasse de receitas de tributos, produção em 2026-10-24.
    expect(await cli('FinlddTES', '254', '--em', '2026-08-25')).toMatchObject({ vig: 'futuro' });
    expect(await cli('FinlddTES', '254', '--em', '2026-10-24')).toMatchObject({ vig: 'vigente' });
  });

  test('domínio inexistente devolve erro nomeado com os vizinhos', async () => {
    const r = await cli('CanPgto', '999');
    expect(r).toMatchObject({ erro: 'dominio-nao-encontrado', tipo: 'CanPgto' });
    expect(Array.isArray(r.existentes)).toBe(true);
  });

  test('tipo inexistente é distinguido de domínio inexistente', async () => {
    expect(await cli('NaoExiste', '1')).toMatchObject({ erro: 'tipo-nao-encontrado' });
  });

  test('listagem de tipo esconde os extintos por padrão', async () => {
    const so = (await cli('FinlddIF', '--em', '2026-08-25')) as { total: number; mostrados: number };
    const todos = (await cli('FinlddIF', '--todos', '--em', '2026-08-25')) as { mostrados: number };
    expect(so.mostrados).toBeLessThan(so.total);
    expect(todos.mostrados).toBe(so.total);
  });

  test('a busca textual ignora acento', async () => {
    const r = (await cli('--busca', 'negociacao')) as { n: number };
    expect(r.n).toBeGreaterThan(0);
  });

  test('meta carrega a proveniência para citação', async () => {
    expect(await cli('--meta')).toMatchObject({
      fonte_arquivo: 'tabela_de_dominio_20260724.xls',
      linhas: '9474',
    });
  });
});
