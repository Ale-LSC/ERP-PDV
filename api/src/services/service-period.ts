export function validatePeriod(start: Date, end: Date) {
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  )
    throw new Error('Período inválido');
}

export function periodsOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}
