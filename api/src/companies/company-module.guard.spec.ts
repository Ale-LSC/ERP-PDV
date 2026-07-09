import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CompanyModuleGuard } from './company-module.guard';
import { CompaniesService } from './companies.service';

/* eslint-disable @typescript-eslint/unbound-method */

describe('CompanyModuleGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;
  const companiesService = {
    hasEnabledModule: jest.fn(),
  } as unknown as CompaniesService;
  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        params: { companyId: 'company-id' },
        user: { sub: 'user-id' },
      }),
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => jest.clearAllMocks());

  it('allows routes without module metadata', async () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    const guard = new CompanyModuleGuard(reflector, companiesService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(companiesService.hasEnabledModule).not.toHaveBeenCalled();
  });

  it('allows access when the required module is enabled', async () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue('products');
    jest.mocked(companiesService.hasEnabledModule).mockResolvedValue(true);
    const guard = new CompanyModuleGuard(reflector, companiesService);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(companiesService.hasEnabledModule).toHaveBeenCalledWith(
      'company-id',
      'user-id',
      'products',
    );
  });

  it('rejects access when the required module is disabled', async () => {
    jest.mocked(reflector.getAllAndOverride).mockReturnValue('products');
    jest.mocked(companiesService.hasEnabledModule).mockResolvedValue(false);
    const guard = new CompanyModuleGuard(reflector, companiesService);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
