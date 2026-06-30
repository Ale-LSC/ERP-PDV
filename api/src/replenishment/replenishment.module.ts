import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { ReplenishmentController } from './replenishment.controller';
import { ReplenishmentService } from './replenishment.service';
@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [ReplenishmentController],
  providers: [ReplenishmentService],
})
export class ReplenishmentModule {}
