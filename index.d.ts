interface Stream<T> {
    (): T;
    (value: T): Stream<T>;
    map<V>(project: (value: T) => V): Stream<V>;
}

interface CreateStream {
    <T>(): Stream<T>;
    <T>(value: T): Stream<T>;
    (): Stream<void>;
}

interface wrapFactory {
    (stream: CreateStream): dataFactory;
}

interface dataFactory {
    (data: any): wrappedData;
}

interface unwrapConfig {
    json: boolean;
}

interface wrappedData extends Stream<any> {
    root: wrappedData;
    path: string[];
    slice(
        path: string | string[],
        filter?: (value: wrappedData, type: string) => boolean,
        wrapper?: wrappedData
    ): wrappedData | any;
    get(path: string | string[]): wrappedData | any;
    set(value: any): wrappedData;
    set(path: string | string[], value: any, descriptor?: object): wrappedData;
    getset(valueFn: (prevVal:any)=>any): wrappedData;
    getset(path: string | string[], valueFn: (prevVal:any)=>any, descriptor?: object): wrappedData;
    ensure(path: string | string[], value: any, descriptor?: object): wrappedData;
    unset(path: string | string[]): any;
    unwrap(config?: unwrapConfig): any;
    unwrap(path: string | string[], config?: unwrapConfig): any;
}

declare namespace wrapData {
    const f: wrapFactory;
    export = f;
}

declare module 'wrap-data' {
    const f: wrapFactory;
    export = f;
}
