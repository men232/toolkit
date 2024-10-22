import { isNumber } from '../is.js';

const CODE_TO_MESSAGE: Record<number, string> = Object.freeze({
  101: 'Switching Protocols',
  102: 'Processing',
  200: 'Ok',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Already Exists',
  500: 'Internal Server Error',
});

export class AppError extends Error {
  code: number;
  constructor(
    messageOrCode: string | number,
    code: number = 500,
    options?: ErrorOptions,
  ) {
    let message = 'Unknown error';

    if (isNumber(messageOrCode)) {
      code = messageOrCode;
      message = CODE_TO_MESSAGE[code] || 'Unknown error';
    } else {
      message = messageOrCode || CODE_TO_MESSAGE[code] || 'Unknown error';
    }

    // Call base class constructor
    super(message, options);

    if (typeof Error.captureStackTrace !== 'function') {
      this.stack = new Error().stack;
    } else {
      Error.captureStackTrace(this, AppError);
    }

    this.code = code;
  }

  /**
   * alias for `code` property
   */
  get statusCode() {
    return this.code;
  }

  get name() {
    return 'AppError';
  }

  static is(value: any): value is AppError {
    return value instanceof AppError || value?.name === 'AppError';
  }
}
