"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
const decoder = new TextDecoder("utf8");
const SERIAL_RES_SIZE = 1024 * 1024 * 10;
const decodeBuffer = new Uint8Array(SERIAL_RES_SIZE);
const slice = decodeBuffer.slice.call.bind(decodeBuffer.slice);
let lengthBuffer, lengthTyped, valueBuffer, valueTyped, js;
let gotBuffersPromise = new Promise((res) => {
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
const start = async () => {
    //   const evalQueue = (globalThis as any).evalQueue = [] as any[];
    Object.defineProperty(globalThis, "ipc", {
        value: Object.freeze({
            send: (msg) => {
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
                    ev(reply.js);
                }
                return reply;
            },
            sendAsync: (msg) => {
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
                        ev(reply.js);
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
    }
    catch (e) {
        console.error(e);
    }
};
exports.start = start;
