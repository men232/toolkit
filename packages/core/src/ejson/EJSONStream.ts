import type { EJSON } from './EJSON';

export interface EJSONStreamOptions {
  /**
   * EJSON Instance
   */
  ejson: EJSON;

  /**
   * Starting encoding symbol
   */
  op: string;

  /**
   * Separator symbol
   */
  sep: string;

  /**
   * Ending symbol
   */
  cl: string;

  /** @internal */
  onStart?: (controller: TransformStreamDefaultController) => Promise<void>;

  /** @internal */
  onFlush?: (controller: TransformStreamDefaultController) => Promise<void>;
}

export class EJSONStream extends TransformStream<any, string> {
  protected ejson: EJSON;

  constructor({ ejson, cl, op, sep, onFlush, onStart }: EJSONStreamOptions) {
    let firstChunk = true;

    super({
      start(controller) {
        return Promise.resolve()
          .then(() => {
            if (onStart) {
              return onStart(controller);
            }
          })
          .then(() => {
            controller.enqueue(op);
          });
      },
      transform(chunk, controller) {
        const jsonString = ejson.stringify(chunk);

        if (firstChunk) {
          firstChunk = false;
        } else {
          controller.enqueue(sep);
        }

        controller.enqueue(jsonString);
      },
      flush(controller) {
        controller.enqueue(cl);

        if (onFlush) {
          return onFlush(controller);
        }
      },
    });

    this.ejson = ejson;
  }

  /**
   * The vendor name used for the custom MIME type definition.
   * If null, defaults to 'application/json'.
   */
  get vendorName(): string | null {
    return this.ejson.vendorName;
  }

  /**
   * MIME type based on the provided vendor name or defaults to 'application/json'.
   */
  get mimetype(): string {
    return this.ejson.mimetype;
  }
}
