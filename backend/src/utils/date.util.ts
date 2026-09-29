export const parseInputDate = (dateStr: any): Date | undefined => {
  if (!dateStr) return undefined;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const datePart = dateStr.split(' | ')[0];
    const parts = datePart.split('/');
    if (parts.length === 3) {
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
};

export const isFutureDate = (d: Date | undefined): boolean => {
  if (!d || isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  return check > today;
};

export const isBeforeDate = (dateToCheck: Date | undefined, referenceDate: Date | undefined): boolean => {
  if (!dateToCheck || !referenceDate || isNaN(dateToCheck.getTime()) || isNaN(referenceDate.getTime())) return false;
  const d1 = new Date(dateToCheck);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(referenceDate);
  d2.setHours(0, 0, 0, 0);
  return d1 < d2;
};
