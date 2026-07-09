import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { CompaniesModule } from './companies/companies.module';
import { ProductsModule } from './products/products.module';
import { StockModule } from './stock/stock.module';
import { CashModule } from './cash/cash.module';
import { SalesModule } from './sales/sales.module';
import { CustomersModule } from './customers/customers.module';
import { ReportsModule } from './reports/reports.module';
import { FinanceModule } from './finance/finance.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ReplenishmentModule } from './replenishment/replenishment.module';
import { BranchesModule } from './branches/branches.module';
import { ModuleRecordsModule } from './module-records/module-records.module';
import { CommercialModule } from './commercial/commercial.module';
import { ProductionModule } from './production/production.module';
import { ServicesModule } from './services/services.module';
import { AuditModule } from './audit/audit.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.local', '.env'],
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    CompaniesModule,
    ProductsModule,
    StockModule,
    CashModule,
    SalesModule,
    CustomersModule,
    ReportsModule,
    FinanceModule,
    SuppliersModule,
    PurchasesModule,
    ReplenishmentModule,
    BranchesModule,
    ModuleRecordsModule,
    CommercialModule,
    ProductionModule,
    ServicesModule,
    PaymentsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
