import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repoRoot = new URL('../../', import.meta.url);
const read = (rel: string): Promise<string> => readFile(new URL(rel, repoRoot), 'utf8');

test('ADR-0034 existe, Accepted, e descreve AWS prod + Magalu QA', async () => {
  const adr = await read('handbook/architecture/adr/0034-runtime-infra-aws-prod-magalu-qa.md');
  assert.match(adr, /# ADR-0034:/);
  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /EC2/);
  assert.match(adr, /RDS/);
  assert.match(adr, /Magalu/);
});

test('ADR-0035 existe, Accepted, e adota o Caddy como edge', async () => {
  const adr = await read('handbook/architecture/adr/0035-caddy-edge-reverse-proxy.md');
  assert.match(adr, /# ADR-0035:/);
  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /Caddy/);
  assert.match(adr, /reverse.proxy|reverse_proxy/i);
});

test('Índice de ADRs lista 0034 e 0035', async () => {
  const readme = await read('handbook/architecture/adr/README.md');
  assert.match(readme, /\[0034\]\(\.\/0034-runtime-infra-aws-prod-magalu-qa\.md\)/);
  assert.match(readme, /\[0035\]\(\.\/0035-caddy-edge-reverse-proxy\.md\)/);
});

test('CHANGELOG menciona ADR-0034 e ADR-0035', async () => {
  const changelog = await read('handbook/CHANGELOG.md');
  assert.match(changelog, /ADR-0034/);
  assert.match(changelog, /ADR-0035/);
});

test('Agente Caddy destravado (sem RESERVED, referencia ADR-0035)', async () => {
  const agent = await read('.claude/agents/caddy-server-expert.md');
  assert.doesNotMatch(agent, /RESERVED \(Fase 2\+\)/);
  assert.doesNotMatch(agent, /## Status: reservado/);
  assert.match(agent, /ADR-0035/);
});

test('CLAUDE.md não marca mais o Caddy como reservado', async () => {
  const claude = await read('CLAUDE.md');
  const caddyLine = claude
    .split('\n')
    .find((l) => l.includes('caddy-server-expert.md') && l.includes('|'));
  assert.ok(caddyLine, 'linha do Caddy na tabela de agentes deve existir');
  assert.doesNotMatch(caddyLine!, /reservado/i);
});
