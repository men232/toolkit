import type { NODE } from './constants';

/**
 * @group Types
 */
export interface Node {
  /**
   * Start positions of the node in the source code.
   */
  start: number;

  /**
   * End positions of the node in the source code.
   */
  end: number;

  /**
   * Type of the node.
   */
  type: string;
}

/**
 * @group Types
 */
export type NodeMap = {
  [NODE.PROGRAM]: NodeProgram;
  [NODE.LITERAL]: NodeLiteral;
  [NODE.BINARY_EXPRESSION]: NodeBinaryExpression;
  [NODE.LOGICAL_EXPRESSION]: NodeLogicalExpression;
  [NODE.IDENTIFIER]: NodeIdentifier;
};

/**
 * The node type.
 * @group Types
 */
export type NodeType = (typeof NODE)[keyof typeof NODE];

/**
 * The node expression.
 * @group Types
 */
export type NodeExpression = NodeBinaryExpression | NodeLogicalExpression;

/**
 * Root node of the AST.
 * @group Types
 */
export interface NodeProgram extends Node {
  type: typeof NODE.PROGRAM;
  body: NodeExpression[];
}

/**
 * Literal node of the AST.
 * @group Types
 */
export interface NodeLiteral extends Node {
  type: typeof NODE.LITERAL;

  /**
   * Value of the literal.
   */
  value: string | boolean | null | number;

  /**
   * Raw value of the literal.
   */
  raw?: string;
}

/**
 * Identifier node of the AST.
 * @group Types
 */
export interface NodeIdentifier extends Node {
  type: typeof NODE.IDENTIFIER;

  /**
   * Name of the identifier.
   */
  name: string;
}

/**
 * Binary expression node of the AST.
 * @group Types
 */
export interface NodeBinaryExpression extends Node {
  type: typeof NODE.BINARY_EXPRESSION;

  /**
   * Operator of the binary expression.
   */
  operator: BinaryOperator;

  /**
   * Left operand of the binary expression.
   */
  left: NodeIdentifier;

  /**
   * Right operand of the binary expression.
   */
  right: NodeLiteral;
}

/**
 * Binary operator.
 * @group Types
 */
export type BinaryOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';

/**
 * Logical expression node of the AST.
 * @group Types
 */

/**
 * @group Types
 */
export interface NodeLogicalExpression extends Node {
  type: typeof NODE.LOGICAL_EXPRESSION;

  /**
   * Operator of the logical expression.
   */
  operator: LogicalOperator;

  /**
   * Left operand of the logical expression.
   */
  left: NodeExpression;

  /**
   * Right operand of the logical expression.
   */
  right: NodeExpression;
}

/**
 * Logical operator.
 * @group Types
 */
export type LogicalOperator = 'OR' | 'AND';
