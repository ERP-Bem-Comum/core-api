import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, close } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Nsa from '#src/modules/financial/domain/cedente/nsa.ts';

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

// Cada conta nasce com chave natural distinta: o UNIQUE de FR-016 colide se dois casos a reusarem.
let naturalKeySeq = 0;
const buildAccount = (nextNsa?: number): CedenteAccount => {
  naturalKeySeq += 1;
  const r = create({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: CONTRACT_AGENCY,
    accountNumber: `7700${String(naturalKeySeq).padStart(2, '0')}`,
    accountDigit: '4',
    convenio: '9999999',
    document: '12345678000190',
    nickname: 'Conta do contrato',
    ...(nextNsa !== undefined ? { nextNsa } : {}),
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
    const seed = async (nextNsa?: number, status: 'Active' | 'Closed' = 'Active') => {
      const built = buildAccount(nextNsa);
      const account = status === 'Closed' ? close(built) : { ok: true as const, value: built };
      assert.ok(isOk(account));
      assert.ok(isOk(await store.save(account.value)));

      const found = await store.findById(account.value.id);
      assert.ok(isOk(found) && found.value !== null);
      return found.value;
    };

    // ─── save ───────────────────────────────────────────────────────────────────

    it('save insere a conta nova e findById devolve o snapshot, inclusive o NSA inicial', async () => {
      const account = buildAccount(4);
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

    // O caso que justifica esta suíte existir — regressão do lost update em produção.
    //
    // `edit-cedente-account.ts` (e `close-cedente-account.ts`) leem a conta, montam o objeto por spread
    // do que leram — sem tocar `nextNsa` — e chamam `save`. Se uma alocação completar ENTRE a leitura e
    // o `save`, o snapshot em mãos do use case carrega o contador OBSOLETO. Um `save` que o gravasse
    // faria o contador RETROCEDER, e um NSA já emitido seria reemitido — que o banco trata como
    // RETRANSMISSÃO, não como remessa nova.
    it('save com snapshot anterior a uma alocação concorrente não retrocede o contador (lost update)', async () => {
      const staleSnapshot = await seed(1);
      assert.equal(staleSnapshot.nextNsa, 1);

      // Alocação concorrente avança o contador persistido para 2.
      const allocated = await store.allocateNsa(staleSnapshot.id);
      assert.ok(isOk(allocated));
      assert.equal(allocated.value, 1);

      // O `save` chega DEPOIS, carregando o snapshot obsoleto — como faria a edição de um `nickname`
      // por quem não soube da alocação.
      assert.ok(isOk(await store.save({ ...staleSnapshot, nickname: 'apelido novo' })));

      const found = await store.findById(staleSnapshot.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.nextNsa, 2, 'o contador retrocedeu: lost update de volta');
      // A edição em si — campo que não é o contador — foi persistida normalmente.
      assert.equal(found.value.nickname, 'apelido novo');

      // E o próximo NSA continua de onde a alocação deixou: o 1 já emitido nunca se repete.
      const next = await store.allocateNsa(staleSnapshot.id);
      assert.ok(isOk(next));
      assert.equal(next.value, 2);
    });

    // A garantia é FORTE, e a distinção não é acadêmica: o contrato promete que `save` **não escreve**
    // o contador, não que ele "não o retrocede". A versão fraca — recusar valor menor, aceitar maior —
    // deixaria um snapshot obsoleto com valor MAIOR mandar no contador, e metade da classe do lost
    // update voltaria por essa porta. Reposicionar o NSA, se o banco um dia pedir, é operação rara,
    // perigosa e auditável: pede método próprio e explícito no port, não carona num `save` que a
    // edição de um apelido dispara.
    it('save não move o contador nem quando o snapshot traz um NSA deliberadamente diferente', async () => {
      const account = await seed(5);
      assert.equal(account.nextNsa, 5);

      // Para BAIXO (5 → 2): o retrocesso do lost update, agora deliberado.
      assert.ok(isOk(await store.save({ ...account, nextNsa: 2 })));
      const afterDown = await store.findById(account.id);
      assert.ok(isOk(afterDown) && afterDown.value !== null);
      assert.equal(afterDown.value.nextNsa, 5, 'o contador retrocedeu por um `save`');

      // Para CIMA (5 → 40): o "pulo" deliberado, recusado pela mesma razão — `save` não é caminho de
      // escrita do contador em direção nenhuma.
      assert.ok(isOk(await store.save({ ...account, nextNsa: 40 })));
      const afterUp = await store.findById(account.id);
      assert.ok(isOk(afterUp) && afterUp.value !== null);
      assert.equal(
        afterUp.value.nextNsa,
        5,
        'o contador avançou por um `save`, não por `allocateNsa`',
      );

      // E a alocação segue de onde o contador realmente está — 5, nem 2 nem 40.
      const next = await store.allocateNsa(account.id);
      assert.ok(isOk(next));
      assert.equal(next.value, 5);
    });

    // ─── allocateNsa ────────────────────────────────────────────────────────────

    it('allocateNsa devolve o número corrente e avança o contador persistido', async () => {
      const account = await seed(5);

      const first = await store.allocateNsa(account.id);
      assert.ok(isOk(first));
      assert.equal(first.value, 5);

      const found = await store.findById(account.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.nextNsa, 6);
    });

    it('allocateNsa em chamadas sucessivas nunca repete o número', async () => {
      const account = await seed(1);
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

    it('allocateNsa em conta encerrada não aloca e não move o contador', async () => {
      const account = await seed(3, 'Closed');

      const r = await store.allocateNsa(account.id);
      assert.ok(isErr(r));
      assert.equal(r.error, 'cedente-account-not-active');

      const found = await store.findById(account.id);
      assert.ok(isOk(found) && found.value !== null);
      assert.equal(found.value.nextNsa, 3);
    });

    // O teto não é arbitrário: o NSA ocupa seis dígitos no header de arquivo (Multipag p. 14). Alocar
    // além dele gravaria um número que não cabe no campo — o defeito só apareceria na serialização,
    // com a remessa inteira já montada.
    it('allocateNsa com a faixa esgotada falha sem estourar o campo de seis dígitos', async () => {
      const account = await seed(Nsa.MAX);

      const last = await store.allocateNsa(account.id);
      assert.ok(isOk(last));
      assert.equal(last.value, Nsa.MAX);

      const beyond = await store.allocateNsa(account.id);
      assert.ok(isErr(beyond));
      assert.equal(beyond.error, 'nsa-exhausted');
    });
  });
};
