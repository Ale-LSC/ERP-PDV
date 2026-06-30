import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [SuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}
