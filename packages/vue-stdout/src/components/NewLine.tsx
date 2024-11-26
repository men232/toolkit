import type { FunctionalComponent } from 'vue';

export interface NewLineProps {
  count?: number;
}

export const NewLine: FunctionalComponent<NewLineProps> = ({ count = 1 }) => {
  return <stdout-text>{'\n'.repeat(count)}</stdout-text>;
};

NewLine.displayName = 'NewLine';
