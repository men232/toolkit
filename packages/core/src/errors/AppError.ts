import { isNumber } from '../is.js';

const CODE_TO_MESSAGE: Record<number, string> = Object.freeze({
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',

  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',

  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',

  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  422: 'Unprocessable Entity',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',

  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
});

export interface AppErrorOptions extends ErrorOptions {
  /**
   * Custom error code
   */
  code?: string;
}

/**
 * Simple application error class with the code
 * @group Errors
 */
export class AppError extends Error {
  /**
   * HTTP valid status code
   */
  statusCode: number;

  /**
   * Custom error code
   */
  code?: string;

  constructor(message: string, statusCode?: number, options?: AppErrorOptions);

  /**
   * Message will be generated from status code
   */
  constructor(statusCode: number, options?: AppErrorOptions);

  constructor(...args: any[]) {
    let message = 'Unknown error';
    let statusCode = 500;
    let code = 'ERR_UNKNOWN';
    let options: AppErrorOptions | undefined;

    if (isNumber(args[0])) {
      statusCode = args[0];
      message = CODE_TO_MESSAGE[statusCode] || message;
      options = args[1];
    } else {
      message = args[0] || CODE_TO_MESSAGE[statusCode] || message;
      statusCode = isNumber(args[1]) ? args[1] : statusCode;
      options = args[2];
    }

    // Call base class constructor
    super(message, options);

    if (typeof Error.captureStackTrace !== 'function') {
      this.stack = new Error().stack;
    } else {
      Error.captureStackTrace(this, AppError);
    }

    this.statusCode = statusCode;
    this.code = options?.code ?? code;
  }

  get name() {
    return 'AppError';
  }

  static is(value: any): value is AppError {
    return value instanceof AppError || value?.name === 'AppError';
  }
}
