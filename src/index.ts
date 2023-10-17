import _ from "lodash";
import {
  DynamoDBClient,
  DescribeTableCommand,
  GetItemCommand,
  PutItemCommand,
  BatchWriteItemCommand,
  ExecuteStatementCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import type {
  BatchWriteItemCommandOutput,
  BatchWriteItemCommandInput,
  PutItemCommandOutput,
  DeleteItemCommandOutput,
  DynamoDBClientConfig,
  TableDescription,
} from "@aws-sdk/client-dynamodb";
import { createPartiQL, createItem, getValue } from "./helpers";

import type { DBQuery } from "./helpers";
import {
  DynamoDBDocumentClient,
  ExecuteStatementCommand as DDBDocExecuteStatementCommand,
} from "@aws-sdk/lib-dynamodb";
import type { TranslateConfig } from "@aws-sdk/lib-dynamodb";

/**
 * @name createClient
 * @abstract for connecting the dynamoDB and get DB client
 * @param {*} config
 * @returns
 */
export const createClient = (config: DynamoDBClientConfig): DynamoDBClient => {
  const client = new DynamoDBClient({ ...config });
  return client;
};

export const createDocumentClient = (
  client: DynamoDBClient,
  config?: TranslateConfig
): DynamoDBDocumentClient => {
  const documentClient = DynamoDBDocumentClient.from(client, config);
  return documentClient;
};

/**
 * @name describeTable
 * @async
 * @abstract describe dynamodb table and return the schema and field type
 * @param {table, Table Name, query: object for query data}
 * @returns
 */

export const describeTable = async ({
  client,
  table,
}: {
  client: DynamoDBClient;
  table: string;
}): Promise<TableDescription | undefined> => {
  try {
    const cmd = new DescribeTableCommand({
      TableName: table,
    });
    const { Table } = await client.send(cmd);
    return Table;
  } catch (error) {
    console.log(error);
  }
};

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

export const get = async ({
  client,
  table,
  query,
}: GetProps): Promise<undefined | GetResponse> => {
  const ddbDocClient = createDocumentClient(client);
  const Table = await describeTable({ client, table });
  if (!Table) return;
  const partiQL = createPartiQL({ Table, query });
  console.log("partiQL", partiQL);
  const cmd = new DDBDocExecuteStatementCommand(partiQL);

  try {
    const response = await ddbDocClient.send(cmd);
    const getResponse: GetResponse = {
      ...response,
      Items: getValue(response.Items),
      LastEvaluatedKey: getValue(response.LastEvaluatedKey),
    };
    return getResponse;
  } catch (error) {
    console.log(error);
  }
};

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

export const getOne = async ({
  client,
  table,
  query,
}: GetOneProps): Promise<undefined | GetOneResponse> => {
  const Table = await describeTable({ client, table });
  if (!Table) return;
  const Key = createItem({ Table, data: query });
  if (!!!Key) return;

  const cmd = new GetItemCommand({
    TableName: table,
    Key,
  });

  try {
    const response = await client.send(cmd);
    let result = { ...response, Item: getValue(response.Item) };
    return result;
  } catch (error) {
    console.log(error);
  }
};

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

export const add = async ({
  client,
  table,
  data,
}: AddProps): Promise<
  undefined | BatchWriteItemCommandOutput | PutItemCommandOutput
> => {
  const Table = await describeTable({ client, table });
  if (!Table) return;
  console.log("data:", data);

  if (_.isArray(data)) {
    // array
    let RequestItems: BatchWriteItemCommandInput["RequestItems"] = {};
    RequestItems[table] = _.reduce(
      data,
      (prev: any[], d: AddData) => {
        const Item = createItem({ Table, data: d });
        if (!Item) return prev;
        prev.push({
          PutRequest: {
            Item,
          },
        });
        return prev;
      },
      []
    );

    const cmd = new BatchWriteItemCommand({
      RequestItems,
    });
    try {
      const response = await client.send(cmd);
      return response;
    } catch (error) {
      console.log(error);
    }
  } else {
    const Item = createItem({ Table, data });
    console.log("Item:", Item);

    const cmd = new PutItemCommand({
      TableName: table,
      Item,
    });
    try {
      const response = await client.send(cmd);
      return response;
    } catch (error) {
      console.log(error);
    }
  }
};

export const edit = add;

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
export const remove = async ({
  client,
  table,
  data,
}: RemoveProps): Promise<undefined | DeleteItemCommandOutput> => {
  const Table = await describeTable({ client, table });
  if (!Table) return;
  const Key = createItem({ Table, data });
  if (!!!Key) return;
  const cmd = new DeleteItemCommand({
    TableName: table,
    Key,
  });

  try {
    const response = await client.send(cmd);
    return response;
  } catch (error) {
    console.log(error);
  }
};

export default {
  createClient,
  describeTable,
  get,
  getOne,
  add,
  remove,
  edit,
};
