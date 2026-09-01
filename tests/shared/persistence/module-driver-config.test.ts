/**
 * SHARED-DRIVER-BOOT-GUARD — a guarda de boot dos 7 módulos (#456, #799, ADR-0068).
 *
 * Nasceu com a spec 037 (#456) sob política ASSIMÉTRICA: produção derrubava o boot, o resto
 * degradava para memória com aviso. O **ADR-0068 (31/08/2026) removeu a assimetria** — configuração
 * ausente ou recusada derruba o boot em TODO ambiente, e `memory` deixou de ser valor aceito de
 * `X_DRIVER`.
 *
 * O que esta suíte protege, e por que cada grupo existe:
 *
 *   - **US1/US2** — o diagnóstico. Erro nomeia módulo E variável (FR-010) e vem completo numa
 *     tentativa (FR-005), para o operador consertar tudo num deploy só.
 *   - **Sem exceção de ambiente** — a propriedade nova do ADR-0068, e a mais fácil de desfazer sem
 *     querer: basta alguém reintroduzir um `isProductionEnv` para a assimetria voltar em silêncio.
 *     Os casos aqui comparam o MESMO env com e sem `NODE_ENV=production` e exigem retorno idêntico.
 *   - **Exclusões por ADR (casos 13 e 14)** — os mais importantes da suíte. Travam a implementação
 *     para que ela NÃO endureça duas degradações que têm ADR aceito: réplica de leitura (ADR-0026) e
 *     composição de programa (ADR-0032). Fail-fast em env não pode transbordar para elas.
 *   - **Invariante de credencial** — CWE-532/CWE-117, um controle que já falhou uma vez.
 *
 * O adapter em memória NÃO morreu: ele segue como double de teste, injetado por parâmetro em
 * `build<Módulo>HttpDeps({ driver: 'memory' })`. Aquela é outra fronteira; esta lê ambiente.
 *
 * Nenhuma asserção depende de acentuação nem de frase exata — só de nome de módulo, nome de variável
 * e do valor recebido, que são os três elementos exigidos por FR-010.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readModuleDriverConfigs } from '#src/shared/persistence/module-driver-config.ts';

type Env = Readonly<Record<string, string | undefined>>;

// Endereços distintos por módulo. No deploy real todos apontam para o mesmo database `core`
// (isolamento por prefixo — ADR-0014); aqui são distintos de propósito, para que os casos de
// cascata provem que o `reports` liga cada fonte ao módulo certo, e não a "uma URL qualquer".
const URL_AUTH = 'mysql://app@db:3306/core_auth';
const URL_CONTRACTS = 'mysql://app@db:3306/core_contracts';
const URL_PARTNERS = 'mysql://app@db:3306/core_partners';
const URL_PROGRAMS = 'mysql://app@db:3306/core_programs';
const URL_FINANCIAL = 'mysql://app@db:3306/core_financial';
const URL_BUDGET_PLANS = 'mysql://app@db:3306/core_budget_plans';
const URL_REPORTS_OVERRIDE = 'mysql://app@replica:3306/core_reports_override';

/**
 * Os 7 módulos corretamente configurados. **Sem `NODE_ENV`, de propósito:** sob o ADR-0068 o
 * ambiente não participa da decisão, e um fixture que carregasse `production` esconderia isso.
 *
 * Note o que também NÃO está aqui:
 *   - `CONTRACTS_READER_URL` / `PARTNERS_READER_URL` — réplica é opcional (ADR-0026, caso 13);
 *   - os 4 overrides `REPORTS_*_DATABASE_URL` — resolvem por cascata (FR-012, caso 11).
 */
const ALL_MYSQL: Env = {
  AUTH_DRIVER: 'mysql',
  AUTH_DATABASE_URL: URL_AUTH,
  CONTRACTS_DRIVER: 'mysql',
  CONTRACTS_DATABASE_URL: URL_CONTRACTS,
  PARTNERS_DRIVER: 'mysql',
  PARTNERS_DATABASE_URL: URL_PARTNERS,
  PROGRAMS_DRIVER: 'mysql',
  PROGRAMS_DATABASE_URL: URL_PROGRAMS,
  FINANCIAL_DRIVER: 'mysql',
  FINANCIAL_DATABASE_URL: URL_FINANCIAL,
  BUDGET_PLANS_DRIVER: 'mysql',
  BUDGET_PLANS_DATABASE_URL: URL_BUDGET_PLANS,
  REPORTS_DRIVER: 'mysql',
};

/** Devolve uma cópia do ambiente sem as chaves informadas (simula variável não declarada). */
const without = (env: Env, ...keys: readonly string[]): Env =>
  Object.fromEntries(Object.entries(env).filter(([key]) => !keys.includes(key)));

/** Junta as mensagens de erro num texto só, para asserção por conteúdo. */
const errorText = (result: ReturnType<typeof readModuleDriverConfigs>): string =>
  result.ok ? '' : result.error.join('\n');

describe('SHARED-DRIVER-BOOT-GUARD — US1: deploy incompleto barrado antes de servir trafego', () => {
  it('caso 1 — driver ausente: erro nomeia o modulo E a variavel (#374)', () => {
    const r = readModuleDriverConfigs(without(ALL_MYSQL, 'BUDGET_PLANS_DRIVER'));

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
    // FR-010: a mensagem tem de dizer QUAL modulo (a fonte) e QUAL variavel (o que fazer).
    // `budget-plans` em minusculo-kebab nao pode ser satisfeito pelo nome da env sozinho.
    assert.match(errorText(r), /budget-plans/);
    assert.match(errorText(r), /BUDGET_PLANS_DRIVER/);
  });

  it('caso 2 — mysql sem URL: erro nomeia a variavel de endereco', () => {
    const r = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DATABASE_URL'));

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
    assert.match(errorText(r), /auth/);
    assert.match(errorText(r), /AUTH_DATABASE_URL/);
  });

  it('caso 3 — typo no driver (mysqll): erro cita o valor recebido e o unico aceito', () => {
    const r = readModuleDriverConfigs({ ...ALL_MYSQL, PROGRAMS_DRIVER: 'mysqll' });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 1);
    assert.match(errorText(r), /programs/);
    assert.match(errorText(r), /PROGRAMS_DRIVER/);
    assert.match(errorText(r), /mysqll/);
    assert.match(errorText(r), /mysql"/);
  });

  it('caso 4 — configuracao completa: ok, os 7 modulos em mysql (FR-009)', () => {
    const r = readModuleDriverConfigs(ALL_MYSQL);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    const modules = r.value;
    assert.equal(modules.auth.driver, 'mysql');
    assert.equal(modules.contracts.driver, 'mysql');
    assert.equal(modules.partners.driver, 'mysql');
    assert.equal(modules.programs.driver, 'mysql');
    assert.equal(modules.financial.driver, 'mysql');
    assert.equal(modules.budgetPlans.driver, 'mysql');
    assert.equal(modules.reports.driver, 'mysql');
    // o endereco de cada modulo chega resolvido — o server.ts so le a decisao ja tomada
    assert.equal(modules.auth.connectionString, URL_AUTH);
    assert.equal(modules.budgetPlans.connectionString, URL_BUDGET_PLANS);
  });

  it('caso 9 — variavel vazia conta como AUSENTE, nunca como valor invalido', () => {
    // Prova sem prescrever texto: o relatorio de `X_DRIVER=""` tem de ser IDENTICO ao de `X_DRIVER`
    // nao declarada. Se a implementacao tratasse vazio como valor invalido, as mensagens divergiriam.
    const omitted = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DRIVER'));
    const empty = readModuleDriverConfigs({ ...ALL_MYSQL, AUTH_DRIVER: '' });
    assert.equal(omitted.ok, false);
    assert.equal(empty.ok, false);
    if (omitted.ok || empty.ok) return;
    assert.deepEqual(empty.error, omitted.error);

    // mesma regra para o endereco de conexao (Edge Case: "endereco presente mas vazio")
    const urlOmitted = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DATABASE_URL'));
    const urlEmpty = readModuleDriverConfigs({ ...ALL_MYSQL, AUTH_DATABASE_URL: '' });
    assert.equal(urlOmitted.ok, false);
    assert.equal(urlEmpty.ok, false);
    if (urlOmitted.ok || urlEmpty.ok) return;
    assert.deepEqual(urlEmpty.error, urlOmitted.error);
  });
});

describe('SHARED-DRIVER-BOOT-GUARD — US2: diagnostico completo numa unica tentativa', () => {
  it('caso 5 — 3 modulos quebrados: exatamente 3 erros no MESMO retorno', () => {
    // auth sem driver, programs com typo, reports sem driver. Nenhum dos tres e fonte da cascata
    // do reports, entao o total de problemas e exatamente 3 — o teste mede acumulacao, nao cascata.
    const r = readModuleDriverConfigs({
      ...without(ALL_MYSQL, 'AUTH_DRIVER', 'REPORTS_DRIVER'),
      PROGRAMS_DRIVER: 'mysqll',
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 3);
    assert.match(errorText(r), /AUTH_DRIVER/);
    assert.match(errorText(r), /PROGRAMS_DRIVER/);
    assert.match(errorText(r), /REPORTS_DRIVER/);
  });

  it('caso 6 — um modulo com 2 problemas simultaneos: ambos aparecem no retorno', () => {
    // Driver invalido E endereco ausente no mesmo modulo (US2-2). Quem digitou `mysqll` quis dizer
    // `mysql`: avisar tambem da URL faltante fecha os dois defeitos num deploy so.
    const r = readModuleDriverConfigs({
      ...without(ALL_MYSQL, 'AUTH_DATABASE_URL'),
      AUTH_DRIVER: 'mysqll',
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error.length, 2);
    assert.match(errorText(r), /mysqll/);
    assert.match(errorText(r), /AUTH_DATABASE_URL/);
  });

  it('caso 11 — reports: as 4 fontes resolvidas por CASCATA (overrides ausentes) devolvem ok', () => {
    const r = readModuleDriverConfigs(ALL_MYSQL);

    assert.equal(r.ok, true);
    if (!r.ok) return;
    const { reports } = r.value;
    // D4: valida-se o endereco EFETIVO. Sem override, cada fonte cai no *_DATABASE_URL do
    // modulo-fonte — e tem de cair no modulo CERTO, nao numa URL qualquer.
    assert.equal(reports.partnersUrl, URL_PARTNERS);
    assert.equal(reports.financialUrl, URL_FINANCIAL);
    assert.equal(reports.contractsUrl, URL_CONTRACTS);
    assert.equal(reports.budgetPlansUrl, URL_BUDGET_PLANS);

    // e o override especifico, quando declarado, vence a cascata
    const overridden = readModuleDriverConfigs({
      ...ALL_MYSQL,
      REPORTS_CONTRACTS_DATABASE_URL: URL_REPORTS_OVERRIDE,
    });
    assert.equal(overridden.ok, true);
    if (!overridden.ok) return;
    assert.equal(overridden.value.reports.contractsUrl, URL_REPORTS_OVERRIDE);
    assert.equal(overridden.value.reports.partnersUrl, URL_PARTNERS);
  });

  it('caso 12 — reports com 1 fonte que nao resolve: erro ACUMULADO, nunca isolado (FR-012)', () => {
    // financial sem URL => a fonte financeira do reports nao resolve. Somado a um problema nao
    // relacionado (auth sem driver), o retorno tem de trazer OS DOIS.
    const r = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DRIVER', 'FINANCIAL_DATABASE_URL'));

    assert.equal(r.ok, false);
    if (r.ok) return;
    // o problema do reports esta no mesmo relatorio que o do auth
    assert.match(errorText(r), /AUTH_DRIVER/);
    assert.match(errorText(r), /reports/);
    assert.match(errorText(r), /REPORTS_FINANCIAL_DATABASE_URL/);
  });
});

/**
 * O grupo que o ADR-0068 acrescentou, e o mais fácil de desfazer sem querer: reintroduzir um
 * `isProductionEnv` neste arquivo faria a assimetria voltar em silêncio, e nenhum dos casos acima
 * pegaria. Estes comparam o MESMO ambiente com e sem `NODE_ENV=production`.
 */
describe('SHARED-DRIVER-BOOT-GUARD — ADR-0068: a decisao NAO olha o ambiente', () => {
  const inProduction = (env: Env): Env => ({ ...env, NODE_ENV: 'production' });

  it('caso 7 — nada configurado derruba o boot, com ou sem producao', () => {
    const bare = readModuleDriverConfigs({});
    const prod = readModuleDriverConfigs({ NODE_ENV: 'production' });

    assert.equal(bare.ok, false, 'ambiente vazio nao pode mais subir em memoria');
    assert.equal(prod.ok, false);
    if (bare.ok || prod.ok) return;
    // identico: o ambiente nao participa da decisao
    assert.deepEqual(bare.error, prod.error);
    // um erro por modulo, e cada um se nomeia
    const texto = bare.error.join('\n');
    for (const name of [
      'auth',
      'contracts',
      'partners',
      'programs',
      'financial',
      'budget-plans',
      'reports',
    ]) {
      assert.match(texto, new RegExp(name));
    }
  });

  it('caso 8 — memory DECLARADO e recusado, e a mensagem diz para onde o caminho foi', () => {
    // Revoga o FR-007, que dizia que `memory` declarado sobe em producao "sem falhar". Quem escreveu
    // `memory` nao errou de digitacao — escreveu o que ate ontem funcionava —, entao a mensagem tem
    // de citar a decisao e o caminho novo, e nao apenas "valor invalido".
    const r = readModuleDriverConfigs({ ...ALL_MYSQL, AUTH_DRIVER: 'memory' });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.match(errorText(r), /auth/);
    assert.match(errorText(r), /AUTH_DRIVER/);
    assert.match(errorText(r), /ADR-0068/);
  });

  it('caso 10 — NODE_ENV nao muda desfecho NENHUM, nem no erro nem no sucesso', () => {
    // A propriedade inteira do ADR-0068 num caso so: para cada cenario, o retorno com e sem
    // `NODE_ENV=production` tem de ser identico.
    const cenarios: readonly Env[] = [
      ALL_MYSQL,
      without(ALL_MYSQL, 'AUTH_DRIVER'),
      { ...ALL_MYSQL, FINANCIAL_DRIVER: 'memory' },
      { ...ALL_MYSQL, PARTNERS_DRIVER: 'mysqll' },
      {},
    ];

    for (const env of cenarios) {
      const fora = readModuleDriverConfigs(env);
      const dentro = readModuleDriverConfigs(inProduction(env));
      assert.equal(fora.ok, dentro.ok, 'o ambiente mudou o veredito');
      assert.deepEqual(
        fora.ok ? fora.value : fora.error,
        dentro.ok ? dentro.value : dentro.error,
        'o ambiente mudou o conteudo do retorno',
      );
    }
  });
});

describe('SHARED-DRIVER-BOOT-GUARD — degradacoes com ADR aceito seguem INTACTAS', () => {
  it('caso 13 — CRITICO: replica de leitura ausente NAO e erro (ADR-0026, FR-008)', () => {
    // ALL_MYSQL nao declara CONTRACTS_READER_URL nem PARTNERS_READER_URL de proposito:
    // "ausente -> reusa o writer, single-node". Endurecer isso contradiz ADR aceito — e o
    // fail-fast do ADR-0068 nao pode transbordar para ca.
    assert.equal(readModuleDriverConfigs(ALL_MYSQL).ok, true);

    // e mesmo com o relatorio de erros aberto por outro motivo, nenhuma mensagem pode cobrar a
    // replica — a guarda nao alcanca a degradacao intencional.
    const broken = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DRIVER'));
    assert.equal(broken.ok, false);
    if (broken.ok) return;
    assert.equal(errorText(broken).includes('READER_URL'), false);
  });

  it('caso 14 — CRITICO: a guarda nao cobra a composicao de programa (ADR-0032, FR-008)', () => {
    // O bloco `program` do contracts so existe quando programs responde; indisponivel, ele DEGRADA
    // de proposito — em RUNTIME, e nao no boot. Sob o ADR-0068 o cenario original deste caso
    // (`PROGRAMS_DRIVER=memory`) deixou de ser representavel, mas a propriedade que ele protegia
    // continua valendo e e' esta: nenhuma variavel de composicao de programa entra no relatorio, e
    // um `programs` corretamente configurado nao arrasta o `contracts` para erro nenhum.
    const r = readModuleDriverConfigs(ALL_MYSQL);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.contracts.connectionString, URL_CONTRACTS);
    assert.equal(r.value.programs.connectionString, URL_PROGRAMS);

    // com o relatorio aberto por outro motivo, nada de composicao de programa aparece
    const broken = readModuleDriverConfigs(without(ALL_MYSQL, 'AUTH_DRIVER'));
    assert.equal(broken.ok, false);
    if (broken.ok) return;
    assert.equal(errorText(broken).includes('PROGRAM_COMPOSITION'), false);
    assert.equal(errorText(broken).includes('CONTRACTS_DRIVER'), false);
  });
});

describe('SHARED-DRIVER-BOOT-GUARD — invariante de credencial (W2 M3/S1)', () => {
  // `data-model.md` exige: nenhuma mensagem pode ecoar o VALOR de um endereco de conexao — so o
  // NOME da variavel. Cobre CWE-532 (credencial em log) e CWE-117 (log injection).
  //
  // Este caso nasceu de um erro real do W1: a primeira versao do controle truncava o valor em 20
  // caracteres e PARECIA correta, mas imprimia `"mysql://core_app:SEN..."` — truncar e' inutil
  // aqui, porque usuario e inicio de senha moram no PREFIXO da connection string. O controle
  // certo filtra por FORMA (so ecoa o que parece nome de driver), nao por tamanho. Um controle
  // que ja falhou uma vez precisa de teste.
  const SENHA = 'S3nh4Sup3rSecreta';
  const URL_COM_CREDENCIAL = `mysql://core_app:${SENHA}@rds.interno:3306/core`;

  it('caso 15 — URL colada na variavel de DRIVER por engano nao vaza credencial na mensagem', () => {
    const r = readModuleDriverConfigs({ ...ALL_MYSQL, AUTH_DRIVER: URL_COM_CREDENCIAL });

    assert.equal(r.ok, false);
    if (r.ok) return;
    const texto = errorText(r);
    assert.equal(texto.includes(SENHA), false, 'a senha vazou na mensagem de erro');
    assert.equal(texto.includes('core_app'), false, 'o usuario do banco vazou na mensagem');
    assert.equal(texto.includes('rds.interno'), false, 'o host do banco vazou na mensagem');
    // a mensagem segue util: nomeia modulo e variavel (FR-010)
    assert.match(texto, /auth/);
    assert.match(texto, /AUTH_DRIVER/);
  });

  it('caso 16 — valor de driver com quebra de linha nao forja linha no stderr (CWE-117)', () => {
    const r = readModuleDriverConfigs({
      ...ALL_MYSQL,
      AUTH_DRIVER: 'mysql\nserver: financial: tudo certo',
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    // cada erro e' escrito como UMA linha no stderr; um valor com \n nao pode virar duas
    for (const linha of r.error) assert.equal(linha.includes('\n'), false);
  });

  it('caso 17 — o caminho de TODOS os modulos quebrados tambem nao ecoa credencial', () => {
    // Sob o ADR-0068 nao ha mais canal de aviso — todo diagnostico sai como erro. O caminho que
    // mais gera mensagens passou a ser o ambiente vazio, e ele precisa da mesma garantia.
    const r = readModuleDriverConfigs({
      AUTH_DRIVER: URL_COM_CREDENCIAL,
      AUTH_DATABASE_URL: URL_COM_CREDENCIAL,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    const texto = errorText(r);
    assert.equal(texto.includes(SENHA), false, 'a senha vazou');
    assert.equal(texto.includes('core_app'), false, 'o usuario do banco vazou');
  });
});
