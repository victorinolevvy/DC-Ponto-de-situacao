import {
  PrismaClient,
  Prisma,
  Perfil,
  TipoProjeto,
  EstadoProjeto,
  TipoContrato,
  TipoMarco,
  PrazoStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'Senha123!';
  const hash = await bcrypt.hash(password, 10);

  await prisma.utilizador.upsert({
    where: { email: 'admin@demo' },
    update: {},
    create: {
      nome: 'Administrador Demo',
      email: 'admin@demo',
      perfil: Perfil.Admin,
      hashSenha: hash,
    },
  });

  await prisma.utilizador.upsert({
    where: { email: 'director@demo' },
    update: {},
    create: {
      nome: 'Director Demo',
      email: 'director@demo',
      perfil: Perfil.Director,
      hashSenha: hash,
    },
  });

  await prisma.utilizador.upsert({
    where: { email: 'gestor@demo' },
    update: {},
    create: {
      nome: 'Gestor Demo',
      email: 'gestor@demo',
      perfil: Perfil.Gestor,
      hashSenha: hash,
    },
  });

  const gestor = await prisma.utilizador.findUnique({
    where: { email: 'gestor@demo' },
    select: { id: true },
  });

  const provincias = await prisma.provincia.findMany();
  if (provincias.length === 0) {
    const maputo = await prisma.provincia.create({
      data: { nome: 'Maputo' },
    });
    const gaza = await prisma.provincia.create({
      data: { nome: 'Gaza' },
    });
    const sofala = await prisma.provincia.create({
      data: { nome: 'Sofala' },
    });

    const distritos = await prisma.$transaction([
      prisma.distrito.create({
        data: { nome: 'Matutuine', provinciaId: maputo.id },
      }),
      prisma.distrito.create({
        data: { nome: 'Boane', provinciaId: maputo.id },
      }),
      prisma.distrito.create({
        data: { nome: 'Xai-Xai', provinciaId: gaza.id },
      }),
      prisma.distrito.create({
        data: { nome: 'Chibuto', provinciaId: gaza.id },
      }),
      prisma.distrito.create({
        data: { nome: 'Beira', provinciaId: sofala.id },
      }),
    ]);

    const [matutuine, boane, xaixai, chibuto, beira] = distritos;

    await prisma.$transaction([
      prisma.postoAdm.create({
        data: { nome: 'Salamanga', distritoId: matutuine.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Catembe', distritoId: matutuine.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Boane Sede', distritoId: boane.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Massaca', distritoId: boane.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Xai-Xai Sede', distritoId: xaixai.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Chongoene', distritoId: xaixai.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Chibuto Sede', distritoId: chibuto.id },
      }),
      prisma.postoAdm.create({
        data: { nome: 'Inhamizua', distritoId: beira.id },
      }),
    ]);

    const postos = await prisma.postoAdm.findMany();
    const postoByNome = Object.fromEntries(postos.map((posto) => [posto.nome, posto]));

    const divinhe = await prisma.projeto.create({
      data: {
        nome: 'Divinhe - FV',
        tipoProjeto: TipoProjeto.FV,
        provinciaId: maputo.id,
        distritoId: matutuine.id,
        postoAdmId: postoByNome['Salamanga'].id,
        chaveNaMao: true,
        latitude: new Prisma.Decimal(-26.4621),
        longitude: new Prisma.Decimal(32.1723),
        estado: EstadoProjeto.EmCurso,
        valorGlobalMT: new Prisma.Decimal(120000000),
        contratos: {
          create: [
            {
              tipoContrato: TipoContrato.Civil,
              empresa: 'Construtora Atlântico',
              valorContratoMT: new Prisma.Decimal(45000000),
              dataInicio: new Date('2024-02-01'),
              dataPrevistaFim: new Date('2024-12-15'),
              chaveNaMao: true,
            },
            {
              tipoContrato: TipoContrato.Rede,
              empresa: 'Electro Rede Lda',
              valorContratoMT: new Prisma.Decimal(30000000),
              dataInicio: new Date('2024-03-10'),
              dataPrevistaFim: new Date('2025-01-20'),
              chaveNaMao: false,
            },
          ],
        },
        marcos: {
          create: [
            {
              tipo: TipoMarco.Consignacao,
              data: new Date('2024-02-05'),
              nota: 'Consignação assinada',
            },
            {
              tipo: TipoMarco.Vistoria,
              data: new Date('2024-08-22'),
              nota: 'Vistoria intermédia',
            },
            {
              tipo: TipoMarco.PrevFim,
              data: new Date('2024-12-31'),
              nota: 'Previsão de conclusão civil',
            },
          ],
        },
      },
      include: { contratos: true },
    });

    const benzane = await prisma.projeto.create({
      data: {
        nome: 'Benzane - Mini Rede',
        tipoProjeto: TipoProjeto.MiniRede,
        provinciaId: gaza.id,
        distritoId: xaixai.id,
        postoAdmId: postoByNome['Chongoene'].id,
        chaveNaMao: false,
        latitude: new Prisma.Decimal(-24.7091),
        longitude: new Prisma.Decimal(33.5342),
        estado: EstadoProjeto.EmCurso,
        valorGlobalMT: new Prisma.Decimal(85000000),
        contratos: {
          create: [
            {
              tipoContrato: TipoContrato.Fiscalizacao,
              empresa: 'Fiscais Unidos',
              valorContratoMT: new Prisma.Decimal(8000000),
              dataInicio: new Date('2024-01-15'),
              dataPrevistaFim: new Date('2024-11-30'),
              chaveNaMao: false,
            },
            {
              tipoContrato: TipoContrato.Rede,
              empresa: 'Electro Rede Sul',
              valorContratoMT: new Prisma.Decimal(21000000),
              dataInicio: new Date('2024-03-01'),
              dataPrevistaFim: new Date('2024-10-25'),
              chaveNaMao: true,
            },
          ],
        },
        marcos: {
          create: [
            {
              tipo: TipoMarco.AutoInicio,
              data: new Date('2024-03-12'),
              nota: 'Auto de início emitido',
            },
            {
              tipo: TipoMarco.Vistoria,
              data: new Date('2024-07-18'),
              nota: 'Vistoria técnica parcial',
            },
            {
              tipo: TipoMarco.Fecho,
              data: new Date('2024-11-30'),
              nota: 'Fecho contratual previsto',
            },
          ],
        },
      },
      include: { contratos: true },
    });

    const tome = await prisma.projeto.create({
      data: {
        nome: 'Tomé - FV + Rede',
        tipoProjeto: TipoProjeto.FV,
        provinciaId: sofala.id,
        distritoId: beira.id,
        postoAdmId: postoByNome['Inhamizua'].id,
        chaveNaMao: false,
        latitude: new Prisma.Decimal(-19.8012),
        longitude: new Prisma.Decimal(34.8385),
        estado: EstadoProjeto.Parado,
        valorGlobalMT: new Prisma.Decimal(132000000),
        contratos: {
          create: [
            {
              tipoContrato: TipoContrato.BESS,
              empresa: 'Storage Solutions',
              valorContratoMT: new Prisma.Decimal(28000000),
              dataInicio: new Date('2023-11-01'),
              dataPrevistaFim: new Date('2024-09-30'),
              chaveNaMao: false,
            },
            {
              tipoContrato: TipoContrato.Fornecimento,
              empresa: 'Cabos & Cia',
              valorContratoMT: new Prisma.Decimal(25000000),
              dataInicio: new Date('2023-12-10'),
              dataPrevistaFim: new Date('2024-10-15'),
              chaveNaMao: true,
            },
          ],
        },
        marcos: {
          create: [
            {
              tipo: TipoMarco.Consignacao,
              data: new Date('2023-10-05'),
              nota: 'Consignação com observações',
            },
            {
              tipo: TipoMarco.Outro,
              data: new Date('2024-05-20'),
              nota: 'Entrega de equipamentos críticos',
            },
            {
              tipo: TipoMarco.PrevFim,
              data: new Date('2024-10-31'),
              nota: 'Previsão de conclusão com ajustes',
            },
          ],
        },
      },
      include: { contratos: true },
    });

    const fornecimento = await prisma.projeto.create({
      data: {
        nome: 'Fornecimento Cabos - Transversal',
        tipoProjeto: TipoProjeto.Outro,
        provinciaId: maputo.id,
        distritoId: boane.id,
        postoAdmId: postoByNome['Boane Sede'].id,
        chaveNaMao: true,
        latitude: new Prisma.Decimal(-25.9651),
        longitude: new Prisma.Decimal(32.4797),
        estado: EstadoProjeto.Concluido,
        valorGlobalMT: new Prisma.Decimal(65000000),
        contratos: {
          create: [
            {
              tipoContrato: TipoContrato.Fornecimento,
              empresa: 'Global Cabos SA',
              valorContratoMT: new Prisma.Decimal(40000000),
              dataInicio: new Date('2023-06-01'),
              dataPrevistaFim: new Date('2023-12-15'),
              chaveNaMao: true,
            },
            {
              tipoContrato: TipoContrato.Fiscalizacao,
              empresa: 'AuditPower',
              valorContratoMT: new Prisma.Decimal(6000000),
              dataInicio: new Date('2023-06-15'),
              dataPrevistaFim: new Date('2023-12-31'),
              chaveNaMao: false,
            },
          ],
        },
        marcos: {
          create: [
            {
              tipo: TipoMarco.AutoInicio,
              data: new Date('2023-06-20'),
              nota: 'Logística estabelecida para entregas faseadas.',
            },
            {
              tipo: TipoMarco.Fecho,
              data: new Date('2023-12-18'),
              nota: 'Entrega final validada pela fiscalização.',
            },
          ],
        },
      },
      include: { contratos: true },
    });

    if (gestor) {
      const contratosDivinhe = Object.fromEntries(
        divinhe.contratos.map((contrato) => [contrato.tipoContrato, contrato.id]),
      );
      await prisma.relatorioQuinzenal.createMany({
        data: [
          {
            projetoId: divinhe.id,
            contratoId: null,
            dataRef: new Date('2024-02-15'),
            execFisicaPct: 18.5,
            execFinanceiraPct: 20.1,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Risco logístico moderado (espera de painéis).',
            mitigacao: 'Contacto semanal com fornecedor.',
            autorUserId: gestor.id,
          },
          {
            projetoId: divinhe.id,
            contratoId: contratosDivinhe[TipoContrato.Civil],
            dataRef: new Date('2024-03-01'),
            execFisicaPct: 32.4,
            execFinanceiraPct: 34.2,
            prazo: PrazoStatus.NO_PRAZO,
            risco: null,
            mitigacao: null,
            autorUserId: gestor.id,
          },
          {
            projetoId: divinhe.id,
            contratoId: contratosDivinhe[TipoContrato.Rede],
            dataRef: new Date('2024-03-15'),
            execFisicaPct: 15.0,
            execFinanceiraPct: 18.3,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Observado atraso na entrega de cabos.',
            mitigacao: 'Solicitado reforço de expedição.',
            autorUserId: gestor.id,
          },
          {
            projetoId: divinhe.id,
            contratoId: null,
            dataRef: new Date('2024-03-30'),
            execFisicaPct: 44.8,
            execFinanceiraPct: 46.1,
            prazo: PrazoStatus.NO_PRAZO,
            risco: null,
            mitigacao: null,
            autorUserId: gestor.id,
          },
        ],
      });

      const contratosBenzane = Object.fromEntries(
        benzane.contratos.map((contrato) => [contrato.tipoContrato, contrato.id]),
      );
      await prisma.relatorioQuinzenal.createMany({
        data: [
          {
            projetoId: benzane.id,
            contratoId: null,
            dataRef: new Date('2024-01-31'),
            execFisicaPct: 12.0,
            execFinanceiraPct: 14.0,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Equipa reduzida devido a chuvas intensas.',
            mitigacao: 'Reforço de turnos agendado.',
            autorUserId: gestor.id,
          },
          {
            projetoId: benzane.id,
            contratoId: contratosBenzane[TipoContrato.Rede],
            dataRef: new Date('2024-02-15'),
            execFisicaPct: 25.0,
            execFinanceiraPct: 27.5,
            prazo: PrazoStatus.NO_PRAZO,
            risco: '',
            mitigacao: '',
            autorUserId: gestor.id,
          },
          {
            projetoId: benzane.id,
            contratoId: null,
            dataRef: new Date('2024-03-15'),
            execFisicaPct: 38.5,
            execFinanceiraPct: 42.0,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Dependência de importação de contadores.',
            mitigacao: 'Processo de desalfandegamento acelerado.',
            autorUserId: gestor.id,
          },
          {
            projetoId: benzane.id,
            contratoId: contratosBenzane[TipoContrato.Fiscalizacao],
            dataRef: new Date('2024-03-30'),
            execFisicaPct: 52.0,
            execFinanceiraPct: 54.8,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Risco de penalidade se inspeção atrasar.',
            mitigacao: 'Equipa de fiscalização adicional mobilizada.',
            autorUserId: gestor.id,
          },
        ],
      });

      const contratosTome = Object.fromEntries(
        tome.contratos.map((contrato) => [contrato.tipoContrato, contrato.id]),
      );
      await prisma.relatorioQuinzenal.createMany({
        data: [
          {
            projetoId: tome.id,
            contratoId: null,
            dataRef: new Date('2023-12-31'),
            execFisicaPct: 40.0,
            execFinanceiraPct: 43.0,
            prazo: PrazoStatus.ATRASADO,
            risco: 'Bloqueio por litígio com fornecedor local.',
            mitigacao: 'Acção judicial em curso.',
            autorUserId: gestor.id,
          },
          {
            projetoId: tome.id,
            contratoId: contratosTome[TipoContrato.BESS],
            dataRef: new Date('2024-02-15'),
            execFisicaPct: 48.0,
            execFinanceiraPct: 55.0,
            prazo: PrazoStatus.ATRASADO,
            risco: 'Falha crítica identificada nos inversores.',
            mitigacao: 'Fornecedor enviou equipa de reparação.',
            autorUserId: gestor.id,
          },
          {
            projetoId: tome.id,
            contratoId: contratosTome[TipoContrato.Fornecimento],
            dataRef: new Date('2024-03-15'),
            execFisicaPct: 62.5,
            execFinanceiraPct: 75.0,
            prazo: PrazoStatus.ATRASADO,
            risco: 'Não conformidade em cabos entregues.',
            mitigacao: 'Reposição em negociação.',
            autorUserId: gestor.id,
          },
          {
            projetoId: tome.id,
            contratoId: null,
            dataRef: new Date('2024-03-31'),
            execFisicaPct: 65.0,
            execFinanceiraPct: 78.5,
            prazo: PrazoStatus.ATRASADO,
            risco: 'Projeto parado aguardando garantia bancária.',
            mitigacao: 'Reunião com banco marcada.',
            autorUserId: gestor.id,
          },
        ],
      });

      const contratosFornecimento = Object.fromEntries(
        fornecimento.contratos.map((contrato) => [contrato.tipoContrato, contrato.id]),
      );
      await prisma.relatorioQuinzenal.createMany({
        data: [
          {
            projetoId: fornecimento.id,
            contratoId: null,
            dataRef: new Date('2023-10-15'),
            execFisicaPct: 82.0,
            execFinanceiraPct: 84.0,
            prazo: PrazoStatus.NO_PRAZO,
            risco: 'Risco residual de transporte mitigado com stock local.',
            mitigacao: 'Armazém temporário instalado em Boane.',
            autorUserId: gestor.id,
          },
          {
            projetoId: fornecimento.id,
            contratoId: contratosFornecimento[TipoContrato.Fornecimento],
            dataRef: new Date('2023-11-15'),
            execFisicaPct: 95.0,
            execFinanceiraPct: 94.0,
            prazo: PrazoStatus.NO_PRAZO,
            risco: '',
            mitigacao: '',
            autorUserId: gestor.id,
          },
          {
            projetoId: fornecimento.id,
            contratoId: null,
            dataRef: new Date('2023-12-20'),
            execFisicaPct: 100.0,
            execFinanceiraPct: 99.0,
            prazo: PrazoStatus.CONCLUIDO,
            risco: null,
            mitigacao: null,
            autorUserId: gestor.id,
          },
        ],
      });
    }
  }

  console.log('Seed concluída. Credenciais padrão: admin@demo / Senha123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
