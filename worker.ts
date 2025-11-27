const decoder = new TextDecoder("utf8");

const SERIAL_RES_SIZE = 1024 * 1024 * 10;
const decodeBuffer = new Uint8Array(SERIAL_RES_SIZE);
const slice = decodeBuffer.slice.call.bind(decodeBuffer.slice);
let lengthBuffer: SharedArrayBuffer,
  lengthTyped: Int32Array,
  valueBuffer: SharedArrayBuffer,
  valueTyped: Uint8Array,
  js: string;

let gotBuffersPromise = new Promise<void>((res) => {
  self.addEventListener("message", (e) => {
    // console.log('special worker onmessage', e.data);
    if (!lengthBuffer && e.data.lengthBuffer) {
      lengthBuffer = e.data.lengthBuffer;
      lengthTyped = new Int32Array(lengthBuffer);

      valueBuffer = e.data.valueBuffer;
      valueTyped = new Uint8Array(valueBuffer);

      js = e.data.js;

      res();
    }
  });
});
const decode = decoder.decode.bind(decoder);
const pm = self.postMessage.bind(self);
const ev = globalThis.eval.bind(globalThis);
const parse = JSON.parse.bind(JSON);
const { store, load, wait, waitAsync } = Atomics;
const _Promise = Promise;
export const start = async () => {
  //   const evalQueue = (globalThis as any).evalQueue = [] as any[];
  Object.defineProperty(globalThis, "ipc", {
    value: Object.freeze({
      send: (msg: any) => {
        // console.log('worker send', msg);
        store(lengthTyped, 0, 0);

        // self.postMessage(JSON.parse(JSON.stringify(msg)));
        pm(msg);

        wait(lengthTyped, 0, 0, Infinity); // wait until typed[0] != 0

        const length = load(lengthTyped, 0);

        for (let i = 0; i < length; i++) {
          decodeBuffer[i] = load(valueTyped, i);
        }

        const str = decode(slice(decodeBuffer, 0, length));
        const reply = parse(str);

        if (reply.type === "eval") {
          ev(reply);
        }

        return reply;
      },

      sendAsync: (msg: any) => {
        // console.log('worker send', msg);
        store(lengthTyped, 0, 0);

        // self.postMessage(JSON.parse(JSON.stringify(msg)));
        pm(msg);

        return new _Promise(async (res) => {
          await waitAsync(lengthTyped, 0, 0, Infinity).value; // wait until typed[0] != 0
          const length = load(lengthTyped, 0);

          for (let i = 0; i < length; i++) {
            decodeBuffer[i] = load(valueTyped, i);
          }

          const reply = parse(decode(slice(decodeBuffer, 0, length)));

          if (reply.type === "eval") {
            ev(reply);
          }

          res(reply);
        });
      },
    }),
    enumerable: false,
    configurable: false,
  });

  // console.log('worker eval', js);

  await gotBuffersPromise;

  try {
    ev(js);
  } catch (e) {
    console.error(e);
  }
};
