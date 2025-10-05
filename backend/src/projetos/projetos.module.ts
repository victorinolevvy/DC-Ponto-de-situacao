import { Module } from '@nestjs/common';
import { ProjetosService } from './projetos.service';
import { ProjetosController } from './projetos.controller';
import { SemaforoService } from './semaforo.service';

@Module({
  controllers: [ProjetosController],
  providers: [ProjetosService, SemaforoService],
  exports: [SemaforoService],
})
export class ProjetosModule {}
