import { BadRequestException } from '@nestjs/common';

export function resolveReportPeriod(from?: string, to?: string) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const start = from ? new Date(`${from}T00:00:00`) : defaultFrom;
  const end = to ? new Date(`${to}T23:59:59.999`) : now;

  if (start > end) {
    throw new BadRequestException('A data inicial deve ser anterior à final');
  }

  return { start, end };
}
