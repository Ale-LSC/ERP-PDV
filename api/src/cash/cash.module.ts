import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { CashController } from './cash.controller';
import { CashService } from './cash.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [CashController],
  providers: [CashService],
})
export class CashModule {}
