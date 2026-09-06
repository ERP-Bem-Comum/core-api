import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, close } from '#src/modules/financial/domain/cedente/cedente-account.ts';

// Suíte de CONTRATO do `CedenteAccountStore`: todo adapter (in-memory, Drizzle+MySQL) consome esta
// função e deve passar. NÃO é executada direto (sufixo `.contract.ts` — ver `.claude/rules/testing.md`
// §"Quatro naturezas de arquivo").
//
// O que este arquivo cobra é o contrato OBSERVÁVEL de `save` e `allocateNsa` — inclusive a regra que
// hoje só existe como comentário nos dois adapters: **o contador tem um único caminho de escrita, e é
// `allocateNsa`**. `save` nunca o move. Sem esta suíte, reintroduzir `nextNsa` no `set` do
// `ON DUPLICATE KEY UPDATE` deixa a suíte inteira verde.
//
// O que este arquivo NÃO cobra, por desenho:
//   - ATOMICIDADE sob concorrência real → só `nsa-allocation.drizzle-mysql.test.ts` prova (lock de
//     linha do InnoDB). Um fake sequencial nunca a demonstra.
//   - Colisão do upsert pela CHAVE NATURAL (`ON DUPLICATE KEY UPDATE` dispara em qualquer UNIQUE,
//     não só na PK) → comportamento do InnoDB que o `Map` do fake não modela; vive no arquivo MySQL.

// Espaço de chave natural EXCLUSIVO desta suíte. Os arquivos irmãos de cedente usam outras agências
// (`1234`, `4321`, `4444`, `7777`, `0001`); num backend compartilhado o UNIQUE de FR-016 colidiria se
// dois arquivos disputassem a mesma. É por esta agência que o consumidor Drizzle limpa na ENTRADA
// (`.claude/rules/testing.md` §"Limpe por TABELA, nunca por PK quando há UNIQUE natural" — aqui o
// recorte por agência É o espaço de chave que o arquivo escreve, e não atinge os irmãos).
export const CONTRACT_AGENCY = '9001';

// ⚠️ O PREFIXO DO CONVÊNIO É ESPAÇO DE CHAVE, como a agência (#943). Desde que a sequência de NSA
// passou para `fin_convenio_nsa`, o consumidor Drizzle precisa limpar TAMBÉM aquela tabela na
// entrada — senão a segunda execução contra o mesmo MySQL herda o contador da primeira, e os casos
// que esperam começar em 1 falham. É a regra de `.claude/rules/testing.md` §"passar DUAS VEZES
// seguidas": a linha da sequência sobrevive ao `DELETE` das contas, porque não tem FK para elas.
export const CONTRACT_CONVENIO_PREFIX = '91';

// Cada conta nasce com chave natural distinta: o UNIQUE de FR-016 colide se dois casos a reusarem.
let naturalKeySeq = 0;

// ⚠️ O CONVÊNIO TAMBÉM VARIA POR CONTA, e desde a #943 isso é o que isola um caso do outro: o
// contador de NSA é do CONVÊNIO, então duas contas que o compartilhassem dividiriam a sequência e um
// caso enxergaria o número que o anterior gastou. Quem PRECISA do compartilhamento pede
// explicitamente — ver `buildAccount({ convenio })` e o bloco da #943 no fim deste arquivo.
const buildAccount = (
  over: Readonly<{ nextNsa?: number; convenio?: string }> = {},
): CedenteAccount => {
  naturalKeySeq += 1;
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: CONTRACT_AGENCY,
    accountNumber: `7700${String(naturalKeySeq).padStart(2, '0')}`,
    accountDigit: '4',
    convenio:
      over.convenio ?? `${CONTRACT_CONVENIO_PREFIX}${String(naturalKeySeq).padStart(4, '0')}`,
    document: '12345678000190',
    nickname: 'Conta do contrato',
    ...(over.nextNsa !== undefined ? { nextNsa: over.nextNsa } : {}),
  });
  if (!r.ok) throw new Error(`test setup: cedente (${r.error})`);
  return r.value;
};

export type CedenteAccountStoreSetup = Readonly<{
  store: CedenteAccountStore;
  // Limpa o espaço de chave da suíte. Drizzle apaga por `CONTRACT_AGENCY`; in-memory é no-op, porque
  // `make()` já devolve store novo. Sem isso, um re-run contra o mesmo MySQL encontraria a conta do
  // run anterior — e, com `save` correto, o `nextNsa` do seed NÃO seria reescrito: o caso nasceria com
  // um contador desconhecido. O reset é o que torna o seed determinístico depois deste fix.
  reset: () => Promise<void>;
}>;

export const cedenteAccountStoreContract = (
  label: string,
  make: () => CedenteAccountStoreSetup | Promise<CedenteAccountStoreSetup>,
): void => {
  describe(`CedenteAccountStore (contrato) — ${label}`, () => {
    let store: CedenteAccountStore;

    beforeEach(async () => {
      const built = await make();
      store = built.store;
      await built.reset();
    });

    // Semeia uma conta e devolve o snapshot persistido — não o construído: o que interessa a cada caso
    // é o estado que o store guardou.
    const seed = async (
      over: Readonly<{ nextNsa?: number; convenio?: string }> = {},
      status: 'Active' | 'Closed' = 'Active',
    ) => {
      const built = buildAccount(over);
      const account = status === 'Closed' ? close(built) : { ok: true as const, value: built };
      assert.ok(isOk(account));
      assert.ok(isOk(await store.save(account.value)));

      const found = await store.findById(account.value.id);
      assert.ok(isOk(found) && found.value !== null);
      return found.value;
    };

    // ─── save ───────────────────────────────────────────────────────────────────

    // ⚠️ `nextNsa` aqui é o campo VESTIGIAL da conta (#943): desde que a sequência passou para
    // `fin_convenio_nsa`, ele não manda mais em alocação nenhuma. O caso continua porque o
    // round-trip da coluna ainda é contrato de persistência — não porque o número signifique algo.
    it('save insere a conta nova e findById devolve o snapshot, inclusive o NSA inicial', async () => {
      const account = buildAccount({ nextNsa: 4 });
      assert.ok(isOk(await store.save(account)));

      const found = await store.findById(account.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.id, account.id);
      assert.equal(found.value.agency, CONTRACT_AGENCY);
      assert.equal(found.value.status, 'Active');
      // Na criação o contador NASCE do snapshot: é a linha que ainda não existe, e não há valor
      // concorrente a preservar.
      assert.equal(found.value.nextNsa, 4);
    });

    it('save em id existente atualiza os campos editáveis', async () => {
      const account = await seed();

      const closed = close({ ...account, nickname: 'apelido novo' });
      assert.ok(isOk(closed));
      assert.ok(isOk(await store.save(closed.value)));

      const found = await store.findById(account.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.status, 'Closed');
      assert.equal(found.value.nickname, 'apelido novo');
    });

    /*
     * ⚠️ O UPDATE É CONFERIDO CAMPO A CAMPO, e a razão é um defeito medido (#856).
     *
     * O adapter Drizzle faz `onDuplicateKeyUpdate({ set: {...} })` com a lista de colunas escrita À
     * MÃO. O `values(row)` do INSERT vem de `toRow` e ganha coluna nova de graça; o `set` não. Uma
     * coluna esquecida ali é gravada na conta NOVA e descartada na EDIÇÃO — o use case devolve 200
     * com o valor ecoado do agregado em memória, e a coluna fica NULL.
     *
     * E o compilador não cobra: `$inferInsert` torna coluna nullable OPCIONAL no tipo. Nem o fake
     * cobra: o in-memory substitui o objeto inteiro por spread, então ele acerta sempre. O caso
     * acima passava verde asserindo `status` e `nickname` — por acaso, as duas colunas que ESTAVAM
     * na lista.
     *
     * Este caso é a rede: ele varre o snapshot inteiro, então toda coluna futura entra sozinha.
     */
    it('save em id existente preserva TODOS os campos, não só os que alguém lembrou de listar', async () => {
      const account = await seed();

      // Um valor diferente do semeado em cada campo editável, para o assert distinguir "gravou" de
      // "por acaso já era isso".
      const edited: CedenteAccount = {
        ...account,
        agencyDigit: '7',
        nickname: 'apelido novo',
        bankName: 'BANCO NOVO',
        convenio: '123456',
      };
      assert.ok(isOk(await store.save(edited)));

      const found = await store.findById(account.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.deepEqual(
        found.value,
        edited,
        'algum campo do agregado não sobreviveu ao UPDATE — confira o `set` do onDuplicateKeyUpdate',
      );
    });

    // O caso que justifica esta suíte existir — regressão do lost update em produção.
    //
    // `edit-cedente-account.ts` (e `close-cedente-account.ts`) leem a conta, montam o objeto por spread
    // do que leram — sem tocar `nextNsa` — e chamam `save`. Se uma alocação completar ENTRE a leitura e
    // o `save`, o snapshot em mãos do use case carrega o contador OBSOLETO. Um `save` que o gravasse
    // faria o contador RETROCEDER, e um NSA já emitido seria reemitido — que o banco trata como
    // RETRANSMISSÃO, não como remessa nova.
    // ⚠️ ESTE CASO FOI REESCRITO NA #943, e a razão importa mais que o novo corpo. Ele media que o
    // `save` não escrevia `fin_cedente_accounts.next_nsa`, porque o contador vivia ali e um snapshot
    // obsoleto o faria retroceder. O contador MUDOU DE TABELA: agora é `fin_convenio_nsa`, do
    // convênio, e o `save` da conta não tem caminho nenhum até ele.
    //
    // A propriedade deixou de ser "o `save` não retrocede o contador" e passou a ser ESTRUTURAL: o
    // `save` não alcança a sequência. Vale mais, e por isso o caso continua existindo em vez de sair
    // — o que ele vigia é que ninguém religue os dois pelo caminho antigo.
    it('save com snapshot obsoleto não alcança a sequência (o lost update ficou impossível)', async () => {
      const staleSnapshot = await seed();

      const allocated = await store.allocateNsa(staleSnapshot.id);
      assert.ok(isOk(allocated));
      assert.equal(allocated.value, 1, 'convênio novo começa no mínimo da faixa');

      // O `save` chega DEPOIS, com o snapshot que o use case leu antes da alocação — e ainda traz o
      // `next_nsa` vestigial da conta, que hoje não manda em nada.
      assert.ok(isOk(await store.save({ ...staleSnapshot, nickname: 'apelido novo' })));

      const found = await store.findById(staleSnapshot.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.nickname, 'apelido novo', 'a edição normal foi persistida');

      // O que importa: a sequência do convênio seguiu de onde estava. O 1 já emitido não volta.
      const next = await store.allocateNsa(staleSnapshot.id);
      assert.ok(isOk(next));
      assert.equal(next.value, 2, 'um `save` reposicionou a sequência do convênio');
    });

    // A garantia é FORTE, e a distinção não é acadêmica: o contrato promete que `save` **não escreve**
    // o contador, não que ele "não o retrocede". A versão fraca — recusar valor menor, aceitar maior —
    // deixaria um snapshot obsoleto com valor MAIOR mandar no contador, e metade da classe do lost
    // update voltaria por essa porta. Reposicionar o NSA, se o banco um dia pedir, é operação rara,
    // perigosa e auditável: pede método próprio e explícito no port, não carona num `save` que a
    // edição de um apelido dispara.
    // A garantia continua FORTE e mudou de alvo (#943): nenhum valor que o chamador ponha no
    // agregado — em direção nenhuma — reposiciona a sequência do convênio. Reposicionar o NSA, se o
    // banco um dia pedir, é operação rara, perigosa e auditável: pede método próprio e explícito no
    // port, não carona num `save` que a edição de um apelido dispara.
    it('save não move a sequência nem quando o snapshot traz um NSA deliberadamente diferente', async () => {
      const account = await seed();

      // Para CIMA e para BAIXO: os dois são ignorados, porque o campo da conta não é mais o contador.
      assert.ok(isOk(await store.save({ ...account, nextNsa: 40 })));
      assert.ok(isOk(await store.save({ ...account, nextNsa: 2 })));

      // A sequência do convênio nunca foi tocada: continua no primeiro número.
      const next = await store.allocateNsa(account.id);
      assert.ok(isOk(next));
      assert.equal(next.value, 1, 'um `save` moveu a sequência do convênio');
    });

    // ─── allocateNsa ────────────────────────────────────────────────────────────

    it('allocateNsa devolve o número corrente e avança a sequência persistida', async () => {
      const account = await seed();

      const first = await store.allocateNsa(account.id);
      assert.ok(isOk(first));
      assert.equal(first.value, 1);

      const second = await store.allocateNsa(account.id);
      assert.ok(isOk(second));
      assert.equal(second.value, 2, 'a sequência não avançou entre as duas alocações');
    });

    it('allocateNsa em chamadas sucessivas nunca repete o número', async () => {
      const account = await seed();
      const allocated: number[] = [];

      for (let i = 0; i < 5; i += 1) {
        const r = await store.allocateNsa(account.id);
        assert.ok(isOk(r));
        allocated.push(r.value);
      }

      assert.deepEqual(allocated, [1, 2, 3, 4, 5]);
      assert.equal(new Set(allocated).size, 5);
    });

    it('allocateNsa em conta inexistente devolve not-found, não zero', async () => {
      const r = await store.allocateNsa(CedenteAccountId.generate());
      assert.ok(isErr(r));
      assert.equal(r.error, 'cedente-account-not-found');
    });

    /*
     * ⚠️ CA1 DA #943 — O CASO QUE REPRODUZ O BLOQUEIO DE PRODUÇÃO, e que nenhuma suíte tinha.
     *
     * O mesmo contrato multipag vale para VÁRIAS contas de pagamento (confirmado com o gerente do
     * Bradesco em 02/09/2026). Enquanto o contador viveu em `fin_cedente_accounts.next_nsa`, cada
     * conta nova nascia em 1 e as duas emitiam o MESMO número sob o mesmo contrato.
     *
     * O dano não esperava o banco: `fin_remittance_payables.your_number` é
     * `<convênio><NSA><sequência>`, com UNIQUE global e SEM componente de tempo. As duas contas
     * geravam a mesma referência para o primeiro título, e o segundo INSERT era recusado — 503
     * opaco, conta sem conseguir gerar remessa (#942).
     *
     * Este caso falha contra o modelo antigo: as duas alocações devolviam 1.
     */
    it('CA1: contas do MESMO convênio compartilham a sequência — números distintos e crescentes', async () => {
      const convenio = '918002';
      const first = await seed({ convenio });
      const second = await seed({ convenio });

      const a = await store.allocateNsa(first.id);
      const b = await store.allocateNsa(second.id);
      assert.ok(isOk(a) && isOk(b));

      assert.equal(a.value, 1);
      assert.equal(b.value, 2, 'a conta irmã reemitiu o número — é o defeito da #943');
      assert.notEqual(a.value, b.value, 'NSA repetido sob o mesmo contrato é retransmissão');
    });

    // CA2 — o outro lado: convênios distintos NÃO se conhecem. Não é critério defensivo; o cliente
    // tem contas com convênios diferentes, e cada contrato tem a sua série junto ao banco.
    it('CA2: convênios distintos mantêm sequências independentes', async () => {
      const here = await seed({ convenio: '918003' });
      const there = await seed({ convenio: '918004' });

      const a = await store.allocateNsa(here.id);
      const b = await store.allocateNsa(there.id);
      assert.ok(isOk(a) && isOk(b));

      assert.equal(a.value, 1);
      assert.equal(b.value, 1, 'o primeiro número de um contrato gastou o do outro');
    });

    // ⚠️ A ORDEM DENTRO DA TRANSAÇÃO, e é por isso que este caso confere a sequência DEPOIS: a conta
    // é verificada ANTES de a sequência ser tocada. Invertida, uma conta encerrada queimaria um
    // número do convênio INTEIRO — e o número não volta. Com o contador na conta o dano ficava
    // contido nela; agora ele atingiria todas as contas irmãs.
    it('allocateNsa em conta encerrada não aloca e não queima número do convênio', async () => {
      const convenio = '918001';
      const closed = await seed({ convenio }, 'Closed');
      const active = await seed({ convenio });

      const r = await store.allocateNsa(closed.id);
      assert.ok(isErr(r));
      assert.equal(r.error, 'cedente-account-not-active');

      // A conta IRMÃ, ativa e sob o mesmo convênio, recebe o primeiro número — prova de que a
      // tentativa recusada não consumiu nada da sequência compartilhada.
      const next = await store.allocateNsa(active.id);
      assert.ok(isOk(next));
      assert.equal(next.value, 1, 'a conta encerrada queimou um número do convênio');
    });

    // O teto (seis dígitos no header, Multipag p. 14) é regra de DOMÍNIO e está coberto em
    // `nsa-sequence.test.ts`, que alcança `Nsa.MAX` sem precisar de banco. Aqui ele saiu de propósito:
    // com o contador fora da conta, criar a conta deixou de posicionar a sequência, e chegar ao teto
    // pelo contrato exigiria 999.999 alocações ou um caminho de escrita direto — que é exatamente o
    // que o caso acima existe para negar.
  });
};
