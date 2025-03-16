export interface TokenTypeOptions {
  keyword?: string;
}

/**
 * @group Utils
 */
export class TokenType {
  readonly label: string;
  readonly keyword: string | undefined;

  constructor(label: string, options?: TokenTypeOptions) {
    this.label = label;
    this.keyword = options?.keyword;
  }
}
