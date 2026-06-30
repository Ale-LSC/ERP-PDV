import { Body, Controller, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { OnboardCompanyDto } from './dto/onboard-company.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  onboard(@Body() dto: OnboardCompanyDto) {
    return this.companiesService.onboard(dto);
  }
}
