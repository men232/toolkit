import { AppError } from '@/errors';

export function createTimeoutError() {
  return new AppError('The operation was timed out', 408);
}
