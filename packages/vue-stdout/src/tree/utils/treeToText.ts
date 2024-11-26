import type { NodeTree } from '../NodeTree';

export const treeToText = (
  root: NodeTree<NodeTree<any>>,
  tab: string = '',
): string => {
  let str = root.getDisplayName();
  let last = root.childNodes.length - 1;
  for (; last >= 0; last--) if (root.childNodes[last]) break;
  for (let i = 0; i <= last; i++) {
    const childNode = root.childNodes[i];
    if (!childNode) continue;
    const isLast = i === last;
    const child = treeToText(childNode, tab + (isLast ? ' ' : '│') + '  ');
    const branch = child ? (isLast ? '└─' : '├─') : '│';
    str += '\n' + tab + branch + (child ? ' ' + child : '');
  }
  return str;
};
