import { BadRequestException } from '@nestjs/common';
import { resolveReportPeriod } from './report-period';

describe('resolveReportPeriod', () => {
  it('covers the full selected days', () => {
    const result = resolveReportPeriod('2026-06-01', '2026-06-30');
    expect(result.start.getHours()).toBe(0);
    expect(result.end.getHours()).toBe(23);
    expect(result.end.getDate()).toBe(30);
  });

  it('rejects an inverted period', () => {
    expect(() => resolveReportPeriod('2026-06-30', '2026-06-01')).toThrow(
      BadRequestException,
    );
  });
});
