import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LocalizacaoModule } from './localizacao/localizacao.module';
import { ProjetosModule } from './projetos/projetos.module';
import { ContratosModule } from './contratos/contratos.module';
import { MarcosModule } from './marcos/marcos.module';
import { RolesGuard } from './common/guards/roles.guard';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = configService.get<number>('THROTTLE_TTL_MS') ?? 60_000;
        const limit = configService.get<number>('THROTTLE_LIMIT') ?? 100;
        return [
          {
            ttl,
            limit,
          },
        ];
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production' ||
          process.env.NODE_ENV === 'test'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              },
      },
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    LocalizacaoModule,
    ProjetosModule,
    ContratosModule,
    MarcosModule,
    RelatoriosModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
