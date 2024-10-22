import { capitalize } from '../capitalize';
import { getWords } from '../getWords';

export const startCase = (value?: string): string => {
  return getWords(value).map(capitalize).join(' ');
};
