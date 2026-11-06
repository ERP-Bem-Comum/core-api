// Achado 6 — o comentário de `selectImportSource` diz que os candidatos chegam "em qualquer status
// e de qualquer programa", mas `listApprovedByYear` já filtra.
//
// Cada execução povoa o repositório com 5 a 30 planos de anos, status e programas sorteados e faz a
// mesma consulta que o `createBudgetPlan` faz. Ocorrência = a consulta não devolve nenhum candidato
// fora de (APROVADO, ano, programa) E o comentário do domínio ainda afirma o contrário.
import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { ProgramRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type { BudgetPlanStatus } from '#src/modules/budget-plans/domain/budget-plan/status.ts';
import { memoryRepos, measure, must, ACTOR_REF, PROGRAM_ETI, PROGRAM_PARC } from './_world.ts';

const DOMAIN = 'src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
const STATUSES: readonly BudgetPlanStatus[] = ['RASCUNHO', 'EM_CALIBRACAO', 'APROVADO'];
const PROGRAMS = [PROGRAM_ETI, PROGRAM_PARC] as const;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

describe('F6 — a consulta de origem já devolve só candidatos válidos', () => {
  it('o comentário do domínio descreve o que a consulta faz', async () => {
    let candidatesSeen = 0;
    const m = await measure(
      'F6',
      'listApprovedByYear nunca traz candidato fora de APROVADO+ano+programa',
      async () => {
        const repos = memoryRepos();
        const actor = must(UserRef.rehydrate(ACTOR_REF), 'actor');
        const n = 5 + Math.floor(Math.random() * 26);
        for (let i = 0; i < n; i += 1) {
          const at = new Date('2026-01-01T00:00:00.000Z');
          const plan: BudgetPlanEntity = {
            id: BudgetPlanId.generate(),
            year: 2023 + Math.floor(Math.random() * 4),
            programRef: must(ProgramRef.rehydrate(pick(PROGRAMS)), 'program'),
            version: { major: 1 + Math.floor(Math.random() * 3), minor: 0 },
            status: pick(STATUSES),
            budgets: [],
            parentId: null,
            scenarioName: null,
            createdAt: at,
            updatedAt: at,
            updatedByRef: actor,
          };
          must(await repos.planRepo.save(plan, []), 'save');
        }
        const year = 2023 + Math.floor(Math.random() * 4);
        const program = pick(PROGRAMS);
        const candidates = must(
          await repos.planRepo.listApprovedByYear({
            year,
            programRef: must(ProgramRef.rehydrate(program), 'program'),
          }),
          'list',
        );
        candidatesSeen += candidates.length;
        const queryFilters = candidates.every(
          (p) => p.status === 'APROVADO' && p.year === year && String(p.programRef) === program,
        );
        // O achado é o comentário CONTRADIZER o comportamento: dizer que os candidatos chegam sem
        // filtro enquanto a consulta filtra.
        const commentSaysUnfiltered = readFileSync(DOMAIN, 'utf8').includes(
          'em qualquer status e de qualquer programa',
        );
        return queryFilters && commentSaysUnfiltered;
      },
      () => ({ candidatesSeen }),
    );
    assert.equal(m.occurred, 0, `comentário contradiz a consulta em ${m.occurred}/${m.runs}`);
  });
});
