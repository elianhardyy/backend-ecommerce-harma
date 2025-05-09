import { ApiProperty } from '@nestjs/swagger';

export class PagingResponse {
  @ApiProperty({ description: 'Total halaman', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Total jumlah elemen', example: 100 })
  totalElements: number;

  @ApiProperty({ description: 'Halaman saat ini', example: 1 })
  page: number;

  @ApiProperty({ description: 'Jumlah elemen per halaman', example: 20 })
  size: number;

  @ApiProperty({
    description: 'Apakah memiliki halaman berikutnya',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Apakah memiliki halaman sebelumnya',
    example: false,
  })
  hasPrevious: boolean;

  constructor(page: number, size: number, totalElements: number) {
    this.page = page;
    this.size = size;
    this.totalElements = totalElements;
    this.totalPages = Math.ceil(totalElements / size);
    this.hasNext = page < this.totalPages;
    this.hasPrevious = page > 1;
  }

  public static of(
    page: number = 1,
    size: number = 10,
    totalElements: number = 0,
  ): PagingResponse {
    return new PagingResponse(page, size, totalElements);
  }
}
