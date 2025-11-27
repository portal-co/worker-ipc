export declare const run: (backendName: string, worldJS: string, size: number) => Promise<Backend>;
export interface Backend {
    handlers: {
        [a: string]: (v: any) => Promise<any> | any;
    };
    name: string;
    worker: Worker;
}
