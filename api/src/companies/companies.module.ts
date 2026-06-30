import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { OnboardingController } from './onboarding.controller';

@Module({
  imports: [AuthModule],
  controllers: [CompaniesController, OnboardingController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
