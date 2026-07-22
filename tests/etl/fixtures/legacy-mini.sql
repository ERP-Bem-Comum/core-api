-- Dump SINTÉTICO (dados 100% FAKE) para o teste de integração do READER.
-- NUNCA o dump de produção. Restaurado no MySQL efêmero (DB `legacy`).
-- Espelha as colunas legadas que o decode lê (NestJS/TypeORM, camelCase).

SET NAMES utf8mb4;

CREATE TABLE `financiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `corporateName` varchar(255) NOT NULL,
  `legalRepresentative` varchar(255) NOT NULL,
  `cnpj` varchar(14) NOT NULL,
  `telephone` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `financiers` VALUES
  (1,'Fund Fake','Fund Fake LTDA','Rep Um','11444777000161','1133330001','Rua A, 1',1,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cnpj` varchar(14) NOT NULL,
  `corporateName` varchar(255) NOT NULL,
  `fantasyName` varchar(255) NOT NULL,
  `serviceCategory` varchar(255) NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `bancaryInfoBank` varchar(120) DEFAULT NULL,
  `bancaryInfoAgency` varchar(20) DEFAULT NULL,
  `bancaryInfoAccountnumber` varchar(20) DEFAULT NULL,
  `bancaryInfoDv` varchar(1) DEFAULT NULL,
  `pixInfoKey_type` varchar(255) DEFAULT NULL,
  `pixInfoKey` varchar(255) DEFAULT NULL,
  `serviceEvaluation` int DEFAULT NULL,
  `commentEvaluation` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- CNPJs DEVEM ser distintos entre suppliers: par_suppliers tem UNIQUE(cnpj) no destino
-- (par_suppliers_cnpj_idx). Reusar o mesmo CNPJ faria o 2º supplier cair em quarentena
-- por ER_DUP_ENTRY, quebrando a reconciliação/idempotência da ETL.
-- Avaliação (ETL-SUPPLIER-RATING-MAPPING): supplier 1 exercita 5+comentário; supplier 2 NULL/NULL.
INSERT INTO `suppliers` VALUES
  (1,'Forn Fake','forn@fake.test','11444777000161','Forn Fake LTDA','FF','INFORMATICA',1,'001','1234','567890','1',NULL,NULL,5,'Otimo fornecedor','2024-01-01 12:00:00','2024-01-02 12:00:00'),
  (2,'Forn Pix','pixforn@fake.test','11222333000181','Forn Pix LTDA','FP','LIMPEZA',1,NULL,NULL,NULL,NULL,'email','pix@fake.test',NULL,NULL,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `collaborators` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cpf` varchar(11) NOT NULL,
  `occupationArea` varchar(20) NOT NULL,
  `role` varchar(255) DEFAULT NULL,
  `startOfContract` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `employmentRelationship` varchar(10) NOT NULL,
  `status` varchar(40) NOT NULL DEFAULT 'PRE_CADASTRO',
  `active` tinyint NOT NULL DEFAULT '1',
  `disableBy` varchar(40) DEFAULT NULL,
  `rg` varchar(255) DEFAULT NULL,
  `dateOfBirth` datetime DEFAULT NULL,
  `genderIdentity` varchar(40) DEFAULT NULL,
  `race` varchar(40) DEFAULT NULL,
  `education` varchar(40) DEFAULT NULL,
  `foodCategory` varchar(40) DEFAULT NULL,
  `foodCategoryDescription` varchar(255) DEFAULT NULL,
  `completeAddress` varchar(255) DEFAULT NULL,
  `telephone` varchar(255) DEFAULT NULL,
  `emergencyContactName` varchar(255) DEFAULT NULL,
  `emergencyContactTelephone` varchar(255) DEFAULT NULL,
  `allergies` varchar(255) DEFAULT NULL,
  `biography` longtext,
  `experienceInThePublicSector` tinyint DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- `role` é OBRIGATÓRIO no domínio do core-api (CollaboratorCore.role: string,
-- par_collaborators.role NOT NULL) embora o legado permita NULL. A fixture (caminho
-- feliz, 100% migrável) usa role não-nulo nas 2 linhas. O caso role=NULL → quarentena
-- (RequiredFieldMissing) é coberto pelo teste unitário collaborator.mapper.test.ts.
-- Decisão D18 (HANDOFF §11): role=NULL na ETL real → quarentena (não backfill: role é
-- cargo de pessoa, ≠ disableBy/D10). Dump de produção atual: 91/91 com role preenchido.
INSERT INTO `collaborators`
  (`id`,`name`,`email`,`cpf`,`occupationArea`,`role`,`startOfContract`,`employmentRelationship`,`status`,`active`,`disableBy`,`createdAt`,`updatedAt`)
VALUES
  (1,'Colab Fake','colab@fake.test','52998224725','PARC','Analista','2024-01-01 12:00:00','CLT','CADASTRO_COMPLETO',1,NULL,'2024-01-01 12:00:00','2024-01-02 12:00:00'),
  (2,'Colab Inativo','inativo@fake.test','11144477735','DDI','Auxiliar Operacional','2024-01-01 12:00:00','PJ','PRE_CADASTRO',0,NULL,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `cpf` varchar(11) NOT NULL,
  `telephone` varchar(255) NOT NULL,
  `imageUrl` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `massApprovalPermission` tinyint NOT NULL DEFAULT '0',
  `collaboratorId` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `users` VALUES
  (1,'User Fake','user@fake.test','52998224725','1133330002',NULL,'$2b$10$FAKEHASHFAKEHASHFAKEHASH',1,1,1,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `collaborator_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collaboratorId` int NOT NULL,
  `previousRole` varchar(255) DEFAULT NULL,
  `newRole` varchar(255) DEFAULT NULL,
  `changedField` varchar(255) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `collaborator_history` VALUES
  (1,1,NULL,'Analista','role','2024-01-01 12:00:00'),
  (2,1,'Analista','Coordenador','role','2024-02-01 12:00:00');

-- ── ETL-CONTRACTS-WRITER: programas + contratos sintéticos ─────────────────
-- Espelha as colunas legadas que o decode lê. Contrato 3 = alvo da allowlist de
-- exclusão (decisão c): Pendente, valor 0, código duplicado do contrato 1.
CREATE TABLE `programs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `abbreviation` varchar(255) NOT NULL,
  `director` varchar(255) DEFAULT NULL,
  `description` longtext,
  `logo` varchar(255) DEFAULT NULL,
  `active` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `programs` VALUES
  (1,'Programa Fake','PFAKE','Diretora Fake','Descricao fake','https://legado/logo.png',1,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contractCode` varchar(30) NOT NULL,
  `contractType` varchar(30) NOT NULL,
  `contractModel` varchar(30) NOT NULL,
  `contractStatus` varchar(30) NOT NULL DEFAULT 'Pendente',
  `object` varchar(100) NOT NULL,
  `totalValue` float NOT NULL,
  `supplierId` int DEFAULT NULL,
  `collaboratorId` int DEFAULT NULL,
  `financierId` int DEFAULT NULL,
  `programId` int DEFAULT NULL,
  `budgetPlanId` int DEFAULT NULL,
  `contractPeriodStart` timestamp NULL DEFAULT NULL,
  `contractPeriodEnd` timestamp NULL DEFAULT NULL,
  `contractPeriodIsIndefinite` tinyint NOT NULL DEFAULT '0',
  `signedContractUrl` varchar(255) DEFAULT NULL,
  `pixInfoKey_type` varchar(255) DEFAULT NULL,
  `pixInfoKey` varchar(255) DEFAULT NULL,
  `bancaryInfoBank` varchar(120) DEFAULT NULL,
  `bancaryInfoAgency` varchar(20) DEFAULT NULL,
  `bancaryInfoAccountnumber` varchar(20) DEFAULT NULL,
  `bancaryInfoDv` varchar(1) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `contracts` VALUES
  (1,'000000001/2025','Fornecedor','Serviço','Em andamento','Servico fake em andamento',1500.50,1,NULL,NULL,1,7,'2025-02-01 03:00:00','2025-12-31 03:00:00',0,'https://legado/contrato1.pdf',NULL,NULL,NULL,NULL,NULL,NULL,'2025-01-15 12:00:00','2025-01-16 12:00:00'),
  (2,'000000002/2025','Fornecedor','Serviço','Finalizado','Servico fake finalizado',900.00,2,NULL,NULL,1,7,'2024-12-01 03:00:00','2025-06-30 03:00:00',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-11-20 12:00:00','2025-07-02 09:00:00'),
  (3,'000000001/2025','Colaborador','Serviço','Pendente','Cadastro abortado',0,NULL,1,NULL,1,7,'2025-02-01 03:00:00','2025-12-31 03:00:00',0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-01-15 12:00:00','2025-01-15 12:00:00');

-- ── ETL-FINANCIAL-WRITER: contas, payables e aprovações sintéticas ──────────
-- Colaborador 3 compartilha e-mail com o user 1 (join do aprovador — D11/F1:
-- approvals.userId é NULL no legado real; identidade via collaboratorId→email).
INSERT INTO `collaborators`
  (`id`,`name`,`email`,`cpf`,`occupationArea`,`role`,`startOfContract`,`employmentRelationship`,`status`,`active`,`disableBy`,`createdAt`,`updatedAt`)
VALUES
  (3,'Aprovador Fake','user@fake.test','39053344705','PARC','Gerente','2024-01-01 12:00:00','CLT','CADASTRO_COMPLETO',1,NULL,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `bank` varchar(150) NOT NULL,
  `agency` varchar(25) NOT NULL,
  `accountNumber` varchar(25) NOT NULL,
  `dv` varchar(3) NOT NULL,
  `initialBalance` double NOT NULL DEFAULT '0',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `accounts` VALUES
  (1,'CONTA FAKE','BRADESCO','0288-7','12345','0',1000.50,'2024-01-01 12:00:00','2024-01-02 12:00:00');

CREATE TABLE `payables` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identifierCode` varchar(255) DEFAULT NULL,
  `debtorType` varchar(255) NOT NULL DEFAULT 'FORNECEDOR',
  `supplierId` int DEFAULT NULL,
  `collaboratorId` int DEFAULT NULL,
  `payableStatus` varchar(255) NOT NULL,
  `paymentType` varchar(255) NOT NULL,
  `obs` varchar(255) DEFAULT NULL,
  `liquidValue` float NOT NULL,
  `taxValue` float NOT NULL,
  `totalValue` float NOT NULL,
  `paymentMethod` varchar(255) DEFAULT NULL,
  `barcode` varchar(255) DEFAULT NULL,
  `docType` varchar(255) DEFAULT NULL,
  `accountId` int DEFAULT NULL,
  `contractId` int DEFAULT NULL,
  `recurrent` tinyint NOT NULL DEFAULT '0',
  `dueDate` timestamp NULL DEFAULT NULL,
  `paymentDate` timestamp NULL DEFAULT NULL,
  `competence_date` date DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 1=APROVADO (com approval); 2=LANÇADO COM CONTRATO (contrato 1 da fixture);
-- 4=EM APROVAÇÃO sem dueDate (F4→Draft); 45=allowlist F5 (ExcludedByDecision).
INSERT INTO `payables` VALUES
  (1,'NF-100','FORNECEDOR',1,NULL,'APROVADO','SEM CONTRATO','Servico aprovado',500.00,0,500.00,'BOLETO','8467-linha','NOTA FISCAL',1,NULL,0,'2026-03-15 03:00:00',NULL,'2026-02-01','2026-01-10 12:00:00','2026-02-01 09:00:00'),
  (2,'FAT-200','FORNECEDOR',2,NULL,'LANÇADO','COM CONTRATO','Fatura do contrato',250.25,0,250.25,'PIX',NULL,'FATURA',1,1,0,'2026-04-10 03:00:00',NULL,'2026-03-01','2026-02-15 12:00:00','2026-02-15 12:00:00'),
  (4,'NF-400','FORNECEDOR',1,NULL,'EM APROVAÇÃO','SEM CONTRATO','Sem vencimento',99.90,0,99.90,'TED',NULL,'NOTA FISCAL',NULL,NULL,0,NULL,NULL,NULL,'2026-02-20 12:00:00','2026-02-20 12:00:00'),
  (45,'TESTE-45','FORNECEDOR',1,NULL,'LANÇADO','SEM CONTRATO','Parcelado de teste',10000.00,0,10000.00,'BOLETO',NULL,'NOTA FISCAL',1,NULL,0,'2026-05-01 03:00:00',NULL,'2026-02-02','2026-02-02 12:00:00','2026-02-02 12:00:00');

CREATE TABLE `approvals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `collaboratorId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `payableId` int NOT NULL,
  `approved` tinyint DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- userId NULL de propósito (defeito F1 do dump real); identidade via collaborator 3.
INSERT INTO `approvals` VALUES
  (1,3,NULL,1,1,'2026-02-20 14:30:00'),
  (2,3,NULL,2,1,'2026-02-21 10:00:00');

CREATE TABLE `categorization` (
  `id` int NOT NULL AUTO_INCREMENT,
  `programId` int DEFAULT NULL,
  `budgetPlanId` int DEFAULT NULL,
  `costCenterId` int DEFAULT NULL,
  `categoryId` int DEFAULT NULL,
  `subCategoryId` int DEFAULT NULL,
  `payableRelationalId` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `categorization` VALUES (1,1,7,10,20,30,1);

CREATE TABLE `installments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payableId` int DEFAULT NULL,
  `installmentNumber` int NOT NULL,
  `totalInstallments` int NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'LIQUIDO',
  `value` float NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'PENDENTE',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO `installments` VALUES (1,1,1,1,'LIQUIDO',500.00,'ATRASADO');
