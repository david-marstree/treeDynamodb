import { ExecuteStatementCommandInput, TableDescription, AttributeValue } from "@aws-sdk/client-dynamodb";
/**
 * @name getAttributeValue
 * @abstract get AWS dynamodb AttributeValue by value
 * @param {*} value
 * @returns
 */
export type QueryDataType = "NULL" | "BOOL" | "N" | "S";
export type QueryAttributeValue = {
    NULL?: boolean;
    BOOL?: boolean;
    N?: string;
    S?: string;
    BS?: Uint8Array[];
    B?: Uint8Array;
    NS?: string[];
    SS?: string[];
    M?: QueryAttributeValue;
    L?: (QueryAttributeValue | undefined)[];
};
export declare const getAttributeValue: (value: any) => AttributeValue | QueryAttributeValue | undefined;
export type AttributeDataType = undefined | null | string | number | boolean | Map | List | Blob | Uint8Array | Uint8Array[];
type Map = {
    [key: string]: AttributeDataType;
};
type List = AttributeDataType[];
export declare const getValue: (AttributeValue: any) => AttributeDataType | AttributeDataType[] | undefined;
/**
 * @name createItem
 * @abstract change data to AWS dynamodb Item
 * @param {String} tablename
 * @param {*} data
 * @returns
 */
export type CreateItemProps = {
    Table: TableDescription;
    data: any;
};
export declare const createItem: ({ Table, data }: CreateItemProps) => any;
export type Query = {
    [key: string]: any;
};
/**
 * @name createPartiQL
 * @abstract create PartiQL for AWS Dynamodb query
 * @param {String} Table
 * @param {PlainObject} query
 * @returns
 */
export type DBQuery = {
    limit?: number | string;
    offset?: string;
    [key: string]: any;
};
export type CreatePartiQLProps = {
    Table: TableDescription;
    query?: DBQuery;
};
export declare const createPartiQL: ({ Table, query }: CreatePartiQLProps) => ExecuteStatementCommandInput;
export {};
//# sourceMappingURL=index.d.ts.map