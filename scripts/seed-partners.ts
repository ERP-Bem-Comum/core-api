import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import * as schema from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';
import { randomUUID } from 'node:crypto';

// Algoritmos de validação do módulo 11 para CNPJ/CPF válidos nas seeds
const generateValidCnpj = (base: string): string => {
  const DV1_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const DV2_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const moduleEleven = (sum: number): number => {
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = moduleEleven(
    base.split('').reduce((acc, digit, i) => acc + Number(digit) * (DV1_WEIGHTS[i] ?? 0), 0),
  );
  const base2 = base + String(d1);
  const d2 = moduleEleven(
    base2.split('').reduce((acc, digit, i) => acc + Number(digit) * (DV2_WEIGHTS[i] ?? 0), 0),
  );
  return base2 + String(d2);
};

const generateValidCpf = (base: string): string => {
  const DV1_WEIGHTS = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const DV2_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  const moduleEleven = (sum: number): number => {
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = moduleEleven(
    base.split('').reduce((acc, digit, i) => acc + Number(digit) * (DV1_WEIGHTS[i] ?? 0), 0),
  );
  const base2 = base + String(d1);
  const d2 = moduleEleven(
    base2.split('').reduce((acc, digit, i) => acc + Number(digit) * (DV2_WEIGHTS[i] ?? 0), 0),
  );
  return base2 + String(d2);
};

const main = async (): Promise<void> => {
  const connectionString =
    process.env.AUTH_DATABASE_URL ?? 'mysql://core_app:core_local_dev_only@127.0.0.1:3306/core';
  console.log(`Conectando ao banco de dados: ${connectionString}...`);

  const handleR = await openPartnersMysql({
    connectionString,
    applyMigrations: true,
  });

  if (!handleR.ok) {
    console.error(`Erro ao conectar/migrar MySQL: ${handleR.error}`);
    process.exit(1);
  }

  const { db } = handleR.value;

  try {
    console.log('Limpando tabelas antigas do módulo partners...');
    // Ordem segura de limpeza devido a constraints (não há FK cross-agregados pelo design, mas limpa tudo)
    await db.delete(schema.parSuppliers);
    await db.delete(schema.parCollaborators);
    await db.delete(schema.parUserProfiles);
    await db.delete(schema.parActs);
    await db.delete(schema.parFinanciers);

    const now = new Date();

    console.log('Semeando Fornecedores (par_suppliers)...');
    await db.insert(schema.parSuppliers).values([
      {
        id: randomUUID(),
        name: 'Fornecedor Alfa Informática S/A',
        email: 'contato@alfainfo.com.br',
        cnpj: generateValidCnpj('200000000001'),
        corporateName: 'ALFA INFORMATICA E SERVICOS S/A',
        fantasyName: 'Alfa Tech',
        serviceCategory: 'INFORMATICA',
        active: true,
        bankAccountBank: '001',
        bankAccountAgency: '1234',
        bankAccountNumber: '56789',
        bankAccountCheckDigit: '0',
        pixKeyType: 'cnpj',
        pixKey: generateValidCnpj('200000000001'),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Restaurante Sabor Caseiro Ltda',
        email: 'financeiro@saborcaseiro.com.br',
        cnpj: generateValidCnpj('200000000002'),
        corporateName: 'SABOR CASEIRO PROVEDORES DE ALIMENTOS LTDA',
        fantasyName: 'Restaurante Sabor Caseiro',
        serviceCategory: 'ALIMENTACAO',
        active: true,
        pixKeyType: 'email',
        pixKey: 'financeiro@saborcaseiro.com.br',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Gama Organização de Eventos EIRELI',
        email: 'eventos@gama.com.br',
        cnpj: generateValidCnpj('200000000003'),
        corporateName: 'GAMA ORGANIZACAO DE EVENTOS LTDA',
        fantasyName: 'Gama Eventos',
        serviceCategory: 'ONGANIZACAO_DE_EVENTOS',
        active: true,
        bankAccountBank: '341',
        bankAccountAgency: '4321',
        bankAccountNumber: '98765',
        bankAccountCheckDigit: 'X',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Delta Conservação e Limpeza',
        email: 'delta@deltalimpeza.com.br',
        cnpj: generateValidCnpj('200000000004'),
        corporateName: 'DELTA SERVICOS DE PORTARIA E LIMPEZA LTDA',
        fantasyName: 'Delta Limpeza',
        serviceCategory: 'LIMPEZA',
        active: false,
        deactivatedAt: now,
        pixKeyType: 'random-key',
        pixKey: '3c47f5a2-c7f8-4e12-b91c-fa5812b323c2',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Semeando Financiadores (par_financiers)...');
    await db.insert(schema.parFinanciers).values([
      {
        id: randomUUID(),
        name: 'Instituto Bem Comum',
        corporateName: 'INSTITUTO BEM COMUM DE DESENVOLVIMENTO SOCIAL',
        legalRepresentative: 'Helena Souza',
        cnpj: generateValidCnpj('100000000001'),
        telephone: '11999999999',
        address: 'Av. Paulista, 1000, São Paulo - SP',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Fundo Social de Apoio',
        corporateName: 'FUNDO SOCIAL DE APOIO E INVESTIMENTO',
        legalRepresentative: 'Marcos Ribeiro',
        cnpj: generateValidCnpj('100000000002'),
        telephone: '21888888888',
        address: 'Rua do Ouvidor, 50, Rio de Janeiro - RJ',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Investimentos Esperança Ltda',
        corporateName: 'ESPERANCA INVESTIMENTOS SOCIAIS LTDA',
        legalRepresentative: 'Roberto Lima',
        cnpj: generateValidCnpj('100000000003'),
        telephone: '31777777777',
        address: 'Av. Afonso Pena, 500, Belo Horizonte - MG',
        active: false,
        deactivatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Semeando Colaboradores (par_collaborators)...');
    await db.insert(schema.parCollaborators).values([
      {
        id: randomUUID(),
        name: 'João da Silva',
        email: 'joao.silva@bemcomum.dev',
        cpf: generateValidCpf('300000001'),
        occupationArea: 'PARC',
        role: 'Assessor de Parcerias',
        startOfContract: now,
        employmentRelationship: 'CLT',
        registrationStatus: 'Complete',
        rg: '123456789',
        dateOfBirth: new Date('1990-05-15'),
        completeAddress: 'Rua das Flores, 123, São Paulo - SP',
        telephone: '11988887777',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Maria Souza',
        email: 'maria.souza@bemcomum.dev',
        cpf: generateValidCpf('300000002'),
        occupationArea: 'DDI',
        role: 'Coordenadora Social',
        startOfContract: now,
        employmentRelationship: 'PJ',
        registrationStatus: 'PreRegistration',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Carlos Santos',
        email: 'carlos.santos@bemcomum.dev',
        cpf: generateValidCpf('300000003'),
        occupationArea: 'DCE',
        role: 'Analista Financeiro',
        startOfContract: now,
        employmentRelationship: 'CLT',
        registrationStatus: 'Complete',
        active: false,
        deactivatedAt: now,
        disableBy: 'admin@bemcomum.dev',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Semeando Colaboradores como User Profiles...');
    // Para que o login funcione vinculando colaboradores e perfis se necessário
    await db.insert(schema.parUserProfiles).values([
      {
        userRef: 'seed:admin@bemcomum.dev', // se for o mesmo id do auth seed, ou gera outro. Como o id do auth seed é persistido, podemos associar.
        name: 'João da Silva',
        cpf: generateValidCpf('300000001'),
        telephone: '11988887777',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Semeando ACTs (par_acts)...');
    await db.insert(schema.parActs).values([
      {
        id: randomUUID(),
        name: 'Ana Oliveira',
        email: 'ana.oliveira@bemcomum.dev',
        cpf: generateValidCpf('400000001'),
        occupationArea: 'EPV',
        role: 'Agente Social',
        startOfContract: now,
        employmentRelationship: 'CLT',
        registrationStatus: 'Complete',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Pedro Ribeiro',
        email: 'pedro.ribeiro@bemcomum.dev',
        cpf: generateValidCpf('400000002'),
        occupationArea: 'PARC',
        role: 'Assistente Operacional',
        startOfContract: now,
        employmentRelationship: 'PJ',
        registrationStatus: 'PreRegistration',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: randomUUID(),
        name: 'Lucas Lima',
        email: 'lucas.lima@bemcomum.dev',
        cpf: generateValidCpf('400000003'),
        occupationArea: 'DDI',
        role: 'Agente de Campo',
        startOfContract: now,
        employmentRelationship: 'CLT',
        registrationStatus: 'Complete',
        active: false,
        deactivatedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Seeds aplicadas com sucesso!');
  } catch (err) {
    console.error('Falha ao semear tabelas no MySQL:', err);
    process.exit(1);
  } finally {
    await handleR.value.close();
    process.exit(0);
  }
};

void main();
