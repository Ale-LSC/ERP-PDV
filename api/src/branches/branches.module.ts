import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
