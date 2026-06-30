import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [AuthModule, CompaniesModule, BranchesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
