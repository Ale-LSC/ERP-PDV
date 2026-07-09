import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { PaymentIntegrationStatus } from '../../database/schema/payments.schema';

const paymentStatuses = [
  'manual',
  'pending',
  'authorized',
  'captured',
  'failed',
  'cancelled',
  'refunded',
] as const satisfies readonly PaymentIntegrationStatus[];

export class UpdatePaymentTransactionDto {
  @IsIn(paymentStatuses)
  status: PaymentIntegrationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  externalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nsu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;
}
