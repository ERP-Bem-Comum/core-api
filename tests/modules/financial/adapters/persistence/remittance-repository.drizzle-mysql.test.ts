// Teste de integração: RemittanceRepository (Drizzle + MySQL real).
//
// Prova o que o fake não pode: que o cabeçalho e os vínculos gravam na MESMA transação, que o
// anti-join de títulos presos acontece no BANCO, e que os CHECKs e UNIQUEs da migration 0044
// existem de verdade — inclusive o de NSA único por conta, que é o que impede duas remessas com o
// mesmo número (retransmissão, aos olhos do banco).
//
// GATE: só roda com `MYSQL_INTEGRATION=1`.

import { describe, it, before, beforeEach, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq, inArray } from 'drizzle-orm';

import { isErr, isOk } from '#src/shared/index.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  createDrizzleRemittanceRepository,
  HOLDING,
  toMysqlDateTime,
} from '#src/modules/financial/adapters/persistence/repos/remittance-repository.drizzle.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create,
  confirmTransmitted,
  markFailed,
  discard,
  payableIdsOf,
} from '#src/modules/financial/domain/remittance/remittance.ts';
import {
  finOutbox,
  finDocuments,
  finPayables,
  finRemittances,
  finRemittancePayables,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const account = CedenteAccountId.generate();
let nsaSeq = 0;

/** Um título e a nota que o originou — o par que a remessa vincula. */
type SeededPayable = Readonly<{ payableId: string; documentId: string }>;

const build = (payables: readonly SeededPayable[], cedente = account) => {
  nsaSeq += 1;
  const r = create({
    id: RemittanceId.generate(),
    cedenteAccountId: cedente,
    nsa: nsaSeq,
    fileName: `PAG_INT.11082026140000_${String(nsaSeq).padStart(6, '0')}.REM`,
    contentHash: 'b'.repeat(64),
    // #752: convênio + NSA + posição. O convênio fictício `900001` é o discriminador DESTE arquivo
    // de teste — `your_number` tem UNIQUE na tabela, e dois arquivos de integração que usassem o
    // mesmo par NSA/posição colidiriam entre si, com a falha aparecendo no vizinho.
    payables: payables.map((p, i) => ({
      payableId: p.payableId,
      documentId: p.documentId,
      yourNumber: `900001${String(nsaSeq).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    // ISO 8601 UTC — o formato que `generateRemittance` REALMENTE produz (`toISOString()`).
    //
    // ⚠️ Esta fixture já esteve no formato do MySQL (`2026-08-11 14:00:00.000`), escrito à mão. Com
    // ele o teste passava contra MySQL real enquanto `POST /financial/remittances` falhava com 1292
    // (`Incorrect datetime value`) — a coluna é `datetime` em `mode: 'string'` e o Drizzle repassa a
    // string crua. Teste alimentado com dado que a aplicação nunca gera não prova o caminho da
    // aplicação: prova outro caminho, e fica verde descrevendo um sistema que não funciona.
    generatedAt: '2026-08-11T14:00:00.000Z',
  });
  if (!r.ok) throw new Error(`test setup: remittance (${r.error})`);
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:remittance-repo] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('RemittanceRepository — Drizzle + MySQL (integração)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 4 });
      if (!r.ok) throw new Error(`[financial:remittance-repo] Falha ao conectar: ${r.error}`);
      handle = r.value;
    });

    // ⚠️ Grava a NOTA e o TÍTULO de verdade, e não só ids que casem a FK.
    //
    // Esta fixture já foi `() => CedenteAccountId.generate()`: um UUID solto, servindo ao mesmo
    // tempo de `payable_id` e de `document_id`, sem nunca entrar em tabela alguma. Passava porque
    // `fin_remittance_payables` não declarava FK. Declarada a FK (`RESTRICT` → `fin_payables.id`), o
    // INSERT do vínculo passou a dar `ER_NO_REFERENCED_ROW_2` (1452) — e o erro estava certo: a
    // fixture montava um grafo que a aplicação não produz, com uma linha sendo nota e título ao
    // mesmo tempo.
    //
    // A cura NÃO é gerar um id qualquer em `fin_payables` só para a FK aceitar: seria o mesmo
    // defeito que o comentário do `generatedAt` acima descreve — verde descrevendo um sistema que
    // não existe. É criar o que a aplicação cria: uma nota, e sob ela UM título `Parent`, que é
    // exatamente o que a remessa emite (o líquido do documento).
    //
    // ⚠️ O título nasce `Approved`, e não `Open` como nasceu até o #792. O motivo é o mesmo do
    // parágrafo acima — criar o que a aplicação cria: só título `Approved` entra em remessa
    // (`isApprovedForRemittance`, #736), e desde o ADR-0065 §2 o `save` de criação **transiciona**
    // `Approved → Transmitted` por CAS. Com a fixture em `Open` o `UPDATE` casaria zero linhas e
    // TODA emissão deste arquivo sairia como `remittance-payable-not-approved` — a suíte inteira
    // vermelha, descrevendo um estado que a aplicação nunca monta.
    //
    // O parâmetro existe para o caso que mede a recusa: ele precisa de um título que o CAS rejeite,
    // e o valor tem de ser explícito ali para o cenário se explicar sozinho.
    const seedPayable = async (
      status: 'Approved' | 'Open' = 'Approved',
    ): Promise<SeededPayable> => {
      const documentId = newUuid();
      const payableId = newUuid();
      await handle.db.insert(finDocuments).values({
        id: documentId,
        status,
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
      });
      await handle.db.insert(finPayables).values({
        id: payableId,
        documentId,
        kind: 'Parent',
        status,
        value: 150000,
        dueDate: new Date('2026-09-30T00:00:00.000Z'),
        paymentMethod: 'TED',
        createdAt: new Date('2026-08-11T00:00:00.000Z'),
      });
      return { payableId, documentId };
    };

    // O status do título como o BANCO o vê. As asserções do ADR-0065 §2 são sobre o efeito da
    // transação, e lê-lo pelo agregado devolveria o que o teste montou, não o que foi gravado.
    const statusDoTitulo = async (payableId: string): Promise<string | undefined> => {
      const rows = await handle.db
        .select({ status: finPayables.status })
        .from(finPayables)
        .where(eq(finPayables.id, payableId));
      return rows[0]?.status;
    };

    // Limpa na ENTRADA, por tabela (testing.md §Contrato de isolamento).
    //
    // Passou a ser NECESSÁRIO com a #752: `your_number` ganhou UNIQUE, e `nsaSeq` reinicia a cada
    // processo — sem limpar, a SEGUNDA execução deste arquivo tentaria gravar as mesmas referências
    // e falharia na colisão, com o erro aparecendo como `save` recusado, longe da causa. É o caso
    // que a inversão de ordem não pega, e que a rule chama de "passar duas vezes seguidas".
    //
    // ⚠️ A ORDEM agora é obrigatória, e não estética: com as FKs `RESTRICT` de
    // `fin_remittance_payables`, apagar título ou remessa antes do vínculo dá
    // `ER_ROW_IS_REFERENCED_2`. Vínculo primeiro, depois o que ele referencia. `fin_payables` sai
    // antes de `fin_documents` pela FK intra-agregado.
    beforeEach(async () => {
      await handle.db.delete(finRemittancePayables);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
      await handle.db.delete(finOutbox);
    });

    // ⚠️ Limpa também na SAÍDA, e isto NÃO contradiz o "limpe na entrada" da rule — soma-se a ele.
    //
    // A entrada protege ESTE arquivo do resíduo alheio. A saída protege os VIZINHOS do resíduo
    // deste, e virou necessária com as FKs `RESTRICT`: um vínculo deixado para trás faz o
    // `delete(finDocuments)` de qualquer outra suíte falhar com `ER_ROW_IS_REFERENCED_2` — inclusive
    // suítes que não conhecem remessa, porque o CASCADE nota→título esbarra na FK do vínculo. O
    // dano aparece longe da causa, num arquivo que não tem nada a ver com o assunto.
    after(async () => {
      await handle.db.delete(finRemittancePayables);
      await handle.db.delete(finRemittances);
      await handle.db.delete(finPayables);
      await handle.db.delete(finDocuments);
      await handle?.close();
    });

    // No escopo do describe PAI porque dois blocos irmãos o consultam — o do outbox transacional e o
    // da corrida (#789), que precisa provar que a emissão perdedora não deixou nem evento.
    const outboxRowsOf = async (remittanceId: string) =>
      handle.db
        .select({
          eventType: finOutbox.eventType,
          aggregateType: finOutbox.aggregateType,
          payload: finOutbox.payload,
        })
        .from(finOutbox)
        .where(eq(finOutbox.aggregateId, remittanceId));

    it('salva cabeçalho e vínculos, e recupera os títulos junto', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const p1 = await seedPayable();
      const p2 = await seedPayable();
      const rem = build([p1, p2]);

      assert.equal((await repo.save(rem)).ok, true);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Queued');
      assert.deepEqual([...payableIdsOf(back.value)].sort(), [p1.payableId, p2.payableId].sort());
    });

    it('recupera por nome de arquivo — a chave de idempotência do agente', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const rem = build([await seedPayable()]);
      await repo.save(rem);

      const back = await repo.findByFileName(rem.fileName);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.id, rem.id);
    });

    // O anti-join no banco. Sem ele, a seleção pegaria título já enfileirado por outra instância.
    it('título em remessa viva aparece como preso; título livre não', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const preso = await seedPayable();
      const livre = await seedPayable();
      await repo.save(build([preso]));

      const held = await repo.findHeldPayables([preso.payableId, livre.payableId]);
      assert.ok(isOk(held));
      assert.deepEqual(
        held.value.map((h) => h.payableId),
        [preso.payableId],
      );

      // Contra MySQL real: a projeção traz a remessa junto, e o `nsa` chega como INTEIRO — não como
      // string. É o que o `int()` do schema promete, e o único lugar onde essa promessa é medida.
      const vinculo = held.value[0];
      assert.ok(vinculo !== undefined);
      assert.equal(typeof vinculo.nsa, 'number');
      assert.ok(Number.isInteger(vinculo.nsa));
    });

    it('falha prende; descarte libera', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d = await seedPayable();
      const rem = build([d]);
      await repo.save(rem);

      const failed = markFailed(rem, '2026-08-11 14:05:00.000', 'sem confirmacao');
      assert.ok(isOk(failed));
      await repo.save(failed.value.remittance, failed.value.events);

      const aindaPreso = await repo.findHeldPayables([d.payableId]);
      assert.ok(isOk(aindaPreso) && aindaPreso.value.length === 1);

      const discarded = discard({
        remittance: failed.value.remittance,
        at: '2026-08-11 15:00:00.000',
        reason: 'confirmado com o banco',
        fileInBucket: true,
      });
      assert.ok(isOk(discarded));
      await repo.save(discarded.value.remittance, discarded.value.events);

      const liberado = await repo.findHeldPayables([d.payableId]);
      assert.ok(isOk(liberado));
      assert.deepEqual(liberado.value, []);
    });

    it('save é idempotente: reprocessar o mesmo status não duplica vínculo', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const d = await seedPayable();
      const rem = build([d]);
      await repo.save(rem);

      const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'ok');
      assert.ok(isOk(t));
      await repo.save(t.value.remittance, t.value.events);
      await repo.save(t.value.remittance, t.value.events);

      const back = await repo.findById(rem.id);
      assert.ok(isOk(back) && back.value !== null);
      assert.equal(back.value.status, 'Transmitted');
      assert.deepEqual(payableIdsOf(back.value), [d.payableId]);
    });

    // O UNIQUE que impede duas remessas com o mesmo NSA na mesma conta — retransmissão, para o banco.
    it('recusa NSA repetido na mesma conta-cedente', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const primeira = build([await seedPayable()]);
      await repo.save(primeira);

      const colidente = {
        ...build([await seedPayable()]),
        nsa: primeira.nsa,
        cedenteAccountId: primeira.cedenteAccountId,
      };
      const r = await repo.save(colidente);
      assert.equal(r.ok, false, 'UNIQUE (cedente_account_id, nsa) deveria barrar');
    });

    it('recusa nome de arquivo repetido', async () => {
      const repo = createDrizzleRemittanceRepository(handle);
      const primeira = build([await seedPayable()]);
      await repo.save(primeira);

      const colidente = { ...build([await seedPayable()]), fileName: primeira.fileName };
      const r = await repo.save(colidente);
      assert.equal(r.ok, false, 'UNIQUE (file_name) deveria barrar');
    });

    // ADR-0015: o evento existe se e somente se o estado foi persistido. É o que o fake não pode
    // provar — só o banco real mostra que as duas escritas caem na MESMA transação.
    describe('outbox transacional', () => {
      it('grava RemittanceTransmitted no fin_outbox junto do desfecho', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const rem = build([await seedPayable()]);
        await repo.save(rem);

        const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'consta em BACKUP');
        assert.ok(isOk(t));
        assert.equal((await repo.save(t.value.remittance, t.value.events)).ok, true);

        const rows = await outboxRowsOf(rem.id);
        assert.equal(rows.length, 1);
        assert.equal(rows[0]?.eventType, 'RemittanceTransmitted');
        assert.equal(rows[0]?.aggregateType, 'Remittance');
        assert.match(rows[0]?.payload ?? '', /consta em BACKUP/);
      });

      // A propriedade que a varredura de 5 em 5 minutos exige: sem ela o outbox cresceria sem teto.
      it('reprocessar o mesmo status não duplica o evento', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const rem = build([await seedPayable()]);
        await repo.save(rem);

        const t = confirmTransmitted(rem, '2026-08-11 14:05:00.000', 'ok');
        assert.ok(isOk(t));
        await repo.save(t.value.remittance, t.value.events);

        // Segunda leitura do MESMO envelope: o agregado devolve `events: []`.
        const again = confirmTransmitted(t.value.remittance, '2026-08-11 14:10:00.000', 'ok');
        assert.ok(isOk(again));
        await repo.save(again.value.remittance, again.value.events);

        assert.equal((await outboxRowsOf(rem.id)).length, 1, 'um desfecho, um evento');
      });

      // Se o INSERT do outbox estivesse FORA da transação, o evento sobreviveria ao rollback e
      // anunciaria um desfecho que o banco não tem.
      it('save que falha não deixa evento órfão', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const primeira = build([await seedPayable()]);
        await repo.save(primeira);

        // Colide no UNIQUE de nome: o INSERT lança e a transação inteira reverte.
        const colidente = { ...build([await seedPayable()]), fileName: primeira.fileName };
        const t = confirmTransmitted(colidente, '2026-08-11 14:05:00.000', 'ok');
        assert.ok(isOk(t));
        const r = await repo.save(t.value.remittance, t.value.events);
        assert.equal(r.ok, false, 'a colisão deveria falhar o save');

        assert.deepEqual(
          await outboxRowsOf(colidente.id),
          [],
          'evento não pode sobreviver ao rollback do estado',
        );
      });
    });

    // #789 — a corrida de verdade, e a única prova que o fake NÃO pode dar.
    //
    // O que se mede aqui não é lógica: é o lock do InnoDB. `findHeldPayableIds` responde sobre o
    // passado, e entre a resposta dela e a gravação cabe a tradução CNAB inteira — duas emissões
    // concorrentes leem "livre" antes de qualquer uma gravar (CWE-367). Nenhuma constraint recusa,
    // porque a PK é `(remittance_id, payable_id)` e remessas distintas são chaves distintas.
    //
    // Quem exclui é o `SELECT … FOR UPDATE` sobre `fin_payables` dentro da transação do `save`:
    // busca por PK trava só o registro, sem gap, e X↔X conflita — a segunda transação ESPERA a
    // primeira commitar e então enxerga o vínculo já gravado.
    describe('emissão concorrente — a janela TOCTOU (#789)', () => {
      it('duas emissões do mesmo título: exatamente uma grava, a outra perde com nome próprio', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const disputado = await seedPayable();
        const soDaPrimeira = await seedPayable();
        const soDaSegunda = await seedPayable();

        const a = build([disputado, soDaPrimeira]);
        const b = build([disputado, soDaSegunda]);

        // `Promise.all` e não `await` em sequência: as duas transações precisam estar ABERTAS ao
        // mesmo tempo, em conexões distintas do pool (`poolLimit: 4`). Em sequência, a segunda já
        // enxergaria o commit da primeira e o teste passaria sem exercitar lock algum — provando
        // outra coisa.
        const [ra, rb] = await Promise.all([repo.save(a), repo.save(b)]);

        const vencedoras = [ra, rb].filter((r) => r.ok);
        const perdedoras = [ra, rb].filter((r) => !r.ok);

        assert.equal(vencedoras.length, 1, 'exatamente UMA emissão pode gravar');
        assert.equal(perdedoras.length, 1);
        assert.equal(
          isErr(perdedoras[0]!) ? perdedoras[0]!.error : null,
          'remittance-payables-already-held',
          'a perdedora sai com o erro de negócio, nunca como falha de infraestrutura',
        );

        // O veredito do banco, não o do `Result`: o título disputado aparece UMA vez.
        const vinculos = await handle.db
          .select({ remittanceId: finRemittancePayables.remittanceId })
          .from(finRemittancePayables)
          .where(eq(finRemittancePayables.payableId, disputado.payableId));
        assert.equal(vinculos.length, 1, 'o título disputado não pode estar em duas remessas');

        // ADR-0065 §2 — a transição segue a MESMA sorte da reserva, título a título.
        //
        // Qual das duas venceu é indeterminado (é uma corrida), então a asserção deriva o esperado
        // do desfecho em vez de fixá-lo: o título exclusivo da vencedora sai `Transmitted`; o da
        // perdedora fica intocado em `Approved`. É o caso que uma transição feita FORA da transação
        // da reserva quebraria em silêncio — o título da perdedora sairia `Transmitted`, preso por
        // uma remessa que nunca existiu, e nenhuma outra asserção deste arquivo perceberia.
        const soDaVencedora = ra.ok ? soDaPrimeira : soDaSegunda;
        const soDaPerdedora = ra.ok ? soDaSegunda : soDaPrimeira;

        assert.equal(await statusDoTitulo(soDaVencedora.payableId), 'Transmitted');
        assert.equal(
          await statusDoTitulo(soDaPerdedora.payableId),
          'Approved',
          'quem perde a corrida não escreve nada — nem o status do próprio título',
        );
      });

      // O CA2 da issue. Aqui ele é satisfeito por construção — reserva e gravação são a MESMA
      // transação, então não existe janela entre "reservei" e "gravei" onde algo possa falhar
      // deixando título preso por remessa inexistente. O teste fixa essa propriedade: se alguém
      // separar as duas em transações distintas, isto fica vermelho.
      //
      // ⚠️ Este teste é CEGO para deadlock, e de propósito não foi mudado. Ele verifica
      // `ra.ok !== rb.ok` e ausência de rastro — e um rollback por deadlock 1213 satisfaz as duas
      // coisas, então ele fica VERDE enquanto o ciclo acontece (medido: 8 rodadas de 8, com a
      // ordem de aquisição desfeita). Quem prova o mecanismo é o irmão logo acima, `duas emissões
      // do mesmo título: exatamente uma grava, a outra perde com nome próprio`, que exige o erro
      // NOMINAL e fica vermelho nas mesmas 8 rodadas.
      //
      // Os dois não são duplicata: este fixa a atomicidade (não sobra rastro), o irmão fixa o
      // desfecho (a recusa tem nome de negócio, não de infraestrutura). Apagar o irmão por parecer
      // redundante deixaria a suíte incapaz de distinguir "recusou" de "deadlockou".
      it('a emissão que perde a corrida não deixa rastro algum', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const disputado = await seedPayable();

        const a = build([disputado]);
        const b = build([disputado]);
        const [ra, rb] = await Promise.all([repo.save(a), repo.save(b)]);

        const perdedora = ra.ok ? b : a;
        assert.equal(ra.ok !== rb.ok, true, 'uma vence e a outra perde');

        const cabecalho = await handle.db
          .select({ id: finRemittances.id })
          .from(finRemittances)
          .where(eq(finRemittances.id, perdedora.id));
        assert.deepEqual(cabecalho, [], 'a remessa perdedora não pode ter cabeçalho gravado');
        assert.deepEqual(
          await outboxRowsOf(perdedora.id),
          [],
          'nem evento — o rollback leva a transação inteira',
        );

        // ADR-0065 §2: o título disputado ficou `Transmitted` — UMA vez, pela vencedora. Sem esta
        // asserção, "não deixa rastro" seria cego para a escrita mais importante que a transação
        // faz agora: o rollback tem de levar a transição junto, e um título que saísse
        // `Transmitted` pela perdedora estaria preso por uma remessa que não existe.
        assert.equal(
          await statusDoTitulo(disputado.payableId),
          'Transmitted',
          'a vencedora transicionou o título, e só ela',
        );
      });
    });

    // PAY-01 — a invariante do #789 vista do ESTADO, não do caminho.
    //
    // Os testes acima provam que o `save` recusa a segunda emissão. Este pergunta outra coisa: se,
    // por qualquer via, o banco chegou a um estado em que um título está preso por duas remessas
    // vivas. É a única rede que sobra no dia em que o lock falhar — e nenhuma constraint do MySQL a
    // substitui, porque a invariante é CONDICIONAL (`Discarded` devolve o título) e índice parcial
    // não existe neste dialeto.
    describe('PAY-01 — invariante: nenhum título preso por duas remessas vivas', () => {
      // A lista vem do ADAPTER, importada, e não copiada para cá.
      //
      // O acoplamento é o ponto: esta invariante vigia o estado que `HOLDING` define, e uma cópia
      // ficaria verde vigiando a regra errada no primeiro status novo que entrasse lá. Como ela é a
      // última rede do #789 — o que ela deixar passar, ninguém mais pega —, uma vigilância
      // silenciosamente desatualizada é pior que a dependência de um `export`. Quem mexer em
      // `HOLDING` mexe na vigilância no mesmo ato.
      const titulosEmDuasRemessasVivas = async (): Promise<number> => {
        const rows = await handle.db
          .select({
            payableId: finRemittancePayables.payableId,
            remittanceId: finRemittancePayables.remittanceId,
          })
          .from(finRemittancePayables)
          .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
          .where(inArray(finRemittances.status, [...HOLDING]));
        // Conta REMESSAS DISTINTAS por título: a mesma dupla repetida na tabela de vínculo é outro
        // defeito (e a PK composta já o impede), não este.
        //
        // O agrupamento acontece em memória, e é decisão consciente para banco de TESTE: traz as
        // linhas e agrupa aqui. ⚠️ Se alguém apontar esta função para volume de produção, ela
        // materializa todo o vínculo vivo — o equivalente com `GROUP BY … HAVING COUNT(DISTINCT …)`
        // faz o mesmo trabalho no servidor e é o que deve ser usado lá.
        const porTitulo = new Map<string, Set<string>>();
        for (const r of rows) {
          const atual = porTitulo.get(r.payableId) ?? new Set<string>();
          atual.add(r.remittanceId);
          porTitulo.set(r.payableId, atual);
        }
        return [...porTitulo.values()].filter((remessas) => remessas.size > 1).length;
      };

      it('o caminho normal não produz o estado proibido', async () => {
        const disputado = await seedPayable();
        const a = build([disputado]);
        const b = build([disputado]);
        const repo = createDrizzleRemittanceRepository(handle);

        const [ra, rb] = await Promise.all([repo.save(a), repo.save(b)]);
        assert.notEqual(ra.ok, rb.ok, 'exatamente uma das emissões deve gravar');
        assert.equal(await titulosEmDuasRemessasVivas(), 0);
      });

      // ─── PAY-01 estendida (#792, ADR-0065 §2) ─────────────────────────────────────────────
      //
      // A invariante acima vigia o VÍNCULO. Com o título ganhando estado próprio, uma segunda
      // invariante nasce ao lado dela e não a substitui: **`fin_payables.status = 'Transmitted'` se e
      // somente se o título é seguro por uma remessa viva.**
      //
      // Os dois lados falham de formas diferentes, e por isso são medidos separadamente:
      //
      //  - **`Transmitted` sem remessa viva** — o título está preso na tela e ninguém o vê preso. O
      //    operador não consegue pagá-lo, não consegue selecioná-lo, e a lista de remessas não
      //    explica por quê. Só o descarte (§4) devolveria, mas não há remessa a descartar.
      //  - **Seguro por remessa viva sem `Transmitted`** — o inverso, e o pior: o grid diz
      //    "Aprovado" sobre um título cujo pagamento já está a caminho do banco. É exatamente o
      //    defeito que a #792 existe para corrigir, de volta pela porta dos fundos.
      const divergenciasEntreStatusEHold = async (): Promise<
        readonly Readonly<{ payableId: string; status: string; segurado: boolean }>[]
      > => {
        const titulos = await handle.db
          .select({ id: finPayables.id, status: finPayables.status })
          .from(finPayables);

        const seguros = new Set(
          (
            await handle.db
              .select({ payableId: finRemittancePayables.payableId })
              .from(finRemittancePayables)
              .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
              .where(inArray(finRemittances.status, [...HOLDING]))
          ).map((r) => r.payableId),
        );

        return titulos
          .map((t) => ({ payableId: t.id, status: t.status, segurado: seguros.has(t.id) }))
          .filter((t) => (t.status === 'Transmitted') !== t.segurado);
      };

      it('emissão bem-sucedida deixa status e hold de acordo', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const um = await seedPayable();
        const outro = await seedPayable();

        assert.equal((await repo.save(build([um, outro]))).ok, true);

        assert.deepEqual(await divergenciasEntreStatusEHold(), []);
        assert.equal(await statusDoTitulo(um.payableId), 'Transmitted');
      });

      // Guarda contra verde por vacuidade, no molde do caso irmão logo abaixo: se a consulta não
      // olhasse de verdade, um `[]` seria indistinguível de "nada a achar".
      it('a invariante ACUSA título Transmitido sem remessa que o segure', async () => {
        const orfao = await seedPayable();
        // Forjado por UPDATE direto, contornando o `save`: ele nunca produz este estado, e é
        // justamente por isso que não serve para plantá-lo.
        await handle.db
          .update(finPayables)
          .set({ status: 'Transmitted' })
          .where(eq(finPayables.id, orfao.payableId));

        const divergencias = await divergenciasEntreStatusEHold();
        assert.equal(divergencias.length, 1);
        assert.equal(divergencias[0]?.payableId, orfao.payableId);
        assert.equal(divergencias[0]?.segurado, false);
      });

      it('a invariante ACUSA título seguro por remessa viva que ficou Aprovado', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const preso = await seedPayable();
        assert.equal((await repo.save(build([preso]))).ok, true);

        // O estado que existiria se a transição fosse desfeita sem soltar o vínculo — o defeito
        // original da #792, encenado.
        await handle.db
          .update(finPayables)
          .set({ status: 'Approved' })
          .where(eq(finPayables.id, preso.payableId));

        const divergencias = await divergenciasEntreStatusEHold();
        assert.equal(divergencias.length, 1);
        assert.equal(divergencias[0]?.payableId, preso.payableId);
        assert.equal(divergencias[0]?.segurado, true);
      });

      // A recusa vista do BANCO. O fake já prova o veredito; aqui prova-se que a transação inteira
      // reverte contra MySQL real — incluindo o título que PODIA transicionar.
      it('um título não-aprovado na seleção reverte a transação inteira', async () => {
        const repo = createDrizzleRemittanceRepository(handle);
        const aprovado = await seedPayable();
        const naoAprovado = await seedPayable('Open');

        const r = await repo.save(build([aprovado, naoAprovado]));

        assert.equal(
          isErr(r) ? r.error : null,
          'remittance-payable-not-approved',
          'erro de negócio com nome próprio, não falha de infraestrutura',
        );
        assert.equal(
          await statusDoTitulo(aprovado.payableId),
          'Approved',
          'o título que podia transicionar NÃO transicionou: a transação desfaz tudo',
        );
        assert.equal(await statusDoTitulo(naoAprovado.payableId), 'Open');
        assert.deepEqual(await divergenciasEntreStatusEHold(), []);
      });

      it('a invariante ACUSA o estado proibido (guarda contra verde por vacuidade)', async () => {
        // Forjado por INSERT direto, contornando o `save` — de propósito: o `save` recusa, e é
        // justamente essa recusa que este caso não pode usar. Sem plantar o defeito, um `0` não
        // distingue "não aconteceu" de "a consulta não olha".
        const disputado = await seedPayable();
        const duas = [build([disputado]), build([disputado])];
        for (const r of duas) {
          await handle.db.insert(finRemittances).values({
            id: r.id,
            cedenteAccountId: r.cedenteAccountId,
            nsa: r.nsa,
            fileName: r.fileName,
            contentHash: r.contentHash,
            status: 'Queued',
            // Convertido AQUI porque este INSERT pula o `save` — e com ele pula a conversão que o
            // adapter faz antes de gravar. `build()` produz ISO de propósito (é o que
            // `generateRemittance` gera de verdade), a coluna é `datetime` em `mode: 'string'`, e o
            // Drizzle repassa a string crua: sem isto, `STRICT_ALL_TABLES` recusa com 1292.
            //
            // O comentário de `build()` acima documenta este mesmo tropeço na direção oposta — a
            // fixture já esteve no formato do MySQL escrito à mão, e o teste passava contra banco
            // real enquanto o `POST` falhava com 1292. Contornar o adapter é legítimo aqui (o `save`
            // recusaria o estado que se quer plantar), mas o que ele fazia por nós vem junto.
            generatedAt: toMysqlDateTime(r.generatedAt),
          });
          await handle.db.insert(finRemittancePayables).values({
            remittanceId: r.id,
            payableId: disputado.payableId,
            documentId: disputado.documentId,
            yourNumber: `${r.nsa}`.padStart(20, '0'),
          });
        }

        assert.equal(
          await titulosEmDuasRemessasVivas(),
          1,
          'a invariante não enxergou um título plantado em duas remessas vivas',
        );
      });
    });
  });
}
