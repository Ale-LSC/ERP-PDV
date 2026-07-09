import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';

@Module({
  imports: [AuthModule, BranchesModule, CompaniesModule],
  controllers: [ProductionController],
  providers: [ProductionService],
})
export class ProductionModule {}
