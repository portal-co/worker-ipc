export declare const run: (backendName: string, worldJS: string, size: number) => Promise<Backend>;
export interface Backend {
    handlers: {
        [a: string]: (v: any) => void;
    };
    name: string;
    worker: Worker;
    send(val: any): any;
    readonly queuePromiseRes: null | (() => void);
    pushJS(...args: string[]): any;
}
