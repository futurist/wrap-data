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
    (data: any): IWrappedRoot;
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
    slice(
        path: string | string[],
        filter?: (data: IChangeStreamValue) => boolean,
        wrapper?: IWrappedData
    ): IWrappedRoot | undefined;
    get(path: string | string[], mapFunc?: (val: IWrappedData | undefined) => any): IWrappedData | undefined;
    set(value: any): IWrappedData;
    set(path: string | string[], value: any, descriptor?: object): IWrappedData;
    getMany(pathMap: object | string[] | string, mapFunc?: (val: IWrappedData | undefined) => any): object | Array<any> | IWrappedData | undefined;
    setMany(kvMap: object, descriptors?: object): object;
    getset(valueFn: (prevVal: IWrappedData | undefined) => any): IWrappedData;
    getset(path: string | string[], valueFn: (prevVal: IWrappedData | undefined) => any, descriptor?: object): IWrappedData;
    ensure(path: string | string[], value: any, descriptor?: object): IWrappedData;
    ensure(invalid: (prevVal: IWrappedData) => boolean, path: string | string[], value: any, descriptor?: object): IWrappedData;
    unset(path: string | string[]): any;
    unwrap(config?: IUnwrapConfig): any;
    unwrap(path: string | string[], config?: IUnwrapConfig): any;
}

declare interface MUTATION_TYPE {
    CREATE: 'create';
    ADD: 'add';
    CHANGE: 'change';
    DELETE: 'delete';
}

declare interface IWrappedRoot extends IWrappedData {
    change: Stream<IChangeStreamValue>;
    MUTATION_TYPE: MUTATION_TYPE
}

declare const wrapData: WrapFactory;

declare module 'wrap-data' {
    export = wrapData;
}
