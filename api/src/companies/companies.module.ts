import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { OnboardingController } from './onboarding.controller';
import { CompanyModuleGuard } from './company-module.guard';

@Module({
  imports: [AuthModule],
  controllers: [CompaniesController, OnboardingController],
  providers: [CompaniesService, CompanyModuleGuard],
  exports: [CompaniesService, CompanyModuleGuard],
})
export class CompaniesModule {}
