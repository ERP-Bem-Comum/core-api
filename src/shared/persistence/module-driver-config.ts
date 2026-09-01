/**
 * Guarda de boot da configuracao de persistencia dos 7 modulos (issues #456 e #799, ADR-0068).
 *
 * Os incidentes #374 (tabelas bgp_* servidas vazias com o banco cheio) e #444 (relatorios vazios
 * com HTTP 200) tiveram a mesma causa: `env['X_DRIVER'] === 'mysql' ? mysql : memory`, repetido em
 * 7 pontos do `server.ts`. Nesse ternario, qualquer valor diferente de "mysql" — ausente, vazio ou
 * com typo — vira memoria, calado. Aqui a decisao e tomada UMA vez, com relatorio completo.
 *
 * POLITICA (ADR-0068, 31/08/2026): configuracao ausente ou recusada derruba o boot em TODO
 * ambiente, local inclusive. Nao ha mais degradacao para memoria, e `memory` deixou de ser um valor
 * aceito de `X_DRIVER` — o unico e "mysql".
 *
 * Por que sem excecao de ambiente: em homologacao e producao as envs sao postas A MAO, na console
 * da AWS, por quem opera a infraestrutura. Degradar ali nao protege ninguem — o sinal nao chega a
 * quem poderia corrigir. E local que degrada deixa de espelhar hml/prod, que e exatamente como um
 * defeito de configuracao sobrevive ate o deploy.
 *
 * ⚠️ O ADR-0068 REVOGA o FR-007, que dizia que `memory` declarado sobe em producao "sem falhar e
 * sem exigir configuracao adicional". Nao ha mais como declara-lo.
 *
 * O adapter em memoria NAO morreu: ele segue existindo como double de teste, injetado por parametro
 * em `build<Modulo>HttpDeps({ driver: 'memory' })`. Isso e outra fronteira — esta aqui le ambiente,
 * aquela recebe argumento. Confundir as duas foi o que produziu a estimativa errada de 179 arquivos
 * (Inquiry-0034).
 *
 * Molde: `src/shared/http/email-link-base-urls.ts` (#331/#332) — acumula os erros e so devolve
 * `err` no fim, para que o operador conserte tudo num deploy so (FR-005).
 *
 * Fora desta guarda por decisao registrada (FR-008): endereco de replica de leitura
 * (`*_READER_URL`, ADR-0026) e composicao de programa em contratos (ADR-0032) — as duas sao
 * degradacoes intencionais, e endurece-las aqui contradiria ADR aceito.
 *
 * Mensagens em PT sem acentuacao, como o molde: saem em stderr no boot, antes de qualquer
 * garantia de encoding do coletor de log. Nenhuma delas ecoa o VALOR de um endereco de conexao
 * (credencial viaja dentro dele) — so o nome da variavel.
 */

import { combine, err, ok, type Result } from '#src/shared/primitives/result.ts';

type Env = Readonly<Record<string, string | undefined>>;

/**
 * Uma variante so, e e o ponto do ADR-0068: a leitura de ambiente nao tem como produzir
 * configuracao volatil. O estado `mysql` sem `connectionString` continua irrepresentavel.
 */
export type ModuleDriverConfig = Readonly<{ driver: 'mysql'; connectionString: string }>;

/** O modulo somente-leitura nao tem endereco proprio: consome quatro, resolvidos por cascata. */
export type ReportsDriverConfig = Readonly<{
  driver: 'mysql';
  partnersUrl: string;
  financialUrl: string;
  contractsUrl: string;
  budgetPlansUrl: string;
}>;

export type ModuleDriverMap = Readonly<{
  auth: ModuleDriverConfig;
  contracts: ModuleDriverConfig;
  partners: ModuleDriverConfig;
  programs: ModuleDriverConfig;
  financial: ModuleDriverConfig;
  budgetPlans: ModuleDriverConfig;
  reports: ReportsDriverConfig;
}>;

type ModuleSpec = Readonly<{ name: string; driverVar: string; urlVar: string }>;

type ReportsSourceSpec = Readonly<{ overrideVar: string; sourceVar: string }>;

/**
 * O que o operador declarou no campo de driver. `memory` tem variante PROPRIA mesmo tendo virado
 * erro: a mensagem que ele merece nao e "valor invalido" — quem escreveu `memory` nao errou de
 * digitacao, escreveu o que ate ontem funcionava, e precisa saber para onde aquele caminho foi.
 */
type DriverDeclaration =
  | Readonly<{ kind: 'mysql' }>
  | Readonly<{ kind: 'memory' }>
  | Readonly<{ kind: 'absent' }>
  | Readonly<{ kind: 'invalid'; value: string }>;

const ACCEPTED_DRIVERS_TEXT = '"mysql"';

/** Nome do modulo em kebab-case, igual ao da pasta em `src/modules/` e ao da matriz de ambiente. */
const MODULE_SPECS = {
  auth: { name: 'auth', driverVar: 'AUTH_DRIVER', urlVar: 'AUTH_DATABASE_URL' },
  contracts: {
    name: 'contracts',
    driverVar: 'CONTRACTS_DRIVER',
    urlVar: 'CONTRACTS_DATABASE_URL',
  },
  partners: { name: 'partners', driverVar: 'PARTNERS_DRIVER', urlVar: 'PARTNERS_DATABASE_URL' },
  programs: { name: 'programs', driverVar: 'PROGRAMS_DRIVER', urlVar: 'PROGRAMS_DATABASE_URL' },
  financial: {
    name: 'financial',
    driverVar: 'FINANCIAL_DRIVER',
    urlVar: 'FINANCIAL_DATABASE_URL',
  },
  budgetPlans: {
    name: 'budget-plans',
    driverVar: 'BUDGET_PLANS_DRIVER',
    urlVar: 'BUDGET_PLANS_DATABASE_URL',
  },
} as const satisfies Readonly<Record<string, ModuleSpec>>;

const REPORTS_NAME = 'reports';
const REPORTS_DRIVER_VAR = 'REPORTS_DRIVER';

const REPORTS_SOURCE_SPECS = {
  partners: { overrideVar: 'REPORTS_DATABASE_URL', sourceVar: 'PARTNERS_DATABASE_URL' },
  financial: {
    overrideVar: 'REPORTS_FINANCIAL_DATABASE_URL',
    sourceVar: 'FINANCIAL_DATABASE_URL',
  },
  contracts: {
    overrideVar: 'REPORTS_CONTRACTS_DATABASE_URL',
    sourceVar: 'CONTRACTS_DATABASE_URL',
  },
  budgetPlans: {
    overrideVar: 'REPORTS_BUDGET_PLANS_DATABASE_URL',
    sourceVar: 'BUDGET_PLANS_DATABASE_URL',
  },
} as const satisfies Readonly<Record<string, ReportsSourceSpec>>;

/** Variavel presente porem vazia conta como AUSENTE — nunca como valor invalido. */
const readVar = (env: Env, name: string): string | undefined => {
  const value = env[name];
  return value === undefined || value === '' ? undefined : value;
};

const readDriver = (env: Env, name: string): DriverDeclaration => {
  const raw = readVar(env, name);
  if (raw === undefined) return { kind: 'absent' };
  if (raw === 'mysql') return { kind: 'mysql' };
  if (raw === 'memory') return { kind: 'memory' };
  return { kind: 'invalid', value: raw };
};

/**
 * O valor recebido NAO vai cru para o log (W2 — CWE-532 e CWE-117). O erro de operador mais provavel
 * nao e digitar "mysqll": e colar a connection string na variavel de driver do mesmo modulo
 * (`AUTH_DRIVER=mysql://user:senha@rds.../core`) — e ai usuario e senha iriam parar no coletor de
 * log, que tem audiencia maior e retencao mais longa que o secret store. Um `\n` no valor, alem
 * disso, forjaria uma linha inteira de diagnostico no stderr.
 *
 * Regra: eco so quando o valor TEM FORMA DE DRIVER (curto, sem simbolo de URL). Truncar seria
 * insuficiente — "mysql://core_app:SEN..." ainda entrega o inicio da senha. Todo typo plausivel
 * ("mysqll", "MySQL", "mysq1") casa e aparece inteiro, que e o que o operador precisa ver; uma URL
 * colada nao casa e nao aparece de forma nenhuma. O tamanho fica no lugar do valor porque ele
 * distingue "typo" de "variavel trocada" sem revelar nada.
 */
const DRIVER_VALUE_ECHO_SHAPE = /^[\w.-]{1,20}$/;

const echoableDriverValue = (value: string): string =>
  DRIVER_VALUE_ECHO_SHAPE.test(value)
    ? `"${value}"`
    : `(nao exibido — ${String(value.length)} caracteres fora do formato de driver)`;

// FR-010 (Uncle Bob, Codigo Limpo p. 107): cada mensagem nomeia a FONTE (o modulo) e a OPERACAO
// que falhou (a variavel). "driver mysql exige partnersUrl" — o texto de antes — reprovava nas duas.
const missingDriverError = (spec: Readonly<{ name: string; driverVar: string }>): string =>
  `${spec.name}: ${spec.driverVar} nao configurada — obrigatoria em TODO ambiente ` +
  `(unico valor aceito: ${ACCEPTED_DRIVERS_TEXT})`;

const invalidDriverError = (
  spec: Readonly<{ name: string; driverVar: string }>,
  value: string,
): string =>
  `${spec.name}: ${spec.driverVar} com valor invalido ${echoableDriverValue(value)} — ` +
  `unico valor aceito: ${ACCEPTED_DRIVERS_TEXT}`;

/**
 * Mensagem propria para quem declarou `memory` — o valor que a politica retirou (ADR-0068). Ela
 * diz para onde o caminho foi, porque a alternativa (recusar como "valor invalido") manda o
 * operador procurar um typo que nao existe.
 */
const memoryDriverError = (spec: Readonly<{ name: string; driverVar: string }>): string =>
  `${spec.name}: ${spec.driverVar}=memory nao e mais aceito (ADR-0068) — o adapter em memoria ` +
  `existe so como double de teste. Para rodar sem MySQL, suba o banco pelo orquestrador local.`;

const missingUrlError = (spec: ModuleSpec): string =>
  `${spec.name}: ${spec.urlVar} nao configurada — obrigatoria quando ${spec.driverVar} e "mysql"`;

const resolveModule = (
  env: Env,
  spec: ModuleSpec,
): Result<ModuleDriverConfig, readonly string[]> => {
  const declaration = readDriver(env, spec.driverVar);
  switch (declaration.kind) {
    case 'mysql': {
      const url = readVar(env, spec.urlVar);
      // Endereco obrigatorio quando o driver e "mysql" (matriz, OBR-M) — e agora ele e o unico.
      return url === undefined
        ? err([missingUrlError(spec)])
        : ok({ driver: 'mysql', connectionString: url });
    }
    case 'memory':
      return err([memoryDriverError(spec)]);
    case 'absent':
      return err([missingDriverError(spec)]);
    case 'invalid':
      // Quem digitou "mysqll" quis dizer "mysql": cobrar tambem o endereco fecha os dois defeitos
      // no mesmo deploy (US2-2).
      return err([
        invalidDriverError(spec, declaration.value),
        ...(readVar(env, spec.urlVar) === undefined ? [missingUrlError(spec)] : []),
      ]);
  }
};

const resolveReportsSource = (env: Env, spec: ReportsSourceSpec): Result<string, string> => {
  // D4: valida-se o endereco EFETIVO. Validar so o override acusaria falta do que na pratica
  // existe — QA e producao usam a cascata e nao declaram os overrides.
  //
  // As duas leituras passam por `readVar`, entao `''` conta como AUSENTE nos dois degraus da
  // cascata — simetrico aos outros seis modulos (W2/C4). Isto e' estritamente melhor que o
  // `override ?? source` do `server.ts` de antes: o `??` so cai em undefined, logo um override
  // vazio VENCIA a cascata e chegava vazio no pool.
  const url = readVar(env, spec.overrideVar) ?? readVar(env, spec.sourceVar);
  return url === undefined
    ? err(
        `${REPORTS_NAME}: ${spec.overrideVar} nao configurada ` +
          `(nem ${spec.sourceVar}, usada por cascata) — ` +
          `obrigatoria quando ${REPORTS_DRIVER_VAR} e "mysql"`,
      )
    : ok(url);
};

const resolveReportsSources = (env: Env): Result<ReportsDriverConfig, readonly string[]> => {
  // `combine` acumula os erros das quatro fontes antes de abortar — a fonte que falta deixa de
  // interromper sozinha o boot. Argumentos de tipo explicitos: o erro `E` so aparece dentro do
  // mapped type do parametro, posicao de onde o compilador nao consegue inferi-lo (cai em
  // `unknown`).
  const sources = combine<[string, string, string, string], string>([
    resolveReportsSource(env, REPORTS_SOURCE_SPECS.partners),
    resolveReportsSource(env, REPORTS_SOURCE_SPECS.financial),
    resolveReportsSource(env, REPORTS_SOURCE_SPECS.contracts),
    resolveReportsSource(env, REPORTS_SOURCE_SPECS.budgetPlans),
  ] as const);
  if (!sources.ok) return err(sources.error);
  const [partnersUrl, financialUrl, contractsUrl, budgetPlansUrl] = sources.value;
  return ok({ driver: 'mysql', partnersUrl, financialUrl, contractsUrl, budgetPlansUrl });
};

const resolveReports = (env: Env): Result<ReportsDriverConfig, readonly string[]> => {
  const spec = { name: REPORTS_NAME, driverVar: REPORTS_DRIVER_VAR };
  const declaration = readDriver(env, REPORTS_DRIVER_VAR);
  switch (declaration.kind) {
    case 'mysql':
      return resolveReportsSources(env);
    case 'memory':
      return err([memoryDriverError(spec)]);
    case 'absent':
      return err([missingDriverError(spec)]);
    case 'invalid': {
      const sources = resolveReportsSources(env);
      return err([
        invalidDriverError(spec, declaration.value),
        ...(sources.ok ? [] : sources.error),
      ]);
    }
  }
};

export const readModuleDriverConfigs = (env: Env): Result<ModuleDriverMap, readonly string[]> => {
  // Ordem estavel (a dos modulos) para que a saida seja previsivel e testavel por igualdade.
  const resolved = combine<
    [
      ModuleDriverConfig,
      ModuleDriverConfig,
      ModuleDriverConfig,
      ModuleDriverConfig,
      ModuleDriverConfig,
      ModuleDriverConfig,
      ReportsDriverConfig,
    ],
    readonly string[]
  >([
    resolveModule(env, MODULE_SPECS.auth),
    resolveModule(env, MODULE_SPECS.contracts),
    resolveModule(env, MODULE_SPECS.partners),
    resolveModule(env, MODULE_SPECS.programs),
    resolveModule(env, MODULE_SPECS.financial),
    resolveModule(env, MODULE_SPECS.budgetPlans),
    resolveReports(env),
  ] as const);

  // `combine` agrupa por modulo (`readonly string[][]`); o operador quer uma lista so.
  if (!resolved.ok) return err(resolved.error.flat());

  const [auth, contracts, partners, programs, financial, budgetPlans, reports] = resolved.value;
  return ok({ auth, contracts, partners, programs, financial, budgetPlans, reports });
};
