import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create,
  markFailed,
  discard,
  confirmTransmitted,
} from '#src/modules/financial/domain/remittance/remittance.ts';

// Desde o ADR-0065 §2 o `save` de criação transiciona `Approved → Transmitted` por CAS, e o fake
// espelha o veredito por contagem: ou todos os títulos estão `Approved`, ou nenhum transiciona e o
// `save` recusa. Título que o repositório não conhece afeta zero linhas no banco — o mesmo conflito.
//
// Estes casos usam ids fictícios (`doc-1`) que não vêm de fixture de título nenhuma, então o estado
// deles precisa ser declarado aqui. `repoWith` é o construtor de todos os casos do arquivo: quem
// criar caso novo semeia junto, em vez de descobrir a recusa como falha misteriosa.
const repoWith = (...approvedIds: readonly string[]) =>
  createInMemoryRemittanceRepository({
    payableStatuses: Object.fromEntries(approvedIds.map((id) => [id, 'Approved' as const])),
  });

let seq = 0;
const build = (payableIds: readonly string[]) => {
  seq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: CedenteAccountId.generate(),
    nsa: seq,
    fileName: `PAG_1.1108202614000${seq}_00000${seq}.REM`,
    contentHash: 'a'.repeat(64),
    // A referência de G064 (#752) sai de NSA + posição. Derivada aqui do mesmo `seq` que numera a
    // remessa, para que duas remessas do fixture nunca colidam — que é a invariante do CA4.
    // Cada id do fixture nomeia UM título; a nota de origem recebe o mesmo valor porque estes casos
    // medem o vínculo remessa→título, não o agrupamento por nota.
    payables: payableIds.map((payableId, i) => ({
      payableId,
      documentId: payableId,
      yourNumber: `${String(seq).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    generatedAt: '2026-08-11T14:00:00.000Z',
  });
  assert.ok(isOk(r));
  return r.value;
};

describe('RemittanceRepository (fake) — round-trip', () => {
  it('salva e recupera por id e por nome de arquivo', async () => {
    const repo = repoWith('doc-1');
    const rem = build(['doc-1']);

    assert.equal((await repo.save(rem)).ok, true);

    const byId = await repo.findById(rem.id);
    assert.ok(isOk(byId) && byId.value !== null);
    assert.equal(byId.value.fileName, rem.fileName);

    const byName = await repo.findByFileName(rem.fileName);
    assert.ok(isOk(byName) && byName.value !== null);
    assert.equal(byName.value.id, rem.id);
  });
});

describe('RemittanceRepository (fake) — quem está preso', () => {
  // A consulta que a SELEÇÃO faz antes de montar remessa nova: impede o mesmo título de sair duas
  // vezes. Ela NÃO substitui mais a transição para `Transmitted` — desde o ADR-0065 §2 a transição
  // existe e acontece na mesma gravação. O hold responde "está em alguma remessa viva?"; o status do
  // título responde "saiu da nossa alçada?". Os casos deste describe medem o primeiro.
  it('remessa enfileirada prende seus documentos', async () => {
    const repo = repoWith('doc-1', 'doc-2');
    await repo.save(build(['doc-1', 'doc-2']));

    const held = await repo.findHeldPayables(['doc-1', 'doc-2', 'doc-3']);
    assert.ok(isOk(held));
    assert.deepEqual(
      held.value.map((h) => h.payableId),
      ['doc-1', 'doc-2'],
    );

    // O vínculo carrega a remessa, não só o título: é o `nsa` que o operador reconhece na tela
    // quando o ajuste é recusado. Asserir a PROPRIEDADE (todo vínculo aponta para uma remessa
    // identificável) e não o valor literal — o `nsa` vem do `build`, e prendê-lo aqui faria o teste
    // quebrar por mudança de fixture em vez de por mudança de comportamento.
    for (const vinculo of held.value) {
      assert.ok(vinculo.remittanceId.length > 0);
      assert.ok(Number.isInteger(vinculo.nsa) && vinculo.nsa >= 1);
    }
  });

  it('remessa transmitida continua prendendo', async () => {
    const repo = repoWith('doc-1');
    const rem = build(['doc-1']);
    const t = confirmTransmitted(rem, '2026-08-11T14:05:00.000Z', 'ok');
    assert.ok(isOk(t));
    await repo.save(t.value.remittance, t.value.events);

    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held) && held.value.length === 1);
  });

  // "Sem confirmação" não é "não transmitiu": o arquivo pode ter saído e o status ter se perdido.
  it('remessa em FALHA continua prendendo', async () => {
    const repo = repoWith('doc-1');
    const f = markFailed(build(['doc-1']), '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    await repo.save(f.value.remittance, f.value.events);

    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held) && held.value.length === 1);
  });

  it('só o descarte devolve o documento para a fila', async () => {
    const repo = repoWith('doc-1');
    const f = markFailed(build(['doc-1']), '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    const d = discard(
      f.value.remittance,
      '2026-08-11T15:00:00.000Z',
      'confirmado com o banco que nao saiu',
    );
    assert.ok(isOk(d));
    await repo.save(d.value.remittance, d.value.events);

    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });

  it('lista vazia não consulta nada e devolve vazio', async () => {
    const repo = repoWith();
    const held = await repo.findHeldPayables([]);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, []);
  });
});

// #789 — a trava anti-dupla-emissão não pode viver só na consulta do use case.
//
// `findHeldPayableIds` responde sobre o passado: entre a resposta dela e a gravação cabe a tradução
// CNAB inteira, e duas emissões concorrentes leem "livre" antes de qualquer uma gravar. Quem fecha a
// janela é o próprio `save`, que reconfere o hold no mesmo ato em que grava.
//
// O fake espelha a SEMÂNTICA, não o mecanismo: no adapter real a exclusão vem de lock de linha, aqui
// de uma checagem síncrona. Um fake que aceitasse o que o banco recusa deixaria a suíte verde
// descrevendo produção errado — que é o motivo de este describe existir.
describe('RemittanceRepository (fake) — o save reconfere o hold (#789)', () => {
  it('recusa criar remessa com título já preso por outra remessa viva', async () => {
    const repo = repoWith('doc-1', 'doc-2', 'doc-3');
    await repo.save(build(['doc-1', 'doc-2']));

    // A segunda emissão passou pela consulta antes da primeira gravar — é exatamente o cenário da
    // corrida, encenado em sequência.
    const segunda = await repo.save(build(['doc-2', 'doc-3']));
    assert.equal(segunda.ok, false, 'esperava recusa: doc-2 já está preso');
    assert.equal(isErr(segunda) ? segunda.error : null, 'remittance-payables-already-held');
  });

  // ⚠️ O caso que uma reconferência ingênua quebraria. Ao confirmar, mudar status ou descartar, a
  // remessa encontra os PRÓPRIOS títulos presos — por ela mesma. Recusar aqui travaria o
  // `confirmRemittance` e deixaria toda remessa transmitida sem desfecho.
  it('permite atualizar uma remessa existente, cujos títulos ela mesma prende', async () => {
    const repo = repoWith('doc-1');
    const rem = build(['doc-1']);
    await repo.save(rem);

    const t = confirmTransmitted(rem, '2026-08-11T14:05:00.000Z', 'ok');
    assert.ok(isOk(t));
    const atualizacao = await repo.save(t.value.remittance, t.value.events);
    assert.equal(atualizacao.ok, true, 'atualização de desfecho não passa pela reserva');
  });

  // ⚠️ Este caso mede DUAS coisas que o ADR-0065 separou, e que antes dele eram uma só.
  //
  // Até o #792, "liberar o título" era só soltar o vínculo: o hold é derivado do status da REMESSA
  // (`holdsPayables`), e descartar bastava. Agora o título tem estado próprio, e voltar à fila exige
  // as duas coisas — o vínculo solto E o status de volta a `Approved`. O descarte já faz a primeira;
  // a segunda é a §4 do ADR (`UPDATE … SET status='Approved' WHERE id=? AND status='Transmitted'`,
  // restrito aos títulos que ESTA remessa segura), que ainda não tem use case nem rota.
  //
  // O assert de recusa abaixo é deliberado e temporário: ele fixa o estado REAL de hoje em vez de
  // fingir que a devolução já existe. Quando a fatia do descarte entrar, este caso fica vermelho — e
  // é assim que ele avisa que chegou a hora de exigir `segunda.ok === true`.
  it('o descarte solta o vínculo; o status do título ainda não volta (ADR-0065 §4 pendente)', async () => {
    const repo = repoWith('doc-1');
    const primeira = build(['doc-1']);
    await repo.save(primeira);
    assert.equal(repo.payableStatus('doc-1'), 'Transmitted', 'a emissão transicionou o título');

    const f = markFailed(primeira, '2026-08-11T14:05:00.000Z', 'sem confirmacao');
    assert.ok(isOk(f));
    const d = discard(
      f.value.remittance,
      '2026-08-11T15:00:00.000Z',
      'banco confirmou que nao saiu',
    );
    assert.ok(isOk(d));
    await repo.save(d.value.remittance, d.value.events);

    // 1. O vínculo está solto — a remessa descartada não prende mais.
    const held = await repo.findHeldPayables(['doc-1']);
    assert.ok(isOk(held));
    assert.deepEqual(held.value, [], 'remessa descartada não prende');

    // 2. Mas o título segue `Transmitted`, então ainda não é candidato a remessa nova.
    assert.equal(repo.payableStatus('doc-1'), 'Transmitted');
    const segunda = await repo.save(build(['doc-1']));
    assert.equal(
      isErr(segunda) ? segunda.error : null,
      'remittance-payable-not-approved',
      'sem a devolução da §4, o título preso pelo status não volta à fila',
    );
  });
});

// ADR-0065 §2 — a transição que este ticket existe para criar.
//
// O `save` de criação escreve em dois agregados na mesma transação: registra a remessa e move cada
// título de `Approved` para `Transmitted`. O veredito é por CONTAGEM — ou todos transicionam, ou
// nenhum e a operação inteira é recusada. É o mesmo que o CAS faz no banco com `affectedRows`.
describe('RemittanceRepository (fake) — a transição do título na reserva (#792)', () => {
  it('a criação move para Transmitted todos os títulos da remessa', async () => {
    const repo = repoWith('doc-1', 'doc-2');
    assert.equal((await repo.save(build(['doc-1', 'doc-2']))).ok, true);

    assert.equal(repo.payableStatus('doc-1'), 'Transmitted');
    assert.equal(repo.payableStatus('doc-2'), 'Transmitted');
  });

  it('recusa a remessa inteira quando UM título não está aprovado, e não transiciona nenhum', async () => {
    // `doc-2` fica de fora do seed: no banco ele afetaria zero linhas no CAS, que é o mesmo
    // conflito de um título não-aprovado.
    const repo = repoWith('doc-1');
    const r = await repo.save(build(['doc-1', 'doc-2']));

    assert.equal(isErr(r) ? r.error : null, 'remittance-payable-not-approved');
    assert.equal(
      repo.payableStatus('doc-1'),
      'Approved',
      'o título aprovado NÃO pode ter transicionado: a transação desfaz tudo',
    );
  });

  it('a recusa não deixa rastro: nem remessa, nem evento', async () => {
    const repo = repoWith('doc-1');
    const rem = build(['doc-1', 'doc-2']);
    const r = await repo.save(rem);
    assert.equal(r.ok, false);

    const found = await repo.findById(rem.id);
    assert.ok(isOk(found));
    assert.equal(found.value, null, 'remessa recusada não fica registrada');
    assert.deepEqual(repo.published(), [], 'evento existe se e somente se o estado foi persistido');
  });

  // O perdedor da corrida do #789 não pode sair transicionado: quem perde não escreveu nada.
  it('o perdedor da corrida por título preso fica com o status intocado', async () => {
    const repo = repoWith('doc-1', 'doc-2', 'doc-3');
    await repo.save(build(['doc-1', 'doc-2']));

    const perdedora = await repo.save(build(['doc-2', 'doc-3']));
    assert.equal(isErr(perdedora) ? perdedora.error : null, 'remittance-payables-already-held');
    assert.equal(repo.payableStatus('doc-3'), 'Approved', 'título da remessa perdedora não muda');
  });
});
