import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { BranchesModule } from '../branches/branches.module';
@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
