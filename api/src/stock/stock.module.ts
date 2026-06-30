import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [StockController],
  providers: [StockService],
})
export class StockModule {}
