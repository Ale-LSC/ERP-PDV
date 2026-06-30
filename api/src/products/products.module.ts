import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule, CompaniesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
