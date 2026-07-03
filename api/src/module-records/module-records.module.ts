import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { ModuleRecordsController } from './module-records.controller';
import { ModuleRecordsService } from './module-records.service';

@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [ModuleRecordsController],
  providers: [ModuleRecordsService],
})
export class ModuleRecordsModule {}
