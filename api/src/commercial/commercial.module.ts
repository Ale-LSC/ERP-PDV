import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { CommercialController } from './commercial.controller';
import { CommercialService } from './commercial.service';

@Module({
  imports: [AuthModule, BranchesModule, CompaniesModule],
  controllers: [CommercialController],
  providers: [CommercialService],
})
export class CommercialModule {}
