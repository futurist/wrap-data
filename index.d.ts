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

type Path = string | string[];

interface wrappedData extends Stream<any> {
    get(path: Path): wrappedData | void;
    set(value: any): wrappedData;
    set(path: Path, value: any, descriptor?: object): wrappedData;
    getset(valueFn: (any)=>any): wrappedData;
    getset(path: Path, valueFn: (any)=>any, descriptor?: object): wrappedData;
    ensure(path: Path, value: any, descriptor?: object): wrappedData;
    unset(path: Path): any;
    unwrap(config?: unwrapConfig): any;
    unwrap(path: Path, config?: unwrapConfig): any;
}

declare namespace wrapData {
    const f: wrapFactory;
    export = f;
}

declare module 'wrap-data' {
    const f: wrapFactory;
    export = f;
}
