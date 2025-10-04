import { PartialType } from '@nestjs/swagger';
import { CreatePostoDto } from './create-posto.dto';

export class UpdatePostoDto extends PartialType(CreatePostoDto) {}
