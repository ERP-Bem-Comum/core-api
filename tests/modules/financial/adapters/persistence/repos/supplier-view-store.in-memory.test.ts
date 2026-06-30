import { createInMemorySupplierViewStore } from '#src/modules/financial/adapters/persistence/repos/supplier-view-store.in-memory.ts';
import { supplierViewStoreContract } from '../supplier-view-store.suite.ts';

// FIN-SUPPLIER-VIEW-SCHEMA · W0 — adapter in-memory do SupplierViewStore deve satisfazer o contrato.
supplierViewStoreContract(() => createInMemorySupplierViewStore());
