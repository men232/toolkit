import { NODE, TOKEN } from './constants';
import { Tokenizer } from './Tokenizer';
import type {
  LogicalOperator,
  Node,
  NodeBinaryExpression,
  NodeExpression,
  NodeIdentifier,
  NodeLiteral,
  NodeLogicalExpression,
  NodeMap,
  NodeProgram,
  NodeType,
} from './types';

/**
 * Parse an expression class.
 *
 * @group Utils
 */
export class Expression extends Tokenizer {
  constructor(input: string) {
    super(input);
  }

  /**
   * Parse input into a program AST.
   */
  parse(): NodeProgram {
    let node = this.startNode(NODE.PROGRAM);
    node.body = [];
    this.nextToken();
    return this.parseTopLevel(node);
  }

  protected finishNode<T extends Node>(node: T): T {
    node.end = this.state.start;
    return node;
  }

  protected parseTopLevel(node: NodeProgram): NodeProgram {
    while (this.state.type !== TOKEN.EOF) {
      let stmt = this.parseExpression();
      node.body.push(stmt);
    }

    this.nextToken();
    return this.finishNode(node);
  }

  protected parseExpression(): NodeExpression {
    let left: NodeExpression | NodeIdentifier;

    if (this.state.type === TOKEN.PAREN_L) {
      this.nextToken();
      left = this.parseExpression();

      if (this.state.type !== TOKEN.PAREN_R) {
        this.raise(this.pos, 'Expected closing paren.');
      }

      this.nextToken();

      if (this.state.type === TOKEN.EOF) {
        return left;
      }
    } else {
      left = this.parseExprAtom() as NodeIdentifier;
    }

    let node: NodeBinaryExpression | NodeLogicalExpression;

    for (;;) {
      node = this.parseExprOp(left);
      node.start = left.start;
      left = node;

      if (this.state.type === TOKEN.EOF || this.state.type === TOKEN.PAREN_R)
        break;
    }

    return node;
  }

  protected parseExprOp(
    left: NodeExpression | NodeIdentifier,
  ): NodeBinaryExpression | NodeLogicalExpression {
    const node = this.startNode(NODE.BINARY_EXPRESSION) as
      | NodeLogicalExpression
      | NodeBinaryExpression;

    node.operator = this.state.value as LogicalOperator;
    node.left = left;

    switch (this.state.type) {
      case TOKEN.LOGICAL_AND:
      case TOKEN.LOGICAL_OR: {
        if (!isNodeExpression(node.left)) {
          this.raise(
            node.left.start,
            'Expected expression as left side of logical expression.',
          );
        }

        this.nextToken();
        node.right = this.maybeLiteral() || this.parseExpression();
        node.type = NODE.LOGICAL_EXPRESSION;

        if (!isNodeExpression(node.right)) {
          this.raise(
            (node.right as Node).start,
            `Unexpected ${(node.right as Node).type} as right side of logical expression.`,
          );
        }

        break;
      }

      case TOKEN.EQUALITY:
      case TOKEN.RELATIONAL: {
        this.nextToken();

        if ((node.left as Node).type !== NODE.IDENTIFIER) {
          this.raise(
            node.start,
            `Expected identifier as left side of binary expression.`,
          );
        }

        node.right = this.parseExprAtom() as NodeLiteral;

        if ((node.right as Node).type !== NODE.LITERAL) {
          this.raise(
            (node.right as Node).start,
            'Expected literal as right side of binary expression.',
          );
        }

        break;
      }

      default: {
        if (this.state.type === TOKEN.EOF) {
          this.raise(
            this.pos,
            `Expected operator after ${this.prev.type.label}`,
          );
        } else {
          this.raise(this.pos, `Unexpected operator: ${this.state.type.label}`);
        }
      }
    }

    return this.finishNode(node);
  }

  protected maybeLiteral(): NodeLiteral | null {
    switch (this.state.type) {
      case TOKEN.MINUS: {
        const start = this.state.start;
        this.nextToken();

        if (this.state.type !== TOKEN.NUM) {
          this.raise(this.pos, `Expected number after minus operator`);
        }

        const node = this.maybeLiteral()!;
        node.start = start;
        node.raw = `-${node.raw}`;
        node.value = (node.value as number) * -1;

        return node;
      }

      case TOKEN.NUM:
      case TOKEN.STRING: {
        let node = this.startNode(NODE.LITERAL);
        node.raw = this.input.slice(this.state.start, this.state.end);
        node.value = this.state.value as any;
        this.nextToken();
        return this.finishNode(node);
      }

      case TOKEN.NULL:
      case TOKEN.TRUE:
      case TOKEN.FALSE: {
        let node = this.startNode(NODE.LITERAL);
        node.raw = this.state.type.keyword;
        node.value =
          this.state.type === TOKEN.NULL
            ? null
            : this.state.type === TOKEN.TRUE;
        this.nextToken();
        return this.finishNode(node);
      }

      default: {
        return null;
      }
    }
  }

  protected maybeIdentifier(): NodeIdentifier | null {
    switch (this.state.type) {
      case TOKEN.NAME: {
        let node = this.startNode(NODE.IDENTIFIER);
        node.name = String(this.state.value);
        this.nextToken();
        return this.finishNode(node);
      }

      default:
        return null;
    }
  }

  protected parseExprAtom(): NodeIdentifier | NodeLiteral {
    const node = this.maybeIdentifier() || this.maybeLiteral();

    if (!node) {
      this.raise(this.pos, `Unexpected token ${this.state.type.label}.`);
    }

    return node;
  }

  protected startNode<T extends NodeType>(type: T): NodeMap[T] {
    const node: Node = { type, start: this.state.start, end: 0 };
    return node as NodeMap[T];
  }
}

function isNodeExpression(node: Node): node is NodeExpression {
  return (
    node.type === NODE.BINARY_EXPRESSION ||
    node.type === NODE.LOGICAL_EXPRESSION
  );
}
