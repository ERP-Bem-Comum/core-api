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
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- CNPJs DEVEM ser distintos entre suppliers: par_suppliers tem UNIQUE(cnpj) no destino
-- (par_suppliers_cnpj_idx). Reusar o mesmo CNPJ faria o 2º supplier cair em quarentena
-- por ER_DUP_ENTRY, quebrando a reconciliação/idempotência da ETL.
INSERT INTO `suppliers` VALUES
  (1,'Forn Fake','forn@fake.test','11444777000161','Forn Fake LTDA','FF','INFORMATICA',1,'001','1234','567890','1',NULL,NULL,'2024-01-01 12:00:00','2024-01-02 12:00:00'),
  (2,'Forn Pix','pixforn@fake.test','11222333000181','Forn Pix LTDA','FP','LIMPEZA',1,NULL,NULL,NULL,NULL,'email','pix@fake.test','2024-01-01 12:00:00','2024-01-02 12:00:00');

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
