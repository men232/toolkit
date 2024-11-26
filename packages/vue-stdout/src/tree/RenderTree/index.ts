import { RenderBlock } from './RenderBlock';
import { RenderFlow } from './RenderFlow';
import { RenderInline } from './RenderInline';
import { RenderNodeType } from './RenderNode';
import { RenderText } from './RenderText';

export const Render = Object.freeze({
  Flow: RenderFlow,
  Block: RenderBlock,
  Inline: RenderInline,
  RenderText: RenderText,
  Type: RenderNodeType,
} as const);
