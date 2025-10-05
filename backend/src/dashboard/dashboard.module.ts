import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ProjetosModule } from '../projetos/projetos.module';

@Module({
  imports: [ProjetosModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
