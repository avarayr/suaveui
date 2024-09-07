import EventEmitter from "events";

/**
 * StreamBuffer is a readable stream that buffers incoming data and emits it as events.
 * The buffer is important because multiple clients can request the same stream,
 * and we need to ensure all clients receive the same data from start to finish.
 */
export class StreamBuffer extends EventEmitter {
  private buffer: string[] = [];
  private finished = false;
  private aborted = false;

  constructor(private readonly messageId: string) {
    super();
  }

  isAborted() {
    return this.aborted;
  }

  isFinished() {
    return this.finished || this.aborted;
  }

  abort() {
    this.aborted = true;
    this.emit("abort");
  }

  getResult() {
    return this.buffer.join("");
  }

  append(text: string) {
    if (!this.aborted) {
      this.buffer.push(text);
      this.emit("data", text);
    }
  }

  finish() {
    if (!this.aborted) {
      this.finished = true;
      this.emit("end");
    }
  }

  async *iterator() {
    let i = 0;
    while (!this.aborted) {
      if (i < this.buffer.length) {
        // if new data is available, yield it and increment the index
        yield this.buffer[i++];
        continue;
      } else if (this.finished) {
        break;
      }

      // wait for new data to be available
      const waitForData = async () => {
        await new Promise<void>((resolve) => {
          const onEvent = () => {
            this.off("data", onEvent);
            this.off("end", onEvent);
            this.off("abort", onEvent);
            resolve();
          };

          this.once("data", onEvent);
          this.once("end", onEvent);
          this.once("abort", onEvent);
        });
      };

      await waitForData();
    }
  }
}
