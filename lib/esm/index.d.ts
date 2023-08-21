import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { BatchWriteItemCommandOutput, PutItemCommandOutput, DeleteItemCommandOutput } from "@aws-sdk/client-dynamodb";
import type { DynamoDBClientConfigType, TableDescription } from "@aws-sdk/client-dynamodb";
import type { DBQuery } from "./helpers";
/**
 * @name createClient
 * @abstract for connecting the dynamoDB and get DB client
 * @param {*} config
 * @returns
 */
export declare const createClient: (config: DynamoDBClientConfigType) => DynamoDBClient;
/**
 * @name describeTable
 * @async
 * @abstract describe dynamodb table and return the schema and field type
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
export declare const describeTable: ({ client, table, }: {
    client: DynamoDBClient;
    table: string;
}) => Promise<TableDescription | undefined>;
/**
 * @name get
 * @async
 * @abstract get item from dynamodb table
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
export type GetResponse = {
    Items: any;
    LastEvaluatedKey: any;
    [key: string]: any;
};
type GetProps = {
    client: DynamoDBClient;
    table: string;
    query: DBQuery;
};
export declare const get: ({ client, table, query, }: GetProps) => Promise<undefined | GetResponse>;
/**
 * @name getOne
 * @async
 * @abstract get item from dynamodb table by KEY
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
type GetOneProps = {
    client: DynamoDBClient;
    table: string;
    query: DBQuery;
};
type GetOneResponse = {
    Item: any;
    [key: string]: any;
};
export declare const getOne: ({ client, table, query, }: GetOneProps) => Promise<undefined | GetOneResponse>;
/**
 * @name add
 * @async
 * @abstract insert or update item into dynamodb table
 * @param {table: Tabel Name, data: insert or update data(Key must be includes)}
 * @returns
 */
export type AddData = {
    [key: string]: any;
};
type AddProps = {
    client: DynamoDBClient;
    table: string;
    data: AddData | AddData[];
};
export declare const add: ({ client, table, data, }: AddProps) => Promise<undefined | BatchWriteItemCommandOutput | PutItemCommandOutput>;
export declare const edit: ({ client, table, data, }: AddProps) => Promise<undefined | BatchWriteItemCommandOutput | PutItemCommandOutput>;
/**
 * @name remove
 * @async
 * @abstract delete item from dynamodb table
 * @param {String} table
 * @param {*} data
 */
export type RemoveData = {
    [key: string]: any;
};
type RemoveProps = {
    client: DynamoDBClient;
    table: string;
    data: RemoveData;
};
export declare const remove: ({ client, table, data, }: RemoveProps) => Promise<undefined | DeleteItemCommandOutput>;
export {};
//# sourceMappingURL=index.d.ts.map