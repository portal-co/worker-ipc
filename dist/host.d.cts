export declare const run: (backendName: string, worldJS: string, size: number) => Promise<Backend>;
export interface Backend {
    handlers: {
        [a: string]: (v: any) => void;
    };
    name: string;
    worker: Worker;
    sendCore(val: any): any;
    send(val: any): Promise<MessageEvent>;
    readonly queuePromiseRes: null | (() => void);
    pushJS(...args: string[]): any;
}
