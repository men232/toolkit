import type { FunctionalComponent } from 'vue';
import type { Styles } from '../tree/RenderTree/utils/applyStyles';

export interface BoxProps extends Styles {}

export const Box: FunctionalComponent<BoxProps> = (props, { slots }) => {
  return (
    <box {...props}>
      {{
        default: () => slots.default?.(),
      }}
    </box>
  );
};

Box.displayName = 'Box';
// Box.props = [];
