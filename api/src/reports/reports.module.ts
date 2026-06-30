import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
