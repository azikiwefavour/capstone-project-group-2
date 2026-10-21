import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Filter or search by keyword (matches actor name, event description, patient name, action type)',
    example: 'Dr. Adewale',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by action type (e.g. All, Prescribed, Clarification, Dispensed, Updated, Invited, Confirmed)',
    example: 'Prescribed',
  })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({
    description: 'Alias for filter',
    example: 'dispensed',
  })
  @IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional({
    description: 'Sort by field/direction: Newest (default), Oldest, Who, Event, Patient',
    example: 'Newest',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'If "true", returns wrapped { data, total, page, limit, totalPages }. Otherwise returns array directly.',
    example: 'false',
  })
  @IsOptional()
  @IsString()
  paginate?: string;
}
