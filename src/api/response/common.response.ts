import { ApiProperty } from '@nestjs/swagger';
import { PagingResponse } from './paging.response';

export class CommonResponse<T = any> {
  @ApiProperty({ description: 'HTTP status code', example: 200 })
  statusCode: number;

  @ApiProperty({ description: 'Response message', example: 'Success' })
  message: string;

  @ApiProperty({ description: 'Response data', nullable: true })
  data: T;

  @ApiProperty({
    description: 'Pagination information',
    nullable: true,
    type: () => PagingResponse,
  })
  paging?: PagingResponse;

  constructor(
    statusCode: number,
    message: string,
    data?: T,
    paging?: PagingResponse,
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.paging = paging;
  }

  public static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200,
    paging?: PagingResponse,
  ): CommonResponse<T> {
    return new CommonResponse(statusCode, message, data, paging);
  }

  public static error(
    message: string,
    statusCode = 400,
    data?: any,
  ): CommonResponse {
    return new CommonResponse(statusCode, message, data);
  }
}
