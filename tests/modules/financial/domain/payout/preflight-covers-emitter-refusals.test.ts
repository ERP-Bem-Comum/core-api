import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { CnabTranslateError } from '#src/modules/financial/application/ports/cnab-remittance-translator.ts';
import type {
  PayeePaymentTarget,
  PayoutCandidate,
  PayoutReadiness,
} from '#src/modules/financial/domain/payout/types.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';

/*
 * CA3 da #948, a metade ESTRUTURAL — a rede que não precisa ser reescrita a cada campo novo.
 *
 * Já havia duas redes por campo: `pix-key-single-source` (#948) e `inscription-single-source`
 * (#863). Cada uma nasceu DEPOIS do defeito que ela impede, e é essa a limitação: elas cobrem o que
 * já se descobriu. A CA3 pede a outra coisa — varrer a união INTEIRA de recusas do emissor e cobrar,
 * de cada variante, uma resposta à pergunta "e o pré-voo, barra isto antes do `allocateNsa`?".
 *
 * ⚠️ O MECANISMO É O `Record<CnabTranslateError, Coverage>` ABAIXO, e não os `assert`. Uma recusa
 * nova na união não compila até ser classificada aqui — o compilador cobra a resposta antes de o
 * teste rodar. Os `assert` são a segunda metade: classificar como coberto e não estar é o erro que
 * um teste de tipos puro deixaria passar, então cada `preflight` EXECUTA o pré-voo de verdade.
 *
 * Por que isto importa mais que os outros testes deste diretório: a recusa do emissor chega DEPOIS
 * do NSA consumido sob lock, e o número não volta por desenho (`.claude/rules/cnab.md`). Toda
 * variante sem contraparte é uma tentativa de remessa que queima sequência e devolve ao operador uma
 * mensagem que não aponta campo nenhum.
 */

// Código de barras de 44 dígitos, sintético — mesma fixture de `payout-readiness.test.ts`. Serve só
// para a rota da guia chegar ao veredito de emissor sem tropeçar antes na conversão do título.
const BARCODE = '23791234500000150000123456789012345678901234';

const target = (over: Partial<PayeePaymentTarget> = {}): PayeePaymentTarget => ({
  bank: '237',
  agency: '1234',
  accountNumber: '567890',
  checkDigit: '0',
  pixKey: null,
  document: '00000000000191', // inscrição sintética; o repositório é público
  ...over,
});

const candidate = (over: Partial<PayoutCandidate>): PayoutCandidate => ({
  paymentMethod: 'TED',
  paymentDetail: null,
  payee: target(),
  ...over,
});

const readinessOf = (over: Partial<PayoutCandidate>): PayoutReadiness =>
  checkPayoutReadiness(candidate(over));

/**
 * O que o pré-voo faz com o título que o emissor recusaria.
 *
 * `preflight`   — barra o título antes do NSA. `probe` demonstra, executando.
 * `file-scope`  — a recusa não é do TÍTULO, é do arquivo ou do cedente. O pré-voo é por título e não
 *                 tem onde vê-la; anteciparia perguntando outra coisa, em outro lugar.
 * `gap`         — o emissor recusa e o pré-voo aprova. Declarado, com issue: é dívida conhecida, não
 *                 omissão. Entrada nova aqui exige issue aberta.
 */
type Coverage =
  | Readonly<{ kind: 'preflight'; probe: () => void }>
  | Readonly<{ kind: 'file-scope'; why: string }>
  | Readonly<{ kind: 'gap'; why: string; issue: string }>;

const blocks = (readiness: PayoutReadiness, hint: string): void => {
  assert.notEqual(
    readiness.status,
    'ready',
    `o pré-voo aprovou o que o emissor recusa (${hint}) — a recusa chegaria com o NSA já queimado`,
  );
};

const COVERAGE: Record<CnabTranslateError, Coverage> = {
  // ── Recusas do TÍTULO, e o pré-voo as antecipa ────────────────────────────────────────────────
  'cnab-pix-key-unrepresentable': {
    kind: 'preflight',
    probe: () => {
      blocks(
        readinessOf({
          paymentMethod: 'PIX',
          payee: target({ pixKey: { keyType: 'email', key: 'k'.repeat(100) } }),
        }),
        'chave Pix acima de 99 posições (G101)',
      );
    },
  },
  'cnab-pix-key-type-unsupported': {
    kind: 'preflight',
    probe: () => {
      blocks(
        readinessOf({
          paymentMethod: 'PIX',
          payee: target({ pixKey: { keyType: 'iban', key: 'BR1234567890' } }),
        }),
        'tipo de chave fora do domínio G100',
      );
    },
  },
  'cnab-inscription-alphanumeric-unsupported': {
    kind: 'preflight',
    probe: () => {
      blocks(
        readinessOf({ payee: target({ document: '12ABC34501DE35' }) }),
        'CNPJ alfanumérico num campo que o layout declara Num (ADR-0044)',
      );
    },
  },
  'cnab-launch-form-unsupported': {
    kind: 'preflight',
    // A contraparte não é uma LACUNA: é o status `no-issuer`, que a #837 criou exatamente para
    // separar "falta dado" de "falta emissor". A guia tem rota e não tem montador.
    probe: () => {
      assert.equal(
        readinessOf({ paymentMethod: 'GuiaRecolhimento', paymentDetail: BARCODE }).status,
        'no-issuer',
        'a rota sem emissor deveria sair como `no-issuer`, e não aprovada',
      );
    },
  },

  // ── Recusas do ARQUIVO ou do CEDENTE — fora do alcance de uma régua por título ────────────────
  'cnab-convenio-missing': {
    kind: 'file-scope',
    why: 'convênio é do cedente e vive na configuração da conta, não no título (#804)',
  },
  'cnab-convenio-overflow': {
    kind: 'file-scope',
    why: 'mesma origem do anterior — acima de 6 posições o banco trunca e processa sob outro contrato',
  },
  'cnab-file-name-failed': {
    kind: 'file-scope',
    why: 'o nome do arquivo é derivado do NSA e da data, e nenhum dos dois existe antes da geração',
  },
  'cnab-malformed-file': {
    kind: 'file-scope',
    why: 'veredito do `remittance-inspector` sobre o arquivo MONTADO — por definição, não há arquivo no pré-voo',
  },
  'cnab-translation-failed': {
    kind: 'file-scope',
    why: 'desfecho genérico do montador; não nomeia campo, então não há o que antecipar por título',
  },

  // ── Dívida declarada ──────────────────────────────────────────────────────────────────────────
  'cnab-billet-party-unidentified': {
    kind: 'gap',
    // ⚠️ Medido, não suposto: boleto com inscrição válida e NOME em branco sai `ready` no pré-voo e
    // `billet-party-unidentified` no emissor, com o NSA já consumido. `'€€€'` cai no mesmo lugar,
    // porque `alpha()` o transforma em brancos (#862) e a guarda mede o que VAI PARA O ARQUIVO.
    //
    // A causa é estrutural e não se conserta neste arquivo: `PayeePaymentTarget` (`types.ts`) não
    // tem campo de NOME. O pré-voo não vê o dado que o emissor guarda — não é régua faltando, é
    // dado que não chega. Fechar exige levar o nome até o candidato, passando pelo reader e pela
    // composição da borda.
    why: 'a guarda do J-52 mede o NOME do sacado/cedente, e `PayeePaymentTarget` não carrega nome',
    issue: 'https://github.com/ERP-Bem-Comum/core-api/issues/985',
  },
};

describe('#948 CA3 — toda recusa do emissor tem resposta do pré-voo', () => {
  it('as variantes classificadas como cobertas realmente bloqueiam o título', () => {
    for (const [error, coverage] of Object.entries(COVERAGE)) {
      if (coverage.kind !== 'preflight') continue;
      assert.doesNotThrow(() => {
        coverage.probe();
      }, `${error}: a sonda do pré-voo falhou`);
    }
  });

  // A classificação `gap` é a única que admite o pré-voo aprovar o que o emissor recusa, e por isso
  // é a única que exige rastro. Sem esta cobrança, `gap` viraria o balde onde a próxima variante cai
  // para o teste continuar verde — que é o oposto do que a CA3 pede.
  it('toda dívida declarada aponta uma issue', () => {
    for (const [error, coverage] of Object.entries(COVERAGE)) {
      if (coverage.kind !== 'gap') continue;
      assert.match(
        coverage.issue,
        /^https:\/\/github\.com\/ERP-Bem-Comum\/core-api\/issues\/\d+$/,
        `${error}: dívida declarada sem issue rastreável`,
      );
    }
  });

  // ⚠️ Guarda contra o esvaziamento silencioso. O `Record` cobra que toda variante seja classificada,
  // mas não impede que alguém troque `preflight` por `file-scope` em massa e deixe o teste verde sem
  // sonda nenhuma. Este caso fixa que a rede continua MEDINDO alguma coisa.
  it('a rede não fica sem sondas executáveis', () => {
    const probed = Object.values(COVERAGE).filter((c) => c.kind === 'preflight');
    assert.ok(probed.length >= 4, `só ${probed.length} variantes executam o pré-voo`);
  });
});
