export interface IBTreeMap {
    readonly lowest: any;
    readonly highest: any;
    readonly order: number;
    readonly size: number;
    readonly stats: Record<string, number>;
    has(key: any): boolean;
    set(key: any, value: any): BTreeMap;
    get(key: any, endKey?: any, inclusive?: boolean): Array<any> | IterableIterator<Array<any>>;
    delete(key: any, endKey?: any, inclusive?: boolean): boolean;
    clear(): void;
    [Symbol.iterator](): IterableIterator<Array<any>>;
    keys(start: any, end: any, inclusive: boolean): IterableIterator<any>;
    values(start: any, end: any, inclusive: boolean): IterableIterator<Array<any>>;
    entries(start: any, end: any, inclusive: boolean): IterableIterator<Array<any>>;
    forEach(func: Function, start: any, end: any, inclusive: boolean): void;
    load(path: string): void;
    save(path: string): void;
    toString(): string;
}
export declare class BTreeMap implements IBTreeMap {
    #private;
    constructor(options?: any);
    get lowest(): any;
    get highest(): any;
    get order(): number;
    get size(): number;
    get stats(): Record<string, number>;
    has(key: any): boolean;
    set(key: any, value: any): BTreeMap;
    get(key: any, endKey?: any, inclusive?: boolean): Array<any> | IterableIterator<Array<any>>;
    delete(key: any, endKey?: any, inclusive?: boolean): boolean;
    clear(): void;
    [Symbol.iterator](): IterableIterator<Array<any>>;
    keys(start?: any, end?: any, inclusive?: boolean): IterableIterator<any>;
    values(start?: any, end?: any, inclusive?: boolean): IterableIterator<Array<any>>;
    entries(start?: any, end?: any, inclusive?: boolean): IterableIterator<Array<any>>;
    forEach(func: Function, start?: any, end?: any, inclusive?: boolean): void;
    load(path: string): void;
    save(path: string): void;
    toString(): string;
}
