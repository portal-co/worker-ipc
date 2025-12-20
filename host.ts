export const run = (backendName: string, worldJS: string, size: number) =>
  new Promise<Backend>(async (resolve) => {
    if (backendName === null) return resolve(null);

    //   if (window.crossOriginIsolated === false) {
    //     console.warn('not cross-origin isolated, giving up running JS');
    //     // alert(`due to browser restrictions, shadow has to use a service worker and reload once to be able to use some JS features which it requires for running JS (SharedArrayBuffer). try reloading`);
    //     return resolve(null);
    //   }

    //   let backend = instances[doc.ptr];

    //   if (!backend || backend.name !== backendName) {
    // console.log('new JS backend', doc.ptr, backendName, Object.keys(instances).length);
    // if (backend) {
    //   backend.worker.onmessage = () => {};
    //   backend.worker.terminate();
    // }

    const replyHandlers = { __proto__: null } as { [key: string]: (msg: any) => void };
    const backend: any = {
      name: backendName,
      //   queue: [],
      handlers: {},
    };

    const queue = [];

    // instances[doc.ptr] = backend;

    backend.worker = new Worker(backendName, { type: "module" });

    const lengthBuffer = new SharedArrayBuffer(4);
    const lengthTyped = new Int32Array(lengthBuffer);
    lengthTyped[0] = 0;

    const valueBuffer = new SharedArrayBuffer(size);
    const valueTyped = new Uint8Array(valueBuffer);

    const encoder = new TextEncoder();

    backend.worker.postMessage({ lengthBuffer, valueBuffer, js: worldJS });

    backend.worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      // if (msg.type !== 'wait') console.log('main recv', msg);
      if (replyHandlers[msg.type]) {
        replyHandlers[msg.type](msg);
        delete replyHandlers[msg.type];
      } else if (backend.handlers[msg.type]) {
        backend.handlers[msg.type](msg);
      } else backend.send({});
    };
    backend.sendCore = (msg: any) => {       // if (msg.type) console.log('main send', msg);

      // const encodeBuffer = new Uint8Array(SERIAL_RES_SIZE);

      const json = JSON.stringify(msg);
      // encoder.encodeInto(json, encodeBuffer);

      const encodeBuffer = encoder.encode(json);

      for (let i = 0; i < encodeBuffer.length; i++) {
        Atomics.store(valueTyped, i, encodeBuffer[i]);
      }

      Atomics.store(lengthTyped, 0, encodeBuffer.length);
      Atomics.notify(lengthTyped, 0);
    };
    backend.send = async (msg: any) => {
      const id = Math.random().toString(36).substring(2, 15);
      if (typeof msg === 'object') msg = { ...msg, id };
      backend.sendCore(msg);
      return await new Promise(res => {
        replyHandlers[id] = res;
      });
    };

    backend.on = (type: string, handler: any) =>
      (backend.handlers[type] = handler);

    let queuePromiseRes = null;
    Object.defineProperty(backend, "queuePromiseRes", {
      get: () => queuePromiseRes,
    });
    Object.defineProperty(backend, "pushJS", {
      value: (...args: string[]) => {
        for (const arg of args) queue.push(arg);
      },
    });
    backend.on("wait", async () => {
      if (queue.length === 0)
        await new Promise((res) => (queuePromiseRes = res));
      queuePromiseRes = null;

      backend.send({ type: "eval", js: queue.pop() });
    });
    Object.freeze(backend);
    resolve(backend);
  });
export interface Backend {
  handlers: { [a: string]: (v: any) => void };
  name: string;
  worker: Worker;
  sendCore(val: any);
  send(val: any): Promise<MessageEvent>;
  readonly queuePromiseRes: null | (() => void);
  pushJS(...args: string[]);
}
