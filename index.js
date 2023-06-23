const {
  DynamoDBClient,
  DescribeTableCommand,
  GetItemCommand,
  PutItemCommand,
  BatchWriteItemCommand,
  ExecuteStatementCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const _ = require("lodash");

const helper = require("./helpers");

/**
 * @name createClient
 * @abstract for connecting the dynamoDB and get DB client
 * @param {*} config
 * @returns
 */
const createClient = (config) => new DynamoDBClient(config);

/**
 * @name describeTable
 * @async
 * @abstract describe dynamodb table and return the schema and field type
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
const describeTable = async ({ client, table }) => {
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
const get = async ({ client, table, query }) => {
  const Table = await describeTable({ client, table });
  const partiQL = helper.createPartiQL({ Table, query });
  const cmd = new ExecuteStatementCommand(partiQL);

  try {
    let response = await client.send(cmd);
    response.Items = helper.getValue(response.Items);
    response.LastEvaluatedKey = helper.getValue(response.LastEvaluatedKey);
    return response;
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
const getOne = async ({ client, table, query }) => {
  const Table = await describeTable({ client, table });
  const Key = helper.createItem({ Table, data: query });
  if (!!!Key) return;

  const cmd = new GetItemCommand({
    TableName: table,
    Key,
  });

  try {
    let response = await client.send(cmd);
    response.Item = helper.getValue(response.Item);
    return response;
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
const add = async ({ client, table, data }) => {
  const Table = await describeTable({ client, table });

  console.log("data:", data);

  if (_.isArray(data)) {
    // array
    let RequestItems = {};
    RequestItems[table] = _.reduce(
      data,
      (prev, d) => {
        prev.push({
          PutRequest: {
            Item: helper.createItem({ Table, data: d }),
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
    const Item = helper.createItem({ Table, data });
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

/**
 * @name remove
 * @async
 * @abstract delete item from dynamodb table
 * @param {String} table
 * @param {*} data
 */
const remove = async ({ client, table, data }) => {
  const Table = await describeTable({ client, table });
  const Key = helper.createItem({ Table, data });
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

module.exports = {
  describeTable,
  get,
  getOne,
  add,
  remove,
  edit: add,
  createClient,
};
