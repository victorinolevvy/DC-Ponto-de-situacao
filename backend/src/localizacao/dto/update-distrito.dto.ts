import { PartialType } from '@nestjs/swagger';
import { CreateDistritoDto } from './create-distrito.dto';

export class UpdateDistritoDto extends PartialType(CreateDistritoDto) {}
