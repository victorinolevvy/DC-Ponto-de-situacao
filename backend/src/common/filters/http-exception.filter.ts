import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      const message =
        typeof errorResponse === 'string'
          ? errorResponse
          : ((errorResponse as Record<string, unknown>).message ??
            exception.message);

      response.status(status).json({
        success: false,
        error: {
          statusCode: status,
          message,
        },
      });
      return;
    }

    this.logger.error('Unhandled exception', exception as Error);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ocorreu um erro inesperado.',
      },
    });
  }
}
