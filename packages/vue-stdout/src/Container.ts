import ansiEscapes from 'ansi-escapes';
import { writeCleaner } from './stdout';
import { Render } from './tree';
import { DOMDocument } from './tree/DOMTree/DOMDocument';
import type { RenderFlow } from './tree/RenderTree/RenderFlow';

export interface ContainerOptions {
  stdout: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  stderr: NodeJS.WriteStream;
  debug: boolean;
  exitOnCtrlC: boolean;
}

export class Container extends DOMDocument {
  tagName = '#container';

  stdout: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  stderr: NodeJS.WriteStream;
  exitOnCtrlC: boolean;
  flow: RenderFlow;
  write: (...args: any[]) => void;

  constructor({ debug, exitOnCtrlC, stderr, stdin, stdout }: ContainerOptions) {
    super();
    this.write = writeCleaner(stdout, 0);
    this.stdout = stdout;
    this.stdin = stdin;
    this.stderr = stderr;
    this.exitOnCtrlC = exitOnCtrlC;
    this.flow = new Render.Flow({
      document: this,
      height: 0,
      width: 0,
    });

    this.stdout.on('resize', this.onResize.bind(this));
    this.flow.on('frame', this.onFrame.bind(this));
    this.onResize();
  }

  onResize(): void {
    this.stdout.write(ansiEscapes.clearTerminal);
    this.flow.width = this.stdout.columns || 80;
    this.flow.height = this.stdout.rows || 20;
    this.flow.reflowSchedule();
  }

  onFrame() {
    if (this.flow.reflowScheduled) return;
    this.write(this.flow.layer.frame);

    // this.stdout.cursorTo(0, this.flow.height + 1);
    // console.log(this.treeText);
    // console.log('\n');
    // console.log(this.flow.treeText);
  }
}

export function createContainer(
  options?: Partial<ContainerOptions>,
): Container {
  const instance = new Container({
    debug: false,
    exitOnCtrlC: true,
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    ...(options ?? {}),
  });

  return instance;
}
