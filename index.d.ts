declare interface Stream<T> {
    (): T;
    (value: T): Stream<T>;
    map<V>(project: (value: T) => V): Stream<V>;
}

declare interface CreateStream {
    <T>(): Stream<T>;
    <T>(value: T): Stream<T>;
    (): Stream<void>;
}

declare interface WrapFactory {
    (stream: CreateStream): DataFactory;
}

declare interface DataFactory {
    (data: any): IWrappedData;
}

declare interface IUnwrapConfig {
    json: boolean;
}

declare interface IChangeStreamValue {
    value: IWrappedData,
    type: 'change' | 'delete' | 'add',
    path: string[]
}

declare interface IWrappedData extends Stream<any> {
    root: IWrappedData;
    path: string[];
    change: Stream<IChangeStreamValue>;
    slice(
        path: string | string[],
        filter?: (data: IChangeStreamValue) => boolean,
        wrapper?: IWrappedData
    ): IWrappedData | undefined;
    get(path: string | string[], mapFunc?: (val: IWrappedData | undefined) => any): IWrappedData | any;
    set(value: any): IWrappedData;
    set(path: string | string[], value: any, descriptor?: object): IWrappedData;
    getMany(pathMap: object | string[] | string, mapFunc?: (val: IWrappedData | undefined) => any): object | any[] | any;
    setMany(kvMap: object, descriptors?: object): void;
    getset(valueFn: (prevVal: IWrappedData | undefined) => any): IWrappedData;
    getset(path: string | string[], valueFn: (prevVal: IWrappedData | undefined) => any, descriptor?: object): IWrappedData;
    ensure(path: string | string[], value: any, descriptor?: object): IWrappedData;
    ensure(invalid: (prevVal: IWrappedData) => boolean, path: string | string[], value: any, descriptor?: object): IWrappedData;
    unset(path: string | string[]): any;
    unwrap(config?: IUnwrapConfig): any;
    unwrap(path: string | string[], config?: IUnwrapConfig): any;
}

declare const wrapData: WrapFactory;

declare module 'wrap-data' {
    export = wrapData;
}
