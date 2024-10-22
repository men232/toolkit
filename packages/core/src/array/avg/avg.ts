import { sum } from '../sum';

export const avg = (values: number[]) => {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
};
