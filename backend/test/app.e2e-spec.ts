/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */

import {
  INestApplication,
  ClassSerializerInterceptor,
  ValidationPipe,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { Perfil } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TransformResponseInterceptor } from '../src/common/interceptors/transform-response.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let currentUser: { id: number; perfil: Perfil; email: string } = {
    id: 1,
    perfil: Perfil.Admin,
    email: 'admin@demo',
  };
  const prismaMock = {
    utilizador: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    provincia: {
      findMany: jest.fn(),
    },
    projeto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    contrato: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    marco: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    relatorioQuinzenal: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock);

    const guardMock: CanActivate = {
      canActivate: (context: ExecutionContext) => {
        const http = context.switchToHttp();
        const req = http.getRequest<{
          user?: { id: number; perfil: string; email: string };
        }>();
        req.user = currentUser;
        return true;
      },
    };

    const moduleFixture = await moduleBuilder
      .overrideProvider(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue(guardMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(
      (
        req: Request & { user?: { id: number; perfil: Perfil; email: string } },
        _res: unknown,
        next: () => void,
      ) => {
        req.user = currentUser;
        next();
      },
    );
    const reflector = app.get(Reflector);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(reflector),
      new TransformResponseInterceptor(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { id: 1, perfil: Perfil.Admin, email: 'admin@demo' };
    const projetoFindUniqueMock = prismaMock.projeto.findUnique as jest.Mock;
    projetoFindUniqueMock.mockResolvedValue({
      id: 1,
    });
    (prismaMock.projeto.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.contrato.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      projetoId: 1,
    });
    (prismaMock.relatorioQuinzenal.findMany as jest.Mock).mockResolvedValue([]);
    (prismaMock.relatorioQuinzenal.count as jest.Mock).mockResolvedValue(0);
    (prismaMock.relatorioQuinzenal.findFirst as jest.Mock).mockResolvedValue(
      null,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('/auth/login (POST) deve autenticar utilizador válido', async () => {
    const password = 'Senha123!';
    const hash = await bcrypt.hash(password, 10);

    const utilizadorFindUniqueMock = prismaMock.utilizador
      .findUnique as jest.Mock;
    utilizadorFindUniqueMock.mockResolvedValue({
      id: 1,
      nome: 'Gestor Demo',
      email: 'gestor@demo',
      perfil: 'Gestor',
      hashSenha: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .post('/auth/login')
      .send({ email: 'gestor@demo', senha: password })
      .expect(200);

    const body = response.body as {
      success: boolean;
      data: {
        accessToken: string;
        user: { email: string };
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe('gestor@demo');
  });

  it('/provincias (GET) deve listar provincias', async () => {
    const provinciaFindManyMock = prismaMock.provincia.findMany as jest.Mock;
    provinciaFindManyMock.mockResolvedValue([
      { id: 1, nome: 'Maputo', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .get('/provincias')
      .expect(200);

    const body = response.body as {
      success: boolean;
      data: Array<{ id: number; nome: string }>;
    };

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].nome).toBe('Maputo');
  });

  it('/projetos/:id/contratos (POST) deve criar contrato', async () => {
    const now = new Date();
    const contratoCreateMock = prismaMock.contrato.create as jest.Mock;
    contratoCreateMock.mockResolvedValue({
      id: 7,
      projetoId: 1,
      tipoContrato: 'Civil',
      empresa: 'Construtora Atlântico',
      valorContratoMT: '45000000',
      dataInicio: now,
      dataPrevistaFim: now,
      chaveNaMao: true,
      createdAt: now,
      updatedAt: now,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .post('/projetos/1/contratos')
      .send({
        tipoContrato: 'Civil',
        empresa: 'Construtora Atlântico',
        valorContratoMT: 45000000,
        dataInicio: now.toISOString(),
        dataPrevistaFim: now.toISOString(),
        chaveNaMao: true,
      })
      .expect(201);

    const body = response.body as {
      success: boolean;
      data: { id: number; projetoId: number; empresa: string };
    };

    expect(contratoCreateMock).toHaveBeenCalled();
    expect(body.success).toBe(true);
    expect(body.data.projetoId).toBe(1);
    expect(body.data.empresa).toBe('Construtora Atlântico');
  });

  it('/projetos/:id/contratos (GET) deve listar contratos', async () => {
    const now = new Date();
    const contratoFindManyMock = prismaMock.contrato.findMany as jest.Mock;
    contratoFindManyMock.mockResolvedValue([
      {
        id: 1,
        projetoId: 1,
        tipoContrato: 'Civil',
        empresa: 'Construtora Atlântico',
        valorContratoMT: '45000000',
        dataInicio: now,
        dataPrevistaFim: now,
        chaveNaMao: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .get('/projetos/1/contratos')
      .expect(200);

    const body = response.body as {
      success: boolean;
      data: Array<{ id: number; projetoId: number }>;
    };

    expect(contratoFindManyMock).toHaveBeenCalledWith({
      where: { projetoId: 1 },
      orderBy: { dataPrevistaFim: 'asc' },
    });
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(1);
  });

  it('/projetos/:id/marcos (POST) deve criar marco', async () => {
    const now = new Date('2024-08-22');
    const marcoCreateMock = prismaMock.marco.create as jest.Mock;
    marcoCreateMock.mockResolvedValue({
      id: 3,
      projetoId: 1,
      tipo: 'Vistoria',
      data: now,
      nota: 'Vistoria intermédia',
      createdAt: now,
      updatedAt: now,
    });

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .post('/projetos/1/marcos')
      .send({
        tipo: 'Vistoria',
        data: '2024-08-22',
        nota: 'Vistoria intermédia',
      })
      .expect(201);

    const body = response.body as {
      success: boolean;
      data: { id: number; tipo: string };
    };

    expect(marcoCreateMock).toHaveBeenCalled();
    expect(body.success).toBe(true);
    expect(body.data.tipo).toBe('Vistoria');
  });

  it('/projetos/:id/marcos (GET) deve listar marcos', async () => {
    const now = new Date();
    const marcoFindManyMock = prismaMock.marco.findMany as jest.Mock;
    marcoFindManyMock.mockResolvedValue([
      {
        id: 1,
        projetoId: 1,
        tipo: 'Consignacao',
        data: now,
        nota: 'Consignação assinada',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const response: Response = await request(server)
      .get('/projetos/1/marcos')
      .expect(200);

    const body = response.body as {
      success: boolean;
      data: Array<{ id: number; tipo: string }>;
    };

    expect(marcoFindManyMock).toHaveBeenCalledWith({
      where: { projetoId: 1 },
      orderBy: { data: 'asc' },
    });
    expect(body.success).toBe(true);
    expect(body.data[0].tipo).toBe('Consignacao');
  });

  describe('Resumo de projetos e semáforo', () => {
    it('/projetos/:id/resumo (GET) deve sinalizar verde sem motivos', async () => {
      const hoje = new Date('2024-04-01T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(hoje);

      const projetoFindUniqueMock = prismaMock.projeto.findUnique as jest.Mock;
      projetoFindUniqueMock.mockResolvedValue({
        id: 1,
        contratos: [
          {
            id: 11,
            projetoId: 1,
            tipoContrato: 'Civil',
            empresa: 'Construtora Atlântico',
            valorContratoMT: '45000000',
            dataInicio: new Date('2024-01-01T00:00:00.000Z'),
            dataPrevistaFim: new Date('2024-12-20T00:00:00.000Z'),
            chaveNaMao: true,
            createdAt: hoje,
            updatedAt: hoje,
          },
        ],
        marcos: [],
      });

      (prismaMock.relatorioQuinzenal.findFirst as jest.Mock).mockResolvedValue({
        id: 99,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-15T00:00:00.000Z'),
        execFisicaPct: 45,
        execFinanceiraPct: 47,
        prazo: 'NO_PRAZO',
        risco: null,
        mitigacao: null,
        autorUserId: 1,
        createdAt: hoje,
        updatedAt: hoje,
      });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/projetos/1/resumo')
        .expect(200);

      const body = response.body as {
        success: boolean;
        data: {
          statusSemaforo: string;
          motivosSemaforo: string[];
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.statusSemaforo).toBe('verde');
      expect(body.data.motivosSemaforo).toHaveLength(0);
    });

    it('/projetos/:id/resumo (GET) deve sinalizar amarelo com motivos relevantes', async () => {
      const hoje = new Date('2024-04-01T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(hoje);

      const projetoFindUniqueMock = prismaMock.projeto.findUnique as jest.Mock;
      projetoFindUniqueMock.mockResolvedValue({
        id: 1,
        contratos: [
          {
            id: 11,
            projetoId: 1,
            tipoContrato: 'Civil',
            empresa: 'Construtora Atlântico',
            valorContratoMT: '45000000',
            dataInicio: new Date('2024-01-01T00:00:00.000Z'),
            dataPrevistaFim: new Date('2024-04-10T00:00:00.000Z'),
            chaveNaMao: true,
            createdAt: hoje,
            updatedAt: hoje,
          },
        ],
        marcos: [],
      });

      (prismaMock.relatorioQuinzenal.findFirst as jest.Mock).mockResolvedValue({
        id: 99,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-25T00:00:00.000Z'),
        execFisicaPct: 40,
        execFinanceiraPct: 47,
        prazo: 'NO_PRAZO',
        risco: 'Risco de abastecimento a monitorizar.',
        mitigacao: 'Contactar fornecedor.',
        autorUserId: 1,
        createdAt: hoje,
        updatedAt: hoje,
      });
      (prismaMock.relatorioQuinzenal.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/projetos/1/resumo')
        .expect(200);

      const body = response.body as {
        success: boolean;
        data: { statusSemaforo: string; motivosSemaforo: string[] };
      };

      expect(body.success).toBe(true);
      expect(body.data.statusSemaforo).toBe('amarelo');
      expect(body.data.motivosSemaforo).toEqual(
        expect.arrayContaining([
          'risco_em_monitorizacao',
          'derrapagem_fisica_ate_10pp',
          'prazo_contrato_ate_15dias',
        ]),
      );
    });

    it('/projetos/:id/resumo (GET) deve sinalizar vermelho em caso crítico', async () => {
      const hoje = new Date('2024-04-01T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(hoje);

      const projetoFindUniqueMock = prismaMock.projeto.findUnique as jest.Mock;
      projetoFindUniqueMock.mockResolvedValue({
        id: 1,
        contratos: [
          {
            id: 11,
            projetoId: 1,
            tipoContrato: 'Civil',
            empresa: 'Construtora Atlântico',
            valorContratoMT: '45000000',
            dataInicio: new Date('2024-01-01T00:00:00.000Z'),
            dataPrevistaFim: new Date('2024-05-10T00:00:00.000Z'),
            chaveNaMao: true,
            createdAt: hoje,
            updatedAt: hoje,
          },
        ],
        marcos: [],
      });

      (prismaMock.relatorioQuinzenal.findFirst as jest.Mock).mockResolvedValue({
        id: 99,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-25T00:00:00.000Z'),
        execFisicaPct: 35,
        execFinanceiraPct: 48,
        prazo: 'ATRASADO',
        risco: 'Bloqueio de obra por garantia bancária.',
        mitigacao: 'Aguarda decisão.',
        autorUserId: 1,
        createdAt: hoje,
        updatedAt: hoje,
      });
      (prismaMock.relatorioQuinzenal.findMany as jest.Mock).mockResolvedValue([
        {
          id: 100,
          projetoId: 1,
          contratoId: 11,
          dataRef: new Date('2024-03-20T00:00:00.000Z'),
          execFisicaPct: 30,
          execFinanceiraPct: 45,
          prazo: 'ATRASADO',
          risco: 'Falha crítica em equipamentos.',
          mitigacao: null,
          autorUserId: 1,
          createdAt: hoje,
          updatedAt: hoje,
        },
      ]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/projetos/1/resumo')
        .expect(200);

      const body = response.body as {
        success: boolean;
        data: { statusSemaforo: string; motivosSemaforo: string[] };
      };

      expect(body.success).toBe(true);
      expect(body.data.statusSemaforo).toBe('vermelho');
      expect(body.data.motivosSemaforo).toEqual(
        expect.arrayContaining([
          'prazo_atrasado_projeto',
          'derrapagem_fisica_maior_10pp',
          'derrapagem_fisica_maior_10pp_contrato',
          'risco_critico_texto',
        ]),
      );
    });
  });

  describe('Relatórios Quinzenais', () => {
    it('/projetos/:id/relatorios (POST) deve criar relatório válido', async () => {
      const relatorioCreateMock = prismaMock.relatorioQuinzenal
        .create as jest.Mock;
      relatorioCreateMock.mockResolvedValue({
        id: 5,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-15T00:00:00.000Z'),
        execFisicaPct: '40.00',
        execFinanceiraPct: '45.00',
        prazo: 'NO_PRAZO',
        risco: null,
        mitigacao: null,
        autorUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .post('/projetos/1/relatorios')
        .send({
          dataRef: '2024-03-15',
          execFisicaPct: 40,
          execFinanceiraPct: 45,
          prazo: 'NO_PRAZO',
        })
        .expect(201);

      expect(relatorioCreateMock).toHaveBeenCalledTimes(1);

      const body = response.body as unknown as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('/projetos/:id/relatorios (POST) deve rejeitar percentagem inválida', async () => {
      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server)
        .post('/projetos/1/relatorios')
        .send({
          dataRef: '2024-03-15',
          execFisicaPct: 120,
          execFinanceiraPct: 40,
          prazo: 'NO_PRAZO',
        })
        .expect(400);
    });

    it('/projetos/:id/relatorios (GET) deve aplicar filtros e paginação', async () => {
      const relatorioFindManyMock = prismaMock.relatorioQuinzenal
        .findMany as jest.Mock;
      relatorioFindManyMock.mockResolvedValue([
        {
          id: 1,
          projetoId: 1,
          contratoId: 3,
          dataRef: new Date('2024-03-15T00:00:00.000Z'),
          execFisicaPct: '40.00',
          execFinanceiraPct: '45.00',
          prazo: 'NO_PRAZO',
          risco: null,
          mitigacao: null,
          autorUserId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (prismaMock.relatorioQuinzenal.count as jest.Mock).mockResolvedValue(12);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get(
          '/projetos/1/relatorios?from=2024-03-01&to=2024-03-31&contratoId=3&page=2&pageSize=5&sort=dataRef:asc',
        )
        .expect(200);

      expect(relatorioFindManyMock).toHaveBeenCalledWith({
        where: {
          projetoId: 1,
          deletedAt: null,
          dataRef: { gte: new Date('2024-03-01'), lte: new Date('2024-03-31') },
          contratoId: 3,
        },
        orderBy: [{ dataRef: 'asc' }],
        skip: 5,
        take: 5,
      });

      const listBody = response.body as unknown as {
        success: boolean;
        data: {
          meta: {
            total: number;
            page: number;
            pageSize: number;
            totalPages: number;
          };
        };
      };

      expect(listBody.data.meta).toMatchObject({
        total: 12,
        page: 2,
        pageSize: 5,
        totalPages: 3,
      });
    });

    it('/relatorios/:id (GET) deve impedir gestor de ver relatório de outro autor', async () => {
      currentUser = { id: 2, perfil: Perfil.Gestor, email: 'gestor@demo' };
      (prismaMock.relatorioQuinzenal.findFirst as jest.Mock).mockResolvedValue({
        id: 9,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date(),
        execFisicaPct: '40.00',
        execFinanceiraPct: '42.00',
        prazo: 'NO_PRAZO',
        risco: null,
        mitigacao: null,
        autorUserId: 99,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      await request(server).get('/relatorios/9').expect(403);
    });

    it('/relatorios/:id (PATCH) deve permitir actualização pelo autor gestor', async () => {
      currentUser = { id: 2, perfil: Perfil.Gestor, email: 'gestor@demo' };
      const relatorioFindFirstMock = prismaMock.relatorioQuinzenal
        .findFirst as jest.Mock;
      relatorioFindFirstMock.mockResolvedValue({
        id: 9,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-15T00:00:00.000Z'),
        execFisicaPct: '40.00',
        execFinanceiraPct: '42.00',
        prazo: 'NO_PRAZO',
        risco: null,
        mitigacao: null,
        autorUserId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const relatorioUpdateMock = prismaMock.relatorioQuinzenal
        .update as jest.Mock;
      relatorioUpdateMock.mockResolvedValue({
        id: 9,
        projetoId: 1,
        contratoId: null,
        dataRef: new Date('2024-03-15T00:00:00.000Z'),
        execFisicaPct: '44.00',
        execFinanceiraPct: '45.00',
        prazo: 'NO_PRAZO',
        risco: null,
        mitigacao: null,
        autorUserId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .patch('/relatorios/9')
        .send({ execFisicaPct: 44 })
        .expect(200);

      expect(relatorioUpdateMock).toHaveBeenCalled();
      const updateBody = response.body as unknown as { success: boolean };
      expect(updateBody.success).toBe(true);
    });

    it('/projetos/:id/evolucao (GET) deve retornar série temporal ordenada', async () => {
      (prismaMock.relatorioQuinzenal.findMany as jest.Mock).mockResolvedValue([
        {
          id: 7,
          dataRef: new Date('2024-03-01T00:00:00.000Z'),
          execFisicaPct: '35.00',
          execFinanceiraPct: '37.00',
        },
        {
          id: 9,
          dataRef: new Date('2024-03-15T00:00:00.000Z'),
          execFisicaPct: '44.00',
          execFinanceiraPct: '46.00',
        },
      ]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/projetos/1/evolucao?metric=fisica')
        .expect(200);

      expect(prismaMock.relatorioQuinzenal.findMany).toHaveBeenCalledWith({
        where: { projetoId: 1, deletedAt: null },
        orderBy: { dataRef: 'asc' },
        select: {
          id: true,
          dataRef: true,
          execFisicaPct: true,
          execFinanceiraPct: true,
        },
      });

      const evolucaoBody = response.body as unknown as {
        success: boolean;
        data: Array<{ id: number; dataRef: string; valor: number }>;
      };

      expect(evolucaoBody.data[0].valor).toBe(35);
      expect(evolucaoBody.data[1].valor).toBe(44);
    });

    it('/projetos/:id/ultima-quinzena (GET) deve calcular deltas', async () => {
      (prismaMock.relatorioQuinzenal.findMany as jest.Mock).mockResolvedValue([
        {
          id: 20,
          projetoId: 1,
          contratoId: null,
          dataRef: new Date('2024-03-30T00:00:00.000Z'),
          execFisicaPct: '55.00',
          execFinanceiraPct: '58.00',
          prazo: 'NO_PRAZO',
          risco: null,
          mitigacao: null,
          autorUserId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 18,
          projetoId: 1,
          contratoId: null,
          dataRef: new Date('2024-03-15T00:00:00.000Z'),
          execFisicaPct: '50.00',
          execFinanceiraPct: '54.00',
          prazo: 'NO_PRAZO',
          risco: null,
          mitigacao: null,
          autorUserId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/projetos/1/ultima-quinzena')
        .expect(200);

      const ultimaBody = response.body as unknown as {
        success: boolean;
        data: { deltas: { execFisicaPct: number; execFinanceiraPct: number } };
      };

      expect(ultimaBody.data.deltas).toEqual({
        execFisicaPct: 5,
        execFinanceiraPct: 4,
      });
    });
  });

  describe('Dashboard overview', () => {
    it('/dashboard/overview (GET) aplica filtros e retorna lista paginada', async () => {
      const now = new Date('2024-03-30T00:00:00.000Z');
      (prismaMock.projeto.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 1,
          nome: 'Divinhe - FV',
          provinciaId: 1,
          provincia: { id: 1, nome: 'Maputo' },
          tipoProjeto: 'FV',
          estado: 'EmCurso',
          latitude: -26.4621,
          longitude: 32.1723,
          valorGlobalMT: 120_000_000,
          chaveNaMao: true,
          createdAt: now,
          updatedAt: now,
          contratos: [
            {
              id: 10,
              valorContratoMT: 45_000_000,
              dataPrevistaFim: new Date('2024-12-31T00:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ]);

      const relatorioFindManyMock = prismaMock.relatorioQuinzenal
        .findMany as jest.Mock;
      relatorioFindManyMock
        .mockResolvedValueOnce([
          {
            id: 100,
            projetoId: 1,
            contratoId: null,
            dataRef: new Date('2024-03-30T00:00:00.000Z'),
            execFisicaPct: '44.80',
            execFinanceiraPct: '46.10',
            prazo: 'NO_PRAZO',
            risco: 'Observado atraso na entrega de cabos.',
            mitigacao: 'Gestão com fornecedor.',
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .mockResolvedValueOnce([]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get(
          '/dashboard/overview?provinciaId=1&page=1&pageSize=5&sortBy=nome&sortOrder=asc',
        )
        .expect(200);

      expect(prismaMock.projeto.findMany).toHaveBeenCalledWith({
        where: { provinciaId: 1 },
        include: { provincia: true, contratos: true },
        orderBy: { id: 'asc' },
      });

      const body = response.body as {
        success: boolean;
        data: {
          kpis: { totalEmCurso: number };
          lista: {
            items: Array<{ statusSemaforo: string }>;
            meta: Record<string, number>;
          };
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.kpis.totalEmCurso).toBe(1);
      expect(body.data.lista.items).toHaveLength(1);
      expect(body.data.lista.items[0].statusSemaforo).toBe('amarelo');
      expect(body.data.lista.items[0]).toEqual(
        expect.objectContaining({
          riscoCurto: 'Observado atraso na entrega de cabos.',
          riscoCompleto: 'Observado atraso na entrega de cabos.',
          motivosSemaforo: expect.arrayContaining(['risco_em_monitorizacao']),
        }),
      );
      expect(body.data.lista.meta).toEqual(
        expect.objectContaining({
          total: 1,
          page: 1,
          pageSize: 5,
          totalPages: 1,
        }),
      );
    });

    it('/dashboard/overview (GET) calcula KPIs e semáforos definitivos', async () => {
      const now = new Date('2024-03-31T00:00:00.000Z');
      (prismaMock.projeto.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 1,
          nome: 'Divinhe - FV',
          provinciaId: 1,
          provincia: { id: 1, nome: 'Maputo' },
          tipoProjeto: 'FV',
          estado: 'EmCurso',
          latitude: -26.4621,
          longitude: 32.1723,
          valorGlobalMT: 120_000_000,
          chaveNaMao: true,
          createdAt: new Date('2024-02-01T00:00:00.000Z'),
          updatedAt: new Date('2024-03-29T00:00:00.000Z'),
          contratos: [
            {
              id: 10,
              valorContratoMT: 45_000_000,
              dataPrevistaFim: new Date('2024-12-31T00:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        {
          id: 2,
          nome: 'Tomé - FV + Rede',
          provinciaId: 2,
          provincia: { id: 2, nome: 'Sofala' },
          tipoProjeto: 'FV',
          estado: 'Parado',
          latitude: -19.8012,
          longitude: 34.8385,
          valorGlobalMT: 132_000_000,
          chaveNaMao: false,
          createdAt: new Date('2023-10-01T00:00:00.000Z'),
          updatedAt: new Date('2024-04-01T00:00:00.000Z'),
          contratos: [
            {
              id: 20,
              valorContratoMT: 28_000_000,
              dataPrevistaFim: new Date('2024-09-30T00:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ]);

      const relatorioFindManyMock = prismaMock.relatorioQuinzenal
        .findMany as jest.Mock;
      relatorioFindManyMock
        .mockResolvedValueOnce([
          {
            id: 201,
            projetoId: 1,
            contratoId: null,
            dataRef: new Date('2024-03-28T00:00:00.000Z'),
            execFisicaPct: '50.00',
            execFinanceiraPct: '52.00',
            prazo: 'NO_PRAZO',
            risco: '',
            mitigacao: null,
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 202,
            projetoId: 2,
            contratoId: null,
            dataRef: new Date('2024-04-01T00:00:00.000Z'),
            execFisicaPct: '65.00',
            execFinanceiraPct: '80.00',
            prazo: 'ATRASADO',
            risco: 'Bloqueio logístico em porto.',
            mitigacao: 'Reforço de equipas de descarga.',
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 301,
            projetoId: 1,
            contratoId: 10,
            dataRef: new Date('2024-03-20T00:00:00.000Z'),
            execFisicaPct: '48.00',
            execFinanceiraPct: '50.00',
            prazo: 'NO_PRAZO',
            risco: '',
            mitigacao: null,
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 302,
            projetoId: 2,
            contratoId: 20,
            dataRef: new Date('2024-03-25T00:00:00.000Z'),
            execFisicaPct: '60.00',
            execFinanceiraPct: '75.00',
            prazo: 'ATRASADO',
            risco: 'Falha crítica nos transformadores.',
            mitigacao: 'Fornecedor mobilizado.',
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/dashboard/overview')
        .expect(200);

      const body = response.body as {
        success: boolean;
        data: {
          kpis: {
            totalEmCurso: number;
            totalParado: number;
            valorTotalInvestimentoMT: number;
            mediaExecucaoFisica: number | null;
            riscosAtivos: number;
          };
          lista: {
            items: Array<{
              id: number;
              statusSemaforo: string;
              motivosSemaforo: string[];
            }>;
            meta: { total: number };
          };
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.kpis.totalEmCurso).toBe(1);
      expect(body.data.kpis.totalParado).toBe(1);
      expect(body.data.kpis.valorTotalInvestimentoMT).toBe(252_000_000);
      expect(body.data.kpis.mediaExecucaoFisica).toBe(57.5);
      expect(body.data.kpis.riscosAtivos).toBe(1);
      expect(body.data.lista.meta.total).toBe(2);
      expect(body.data.lista.items[0].statusSemaforo).toBe('vermelho');
      expect(body.data.lista.items[0].motivosSemaforo).toEqual(
        expect.arrayContaining([
          'prazo_atrasado_projeto',
          'risco_critico_texto',
        ]),
      );
    });

    it('/dashboard/overview/export (GET) gera ficheiro Excel', async () => {
      const now = new Date('2024-03-20T00:00:00.000Z');
      (prismaMock.projeto.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 1,
          nome: 'Divinhe - FV',
          provinciaId: 1,
          provincia: { id: 1, nome: 'Maputo' },
          tipoProjeto: 'FV',
          estado: 'EmCurso',
          latitude: -26.4621,
          longitude: 32.1723,
          valorGlobalMT: 120_000_000,
          chaveNaMao: true,
          createdAt: now,
          updatedAt: now,
          contratos: [
            {
              id: 10,
              valorContratoMT: 45_000_000,
              dataPrevistaFim: new Date('2024-12-31T00:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ]);

      const relatorioFindManyMock = prismaMock.relatorioQuinzenal
        .findMany as jest.Mock;
      relatorioFindManyMock
        .mockResolvedValueOnce([
          {
            id: 401,
            projetoId: 1,
            contratoId: null,
            dataRef: new Date('2024-03-18T00:00:00.000Z'),
            execFisicaPct: '55.00',
            execFinanceiraPct: '57.00',
            prazo: 'NO_PRAZO',
            risco: '',
            mitigacao: '',
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .mockResolvedValueOnce([]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/dashboard/overview/export?format=xlsx')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.subarray(0, 2).toString('ascii')).toBe('PK');
    });

    it('/dashboard/overview/export (GET) gera ficheiro PDF', async () => {
      const now = new Date('2024-03-22T00:00:00.000Z');
      (prismaMock.projeto.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 2,
          nome: 'Tomé - FV + Rede',
          provinciaId: 2,
          provincia: { id: 2, nome: 'Sofala' },
          tipoProjeto: 'FV',
          estado: 'Parado',
          latitude: -19.8012,
          longitude: 34.8385,
          valorGlobalMT: 132_000_000,
          chaveNaMao: false,
          createdAt: now,
          updatedAt: now,
          contratos: [
            {
              id: 20,
              valorContratoMT: 28_000_000,
              dataPrevistaFim: new Date('2024-09-30T00:00:00.000Z'),
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
      ]);

      const relatorioFindManyMock = prismaMock.relatorioQuinzenal
        .findMany as jest.Mock;
      relatorioFindManyMock
        .mockResolvedValueOnce([
          {
            id: 501,
            projetoId: 2,
            contratoId: null,
            dataRef: new Date('2024-03-21T00:00:00.000Z'),
            execFisicaPct: '70.00',
            execFinanceiraPct: '72.00',
            prazo: 'NO_PRAZO',
            risco: '',
            mitigacao: '',
            autorUserId: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .mockResolvedValueOnce([]);

      const server = app.getHttpServer() as Parameters<typeof request>[0];
      const response: Response = await request(server)
        .get('/dashboard/overview/export?format=pdf')
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.subarray(0, 4).toString('ascii')).toBe('%PDF');
    });
  });
});
