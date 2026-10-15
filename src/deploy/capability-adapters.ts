/**
 * Adapters que satisfazem uma `Capability`, e o que CADA UM exige do ambiente.
 *
 * @remarks
 * O manifesto de workloads declara que uma unidade precisa de uma **capacidade** —
 * `requires: [{ kind: 'smtp' }]` —, nunca de um fornecedor. Quem atende a capacidade é um adapter,
 * e as variáveis que ele exige são dele, não da unidade.
 *
 * Antes desta separação, `worker-email` listava em `envWithDefault` as oito `SMTP_*` e a
 * `RESEND_API_KEY` — e `envWithDefault` significa "tem substituto no código; ausência não
 * derruba". Sob `EMAIL_PROVIDER=smtp` isso é **falso**: `SMTP_USER` e `SMTP_PASS` vazios fazem
 * `parseSmtpConfig` devolver `missing-env`, o worker sai com 78 e, sob o overmind, leva os outros
 * quatro processos. Medido no primeiro boot real do `.env.example` gerado (#1059).
 *
 * POR QUE NÃO UMA CONSTRAINT `required-when EMAIL_PROVIDER=smtp`. Ela acoplaria o manifesto ao
 * VALOR string de outra variável: renomear o provider quebraria a declaração sem nada acusar — a
 * mesma classe de afirmação frágil que o repositório passa o tempo consertando. Aqui o vínculo é
 * estrutural: o adapter declara o que precisa, e um adapter novo não toca o manifesto central,
 * porque a capacidade já está declarada.
 *
 * A assimetria com as `S3_*` é deliberada e não é inconsistência: a capacidade `s3-compat` tem um
 * adapter **fixo** composto (o SDK da AWS, que serve S3 e MinIO mudando `forcePathStyle` — ADR-0019),
 * então as variáveis dele são realmente exigidas pela unidade e ficam declaradas lá. `selectedBy`
 * ausente significa exatamente isso: não há escolha a fazer em runtime.
 */

import type { Capability } from './workloads.ts';

/** Como a composição escolhe este adapter entre os que atendem a mesma capacidade. */
export type AdapterSelector = Readonly<{
  /** Variável que carrega a escolha. */
  env: string;
  /** Valor que seleciona ESTE adapter. */
  value: string;
}>;

/** Um adapter concreto de uma capacidade, com o ambiente que ele — e só ele — exige. */
export type CapabilityAdapter = Readonly<{
  /** Nome do adapter como o código o chama. */
  name: string;
  /** A capacidade que ele atende. */
  capability: Capability['kind'];
  /**
   * Como ele é selecionado. Ausente = adapter fixo da capacidade, e aí o ambiente dele pertence à
   * unidade, não a este registro.
   */
  selectedBy?: AdapterSelector;
  /** Exigidas por ele, não-vazias. Ausência derruba o processo QUANDO ele é o escolhido. */
  env: readonly string[];
  /** Lidas por ele com substituto no código. */
  envWithDefault: readonly string[];
  /** Arquivo que valida o ambiente dele e devolve `Result` — onde a exigência é enforçada. */
  validatedBy: string;
  /** Por que nenhum composition root o seleciona, quando é o caso. */
  notComposed?: string;
}>;

export const CAPABILITY_ADAPTERS: readonly CapabilityAdapter[] = [
  {
    name: 'nodemailer-smtp',
    capability: 'smtp',
    selectedBy: { env: 'EMAIL_PROVIDER', value: 'smtp' },
    // `REQUIRED_FIELDS` em `nodemailer-config.ts`: a validação recusa `undefined` E string vazia,
    // então declarar vazio no `.env` é indistinguível de não declarar.
    env: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS'],
    envWithDefault: ['SMTP_POOL', 'SMTP_MAX_CONNS', 'SMTP_REQUIRE_TLS'],
    validatedBy: 'modules/notifications/adapters/email/nodemailer-config.ts',
  },
  {
    name: 'resend-http',
    capability: 'smtp',
    selectedBy: { env: 'EMAIL_PROVIDER', value: 'resend' },
    env: ['RESEND_API_KEY'],
    envWithDefault: [],
    validatedBy: 'modules/notifications/adapters/email/resend-config.ts',
  },
  {
    name: 'email-in-memory',
    capability: 'smtp',
    selectedBy: { env: 'EMAIL_PROVIDER', value: 'memory' },
    // Nenhuma: é o double de teste injetado por seam. ⚠️ Selecioná-lo em homologação ou produção
    // DESCARTA todo e-mail de reset e convite, com boot verde (#1047).
    env: [],
    envWithDefault: [],
    validatedBy: 'modules/notifications/adapters/email/email-config.ts',
  },
  {
    name: 'magalu-object-storage',
    capability: 's3-compat',
    // Sem `selectedBy`: não há variável que o escolha, porque nada o escolhe — ver `notComposed`.
    env: ['MAGALU_REGION', 'MAGALU_BUCKET', 'MAGALU_ACCESS_KEY_ID', 'MAGALU_SECRET_ACCESS_KEY'],
    envWithDefault: [],
    validatedBy: 'modules/contracts/adapters/storage/magalu-cloud-config.ts',
    notComposed:
      'O adapter existe e é exportado pelo `public-api` do `contracts`, mas nenhum composition root o instancia — o comentário em `public-api/index.ts:36` ainda o anuncia como trabalho futuro, com o export já feito na linha 58. ⚠️ O ambiente da Magalu não recebe dado real nem pessoal (ADR-0021).',
  },
];

/** Toda variável que algum adapter exige ou lê. */
export const ADAPTER_ENVS: readonly string[] = [
  ...new Set(CAPABILITY_ADAPTERS.flatMap((a) => [...a.env, ...a.envWithDefault])),
].sort();

/** Os adapters que atendem uma capacidade, na ordem declarada. */
export const adaptersFor = (capability: Capability['kind']): readonly CapabilityAdapter[] =>
  CAPABILITY_ADAPTERS.filter((a) => a.capability === capability);

/** O adapter que declara esta variável, se algum. */
export const adapterOwning = (env: string): CapabilityAdapter | undefined =>
  CAPABILITY_ADAPTERS.find((a) => a.env.includes(env) || a.envWithDefault.includes(env));
