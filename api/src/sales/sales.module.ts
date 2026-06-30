import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
