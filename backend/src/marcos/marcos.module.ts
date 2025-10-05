import { Module } from '@nestjs/common';
import { MarcosService } from './marcos.service';
import { MarcosController } from './marcos.controller';

@Module({
  controllers: [MarcosController],
  providers: [MarcosService],
})
export class MarcosModule {}
