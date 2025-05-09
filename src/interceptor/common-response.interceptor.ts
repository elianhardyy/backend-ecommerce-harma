import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonResponse } from 'src/api/response/common.response';
import { PagingResponse } from 'src/api/response/paging.response';

@Injectable()
export class CommonResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        if (data instanceof CommonResponse) {
          return data;
        }

        let result: any;
        let paging: PagingResponse = null;

        if (data && typeof data === 'object') {
          if (data.paging) {
            paging = data.paging;
            result = data.data || data;
          } else {
            result = data;
          }
        } else {
          result = data;
        }
        return new CommonResponse(statusCode, 'Success', result, paging);
      }),
    );
  }
}
