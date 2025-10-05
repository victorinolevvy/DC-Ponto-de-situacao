import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ApiResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse | StreamableFile> {
    return next.handle().pipe(
      map((data: unknown): ApiResponse | StreamableFile => {
        if (data instanceof StreamableFile) {
          return data;
        }

        if (typeof data === 'object' && data !== null && 'success' in data) {
          return data as ApiResponse;
        }

        return {
          success: true,
          data,
        };
      }),
    );
  }
}
