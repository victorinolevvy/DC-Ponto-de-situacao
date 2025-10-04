import { Module } from '@nestjs/common';
import { LocalizacaoService } from './localizacao.service';
import { ProvinciasController } from './provincias.controller';
import { DistritosController } from './distritos.controller';
import { PostosController } from './postos.controller';

@Module({
  controllers: [ProvinciasController, DistritosController, PostosController],
  providers: [LocalizacaoService],
})
export class LocalizacaoModule {}
