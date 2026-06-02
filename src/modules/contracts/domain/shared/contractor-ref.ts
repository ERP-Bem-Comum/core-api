import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import {
  SupplierRef,
  FinancierRef,
  CollaboratorRef,
} from '#src/modules/partners/public-api/refs.ts';

// Vínculo do contrato ao contratado (ADR-0032: "atributo do próprio contrato →
// evolui o agregado"). Discriminated union sobre os branded refs de Parceiros,
// importados SÓ via `partners/public-api/refs.ts` (ADR-0006/0014). Contratos
// guarda o parceiro por ID branded — nunca toca o domínio de `partners`.
//
// Discriminador `kind` (convenção do domínio — espelha `Period`, `ContractAdjustment`,
// `Amendment`). A ENTRADA de `rehydrate` usa `type`, espelhando o DTO de borda
// (`contractor_type`/`contractorType`/`--contratado-tipo`): `rehydrate` é a tradução
// borda→domínio, então o nome cru fica do lado de fora e o domínio fala `kind`.
//
// Padrão D (module-as-namespace): consumir com
// `import * as ContractorRef from './contractor-ref.ts'`.

export type ContractorRef =
  | Readonly<{ kind: 'Supplier'; id: SupplierRef }>
  | Readonly<{ kind: 'Financier'; id: FinancierRef }>
  | Readonly<{ kind: 'Collaborator'; id: CollaboratorRef }>;

// Duas falhas distintas: `type` fora do conjunto conhecido, ou `id` malformado
// (delegado ao `*Ref.rehydrate` de Parceiros, que devolve `'partner-ref-invalid'`).
export type ContractorRefError = 'contractor-ref-invalid-type' | 'partner-ref-invalid';

export const rehydrate = (
  input: Readonly<{ type: string; id: string }>,
): Result<ContractorRef, ContractorRefError> => {
  switch (input.type) {
    case 'Supplier': {
      const r = SupplierRef.rehydrate(input.id);
      return r.ok ? ok(immutable({ kind: 'Supplier', id: r.value })) : err('partner-ref-invalid');
    }
    case 'Financier': {
      const r = FinancierRef.rehydrate(input.id);
      return r.ok ? ok(immutable({ kind: 'Financier', id: r.value })) : err('partner-ref-invalid');
    }
    case 'Collaborator': {
      const r = CollaboratorRef.rehydrate(input.id);
      return r.ok
        ? ok(immutable({ kind: 'Collaborator', id: r.value }))
        : err('partner-ref-invalid');
    }
    default:
      return err('contractor-ref-invalid-type');
  }
};
