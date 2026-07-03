import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { concatMap } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { db } from '../database/drizzle';
import { auditLogs } from '../database/schema/audit.schema';

type AuditedRequest = AuthenticatedRequest & {
  method: string;
  originalUrl: string;
  params: Record<string, string>;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();
    if (
      !['POST', 'PATCH', 'DELETE'].includes(request.method) ||
      !request.user?.sub ||
      !request.params?.companyId
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      concatMap(async (value: unknown) => {
        try {
          await db.insert(auditLogs).values({
            companyId: request.params.companyId,
            userId: request.user.sub,
            action: request.method,
            resource: request.originalUrl.split('?')[0],
            context: { params: request.params },
          });
        } catch (error) {
          console.error('Falha ao registrar auditoria', error);
        }
        return value;
      }),
    );
  }
}
