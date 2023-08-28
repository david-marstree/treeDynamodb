var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import _ from "lodash";
import { DynamoDBClient, DescribeTableCommand, GetItemCommand, PutItemCommand, BatchWriteItemCommand, ExecuteStatementCommand, DeleteItemCommand, } from "@aws-sdk/client-dynamodb";
import { createPartiQL, createItem, getValue } from "./helpers";
/**
 * @name createClient
 * @abstract for connecting the dynamoDB and get DB client
 * @param {*} config
 * @returns
 */
export const createClient = (config) => {
    const client = new DynamoDBClient(Object.assign({}, config));
    return client;
};
/**
 * @name describeTable
 * @async
 * @abstract describe dynamodb table and return the schema and field type
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
export const describeTable = ({ client, table, }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cmd = new DescribeTableCommand({
            TableName: table,
        });
        const { Table } = yield client.send(cmd);
        return Table;
    }
    catch (error) {
        console.log(error);
    }
});
export const get = ({ client, table, query, }) => __awaiter(void 0, void 0, void 0, function* () {
    const Table = yield describeTable({ client, table });
    if (!Table)
        return;
    const partiQL = createPartiQL({ Table, query });
    console.log("partiQL", partiQL);
    const cmd = new ExecuteStatementCommand(partiQL);
    try {
        const response = yield client.send(cmd);
        const getResponse = Object.assign(Object.assign({}, response), { Items: getValue(response.Items), LastEvaluatedKey: getValue(response.LastEvaluatedKey) });
        return getResponse;
    }
    catch (error) {
        console.log(error);
    }
});
export const getOne = ({ client, table, query, }) => __awaiter(void 0, void 0, void 0, function* () {
    const Table = yield describeTable({ client, table });
    if (!Table)
        return;
    const Key = createItem({ Table, data: query });
    if (!!!Key)
        return;
    const cmd = new GetItemCommand({
        TableName: table,
        Key,
    });
    try {
        const response = yield client.send(cmd);
        let result = Object.assign(Object.assign({}, response), { Item: getValue(response.Item) });
        return result;
    }
    catch (error) {
        console.log(error);
    }
});
export const add = ({ client, table, data, }) => __awaiter(void 0, void 0, void 0, function* () {
    const Table = yield describeTable({ client, table });
    if (!Table)
        return;
    console.log("data:", data);
    if (_.isArray(data)) {
        // array
        let RequestItems = {};
        RequestItems[table] = _.reduce(data, (prev, d) => {
            const Item = createItem({ Table, data: d });
            if (!Item)
                return prev;
            prev.push({
                PutRequest: {
                    Item,
                },
            });
            return prev;
        }, []);
        const cmd = new BatchWriteItemCommand({
            RequestItems,
        });
        try {
            const response = yield client.send(cmd);
            return response;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        const Item = createItem({ Table, data });
        console.log("Item:", Item);
        const cmd = new PutItemCommand({
            TableName: table,
            Item,
        });
        try {
            const response = yield client.send(cmd);
            return response;
        }
        catch (error) {
            console.log(error);
        }
    }
});
export const edit = add;
export const remove = ({ client, table, data, }) => __awaiter(void 0, void 0, void 0, function* () {
    const Table = yield describeTable({ client, table });
    if (!Table)
        return;
    const Key = createItem({ Table, data });
    if (!!!Key)
        return;
    const cmd = new DeleteItemCommand({
        TableName: table,
        Key,
    });
    try {
        const response = yield client.send(cmd);
        return response;
    }
    catch (error) {
        console.log(error);
    }
});
export default {
    createClient,
    describeTable,
    get,
    getOne,
    add,
    remove,
    edit,
};
