// A metade CONSUMIDORA do contrato do `status/`. A produtora vive noutro repositório — o
// `van-agent` (issue #735), que roda na máquina Windows e publica estes envelopes.
//
// Os dois lados são cobrados contra o MESMO arquivo: `status-envelope.golden.json` aqui é cópia
// literal de `van-agent/testdata/status-envelope.golden.json`, que lá é GERADO pelo código do
// produtor (`go test ./internal/envelope -update`), nunca escrito à mão.
//
// Por que isto existe: `status-envelope.ts` foi escrito contra um contrato acordado por chamado, e
// até agora nada verificava que o produtor produz o que este parser aceita. A divergência mais cara
// deste componente é silenciosa — o agente publicaria um desfecho que o backend descarta, e a
// remessa ficaria em estado desconhecido sem ninguém errar visivelmente.
//
// ⚠️ Quando este teste quebrar, a pergunta NÃO é "como faço passar". É qual das duas metades mudou,
// e se a outra acompanhou. Editar o golden para calar o vermelho apaga exatamente o sinal.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isOk } from '#src/shared/index.ts';
import {
  parseStatus,
  wasTransmitted,
} from '#src/modules/financial/adapters/van/status-envelope.ts';

type GoldenCase = Readonly<{
  nome: string;
  tipo: 'remittance' | 'duplicate' | 'reception';
  contaComoTransmissao: boolean;
  chave: string;
  envelope: Readonly<{
    arquivo: string;
    executadoEm: string;
    situacao: string;
    detalhe: string;
    exitCode: number | null;
    logTransferencia: readonly string[];
  }>;
}>;

type GoldenFile = Readonly<{ descricao: string; fonte: string; casos: readonly GoldenCase[] }>;

const golden = JSON.parse(
  readFileSync(join(import.meta.dirname, 'status-envelope.golden.json'), 'utf8'),
) as GoldenFile;

describe('status/ — o contrato com o van-agent (golden compartilhado)', () => {
  // Se o golden encolher, os casos somem sem que nenhuma asserção falhe — a suíte ficaria verde
  // cobrindo menos. A contagem é o piso; casos novos são bem-vindos, remoção precisa ser deliberada.
  it('carrega os casos do contrato', () => {
    assert.ok(
      golden.casos.length >= 5,
      `o golden tem ${golden.casos.length} caso(s), esperava ao menos 5`,
    );
  });

  for (const caso of golden.casos) {
    describe(caso.nome, () => {
      const content = JSON.stringify(caso.envelope);

      it('é aceito pelo parser', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(
          isOk(parsed),
          `o parser recusou um envelope que o agente produz: ${JSON.stringify(parsed)}`,
        );
      });

      it('é classificado pelo tipo que o agente declara', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(parsed.value.kind, caso.tipo);
      });

      it('preserva os campos que o operador vê', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(parsed.value.fileName, caso.envelope.arquivo);
        assert.equal(parsed.value.situation, caso.envelope.situacao);
        assert.equal(parsed.value.detail, caso.envelope.detalhe);
        assert.equal(parsed.value.exitCode, caso.envelope.exitCode);
      });

      // A regra que decide se um pagamento é dado por enviado. `duplicate` é o caso perigoso: ele
      // declara `situacao: "transmitido"` e mesmo assim NÃO conta — significa que o agente
      // reconheceu o nome e não acionou o cliente, então nada saiu nesta execução.
      it('decide corretamente se conta como transmissão', () => {
        const parsed = parseStatus(caso.chave, content);
        assert.ok(isOk(parsed));
        assert.equal(
          wasTransmitted(parsed.value),
          caso.contaComoTransmissao,
          `wasTransmitted divergiu para "${caso.nome}" (tipo ${caso.tipo}, situação ${caso.envelope.situacao})`,
        );
      });
    });
  }
});

describe('status/ — os invariantes do produtor que quebram o consumidor em silêncio', () => {
  const first = golden.casos[0]!;

  // Um slice nil em Go serializa como `null`, e o parser exige `Array.isArray`. É a diferença
  // entre um ciclo sem log — normal — e um envelope recusado.
  it('todo caso do golden traz logTransferencia como array', () => {
    for (const caso of golden.casos) {
      assert.ok(
        Array.isArray(caso.envelope.logTransferencia),
        `"${caso.nome}" trouxe logTransferencia que não é array`,
      );
    }
  });

  it('recusa o envelope se logTransferencia vier null', () => {
    const quebrado = JSON.stringify({ ...first.envelope, logTransferencia: null });
    const parsed = parseStatus(first.chave, quebrado);
    assert.ok(!isOk(parsed), 'logTransferencia null precisa ser recusado, não absorvido');
  });

  // `exitCode: null` é o caso do duplicado: o cliente NÃO foi executado. Trocar por 0 diria
  // "executou e deu certo" — a conclusão oposta.
  it('aceita exitCode null, que é o do duplicado', () => {
    const duplicado = golden.casos.find((c) => c.tipo === 'duplicate');
    assert.ok(duplicado, 'o golden precisa cobrir o caso de duplicado');
    assert.equal(duplicado.envelope.exitCode, null);

    const parsed = parseStatus(duplicado.chave, JSON.stringify(duplicado.envelope));
    assert.ok(isOk(parsed));
    assert.equal(parsed.value.exitCode, null);
  });

  // O agente grava UTF-8 sem BOM, mas o parser tolera o BOM de propósito: se algo no caminho
  // reencodar o objeto, falhar a leitura deixaria a remessa em estado desconhecido por um
  // caractere invisível.
  it('tolera BOM, mesmo o agente não gravando com ele', () => {
    const comBom = '﻿' + JSON.stringify(first.envelope);
    const parsed = parseStatus(first.chave, comBom);
    assert.ok(isOk(parsed));
  });

  // Situação nova exige decisão nossa. Silenciá-la como "falha" esconderia uma mudança de contrato
  // do outro lado — que é justamente o que este arquivo existe para tornar visível.
  it('recusa situação fora do vocabulário em vez de adivinhar', () => {
    const inventada = JSON.stringify({ ...first.envelope, situacao: 'quase-transmitido' });
    const parsed = parseStatus(first.chave, inventada);
    assert.ok(!isOk(parsed), 'situação desconhecida precisa ser recusada');
  });
});
