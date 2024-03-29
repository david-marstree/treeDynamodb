"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.edit = exports.add = exports.getOne = exports.get = exports.describeTable = exports.createDocumentClient = exports.createClient = void 0;
const lodash_1 = __importDefault(require("lodash"));
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const helpers_1 = require("./helpers");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/**
 * @name createClient
 * @abstract for connecting the dynamoDB and get DB client
 * @param {*} config
 * @returns
 */
const createClient = (config) => {
    const client = new client_dynamodb_1.DynamoDBClient(Object.assign({}, config));
    return client;
};
exports.createClient = createClient;
const createDocumentClient = (client, config) => {
    const documentClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, config);
    return documentClient;
};
exports.createDocumentClient = createDocumentClient;
/**
 * @name describeTable
 * @async
 * @abstract describe dynamodb table and return the schema and field type
 * @param {table, Table Name, query: object for query data}
 * @returns
 */
const describeTable = ({ client, table, }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cmd = new client_dynamodb_1.DescribeTableCommand({
            TableName: table,
        });
        const { Table } = yield client.send(cmd);
        return Table;
    }
    catch (error) {
        console.log(error);
    }
});
exports.describeTable = describeTable;
const get = ({ client, table, query, }) => __awaiter(void 0, void 0, void 0, function* () {
    const ddbDocClient = (0, exports.createDocumentClient)(client);
    const Table = yield (0, exports.describeTable)({ client, table });
    if (!Table)
        return;
    const partiQL = (0, helpers_1.createPartiQL)({ Table, query });
    console.log("partiQL", partiQL);
    const cmd = new lib_dynamodb_1.ExecuteStatementCommand(partiQL);
    try {
        const response = yield ddbDocClient.send(cmd);
        const getResponse = Object.assign(Object.assign({}, response), { Items: response.Items, LastEvaluatedKey: response.LastEvaluatedKey });
        return getResponse;
    }
    catch (error) {
        console.log(error);
    }
});
exports.get = get;
const getOne = ({ client, table, query, }) => __awaiter(void 0, void 0, void 0, function* () {
    const ddbDocClient = (0, exports.createDocumentClient)(client);
    const Table = yield (0, exports.describeTable)({ client, table });
    if (!Table)
        return;
    const Key = (0, helpers_1.createItem)({ Table, data: query });
    if (!!!Key)
        return;
    const cmd = new lib_dynamodb_1.GetCommand({
        TableName: table,
        Key,
    });
    try {
        const response = yield ddbDocClient.send(cmd);
        let result = Object.assign(Object.assign({}, response), { Item: response.Item });
        return result;
    }
    catch (error) {
        console.log(error);
    }
});
exports.getOne = getOne;
const add = ({ client, table, data, }) => __awaiter(void 0, void 0, void 0, function* () {
    const ddbDocClient = (0, exports.createDocumentClient)(client);
    const Table = yield (0, exports.describeTable)({ client, table });
    if (!Table)
        return;
    console.log("data:", data);
    if (lodash_1.default.isArray(data)) {
        // array
        let RequestItems = {};
        RequestItems[table] = lodash_1.default.reduce(data, (prev, d) => {
            const Item = (0, helpers_1.createItem)({ Table, data: d });
            if (!Item)
                return prev;
            prev.push({
                PutRequest: {
                    Item,
                },
            });
            return prev;
        }, []);
        const cmd = new lib_dynamodb_1.BatchWriteCommand({
            RequestItems,
        });
        try {
            const response = yield ddbDocClient.send(cmd);
            return response;
        }
        catch (error) {
            console.log(error);
        }
    }
    else {
        const Item = (0, helpers_1.createItem)({ Table, data });
        console.log("Item:", Item);
        const cmd = new lib_dynamodb_1.PutCommand({
            TableName: table,
            Item,
        });
        try {
            const response = yield ddbDocClient.send(cmd);
            return response;
        }
        catch (error) {
            console.log(error);
        }
    }
});
exports.add = add;
exports.edit = exports.add;
const remove = ({ client, table, data, }) => __awaiter(void 0, void 0, void 0, function* () {
    const ddbDocClient = (0, exports.createDocumentClient)(client);
    const Table = yield (0, exports.describeTable)({ client, table });
    if (!Table)
        return;
    const Key = (0, helpers_1.createItem)({ Table, data });
    if (!!!Key)
        return;
    const cmd = new lib_dynamodb_1.DeleteCommand({
        TableName: table,
        Key,
    });
    try {
        const response = yield ddbDocClient.send(cmd);
        return response;
    }
    catch (error) {
        console.log(error);
    }
});
exports.remove = remove;
exports.default = {
    createClient: exports.createClient,
    describeTable: exports.describeTable,
    get: exports.get,
    getOne: exports.getOne,
    add: exports.add,
    remove: exports.remove,
    edit: exports.edit,
};
