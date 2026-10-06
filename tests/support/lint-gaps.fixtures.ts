/**
 * Fixtures das três regras de `lint-gaps.ts`. Cada linha marcada com `@expect <regra>` DEVE ser
 * acusada; nenhuma outra pode ser.
 *
 * Os marcadores foram conferidos contra o próprio ESLint (`@typescript-eslint/eslint-plugin@8.59.3`)
 * enquanto ele ainda era o gate — é isso que faz deles a especificação, e não a opinião de quem
 * portou. Os casos negativos importam tanto quanto os positivos: cada um fixa um ponto em que a
 * regra NÃO dispara (parâmetro de tipo função, mapped type, `catch`, import nomeado).
 */

/** Um arquivo de fixture: nome e conteúdo. */
export type GapFixture = Readonly<{ file: string; code: string }>;

export const GAP_FIXTURES: readonly GapFixture[] = [
  {
    file: 'no-class.ts',
    code: [
      'export class Named {} // @expect no-class',
      'export const expr = class {}; // @expect no-class',
      'export const passed = [class Inner {}]; // @expect no-class',
      'export const notAClass = { klass: "class Fake {}" };',
    ].join('\n'),
  },
  {
    file: 'member-ordering.ts',
    code: [
      'export interface GoodOrder {',
      '  [k: string]: unknown;',
      '  (x: number): void;',
      '  a: number;',
      '  new (x: number): GoodOrder;',
      '  m(): void;',
      '}',
      'export interface BadOrder {',
      '  a: number;',
      '  [k: string]: unknown; // @expect member-ordering',
      '}',
      'export type BadLiteral = {',
      '  m(): void;',
      '  a: number; // @expect member-ordering',
      '  b: number; // @expect member-ordering',
      '};',
      'export type ReadonlyMix = { readonly [k: string]: unknown; readonly a: number };',
    ].join('\n'),
  },
  {
    file: 'naming-declarations.ts',
    code: [
      "import Default_Import from 'node:path'; // @expect naming-convention",
      "import * as nsOk from 'node:fs';",
      "import { default as Bad_Alias } from 'node:os'; // @expect naming-convention",
      "import { join as join_named } from 'node:path';",
      'export const camelOk = [nsOk, join_named, Default_Import, Bad_Alias];',
      'export const UPPER_OK = 2;',
      'export const PascalOk = 3;',
      'export const _leadingOk = 4;',
      'export const bad_snake = 5; // @expect naming-convention',
      'export const trailingBad_ = 6; // @expect naming-convention',
      'export const { shorthandOk, renamed: re_named } = { shorthandOk: 1, renamed: 2 }; // @expect naming-convention',
      'export const caught = (): void => {',
      '  try {',
      '    void 0;',
      '  } catch (bad_catch) {',
      '    void bad_catch;',
      '  }',
      '};',
      'export function goodFn(): void {}',
      'export function Bad_fn(): void {} // @expect naming-convention',
      'export const fnExpr = function Inner_name(): void {}; // @expect naming-convention',
      'export const params = (okParam: number, _ignored: number, bad_param: number): number => // @expect naming-convention',
      '  okParam + _ignored + bad_param;',
      'export const destructured = ({ deep_name }: Readonly<{ deepName?: number; deep_name: number }>): number => // @expect naming-convention',
      '  deep_name;',
    ].join('\n'),
  },
  {
    file: 'naming-types.ts',
    code: [
      'export type GoodType = number;',
      'export type bad_type = number; // @expect naming-convention',
      'export interface badInterface { x: number } // @expect naming-convention',
      'export type Generic<T, bad_t> = T | bad_t; // @expect naming-convention',
      "export type Mapped = { [k_k in 'a']: number };",
      'export type Inferred<T> = T extends Array<infer u_u> ? u_u : never;',
      'export type FnType = (bad_type_param: number) => void;',
      'export type Props = {',
      '  okProp: number;',
      '  _leading: number;',
      '  Bad_prop: number; // @expect naming-convention',
      "  'kebab-prop': number; // @expect naming-convention",
      '  fnProp: () => void;',
      '  Fn_prop: () => void; // @expect naming-convention',
      '  parenFn: (() => void) | undefined;',
      '  methodSig(bad_sig_param: number): void;',
      '  Method_sig(): void; // @expect naming-convention',
      '};',
    ].join('\n'),
  },
  {
    file: 'naming-objects.ts',
    code: [
      'export const obj = {',
      "  'any-key': 1,",
      '  Any_Key: 2,',
      '  goodMethod: () => 1,',
      '  Bad_method: () => 1, // @expect naming-convention',
      "  'kebab-method': () => 1, // @expect naming-convention",
      '  shorthandMethod(): number {',
      '    return 1;',
      '  },',
      '  Short_method(): number { // @expect naming-convention',
      '    return 1;',
      '  },',
      '  withParam(bad_obj_param: number): number { // @expect naming-convention',
      '    return bad_obj_param;',
      '  },',
      '};',
    ].join('\n'),
  },
];

/** Linhas (1-based) que o fixture marca para uma regra. */
export const expectedLines = (code: string, rule: string): readonly number[] =>
  code.split('\n').flatMap((line, i) => (line.includes(`@expect ${rule}`) ? [i + 1] : []));
