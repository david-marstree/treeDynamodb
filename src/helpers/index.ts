import {
  ExecuteStatementCommandInput,
  TableDescription,
  AttributeValue,
} from "@aws-sdk/client-dynamodb";
import _ from "lodash";

/**
 * @name dataType
 * @abstract get AWS dynamodb basic dataType
 * @param {*} value
 * @returns
 */
const dataType = (
  value: null | string | number | boolean,
): "NULL" | "BOOL" | "N" | "S" | false => {
  if (_.isNull(value)) {
    // NULL
    return "NULL";
  }

  if (typeof value === "boolean") {
    // Boolean
    return "BOOL";
  }
  if (_.isNumber(value) || /^\-*[0-9]+(\.[0-9]*)*$/.test(value)) {
    // Number
    return "N";
  }

  if (typeof value === "string") {
    // String
    return "S";
  }
  return false;
};

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

export const getAttributeValue = (
  value: any,
): AttributeValue | QueryAttributeValue | undefined => {
  let obj: QueryAttributeValue = {};
  const dt = dataType(value);
  if (dt !== false) {
    // Basic data type
    obj[dt] = dt === "NULL" ? true : value;
    if (dt === "N") {
      obj[dt] = new String(value) as string;
    }
    return obj;
  }

  if (_.isArray(value)) {
    //if (_.every(value, (v) => dataType(v) === "B")) {
    //  //Binary Set
    //  obj["BS"] = value;
    //  return obj;
    if (_.every(value, (v) => dataType(v) === "N")) {
      //number set
      obj["NS"] = value;
      return obj;
    } else if (_.every(value, (v) => dataType(v) === "S")) {
      //string set
      obj["SS"] = value;
      return obj;
    } else {
      //list
      let newValue = _.map(value, (v) => getAttributeValue(v));
      obj["L"] = newValue;
      return obj;
    }
  }

  if (_.isPlainObject(value)) {
    //map
    let newValue = _.reduce(
      value,
      (prev: any, v, k) => {
        prev[k] = getAttributeValue(v);
        return prev;
      },
      {},
    );
    obj["M"] = newValue;
    return obj;
  }
};

export type AttributeDataType =
  | undefined
  | null
  | string
  | number
  | boolean
  | Map
  | List
  | Blob
  | Uint8Array
  | Uint8Array[];

type Map = {
  [key: string]: AttributeDataType;
};

type List = AttributeDataType[];

export const getValue = (
  AttributeValue: AttributeValue | any,
): AttributeDataType | AttributeDataType[] | undefined => {
  // check attributeValue is object
  if (_.isArray(AttributeValue)) {
    return _.reduce(
      AttributeValue,
      (prev: List, attrV: AttributeValue) => {
        prev.push(getValue(attrV));
        return prev;
      },
      [],
    );
  }

  // check attributeValue is object
  if (_.isPlainObject(AttributeValue)) {
    const keys = _.keys(AttributeValue);
    if (keys.length > 1) {
      return _.reduce(
        AttributeValue,
        (prev: Map, attrV, key) => {
          prev[key] = getValue(attrV);
          return prev;
        },
        {},
      );
    }

    if (keys[0] === "S") {
      return AttributeValue.S + "";
    } else if (keys[0] === "N" && AttributeValue.N) {
      return +AttributeValue.N;
    } else if (keys[0] === "B" || keys[0] === "BOOL") {
      return AttributeValue[keys[0]];
    } else if (keys[0] === "NULL") {
      return !!AttributeValue.NULL ? null : "1";
    } else if (keys[0] === "BS" || keys[0] === "SS") {
      return AttributeValue[keys[0]];
    } else if (keys[0] === "NS") {
      return _.map(AttributeValue.NS, (v) => +v);
    } else if (keys[0] === "M" && AttributeValue.M) {
      return getValue(AttributeValue.M);
    } else if (keys[0] === "L") {
      return _.map(AttributeValue.L, (v) => getValue(v));
    } else if (
      _.isPlainObject(AttributeValue[keys[0]]) ||
      _.isArray(AttributeValue[keys[0]])
    ) {
      let obj: Map = {};
      obj[keys[0]] = getValue(AttributeValue[keys[0]]);
      return obj;
    } else {
      return AttributeValue[keys[0]];
    }
  }

  return AttributeValue;
};

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

export const createItem = ({ Table, data }: CreateItemProps) => {
  const dataNames = _.keys(data);
  const { KeySchema, AttributeDefinitions } = Table;
  // // check data keys include key or not
  // console.log("KeySchema", KeySchema);
  // console.log("dataNames", dataNames);
  if (
    !_.some(
      KeySchema,
      (k) => _.includes(dataNames, k.AttributeName) && k.KeyType === "HASH",
    )
  ) {
    console.log("KEY is not includes in data");
    return;
  }

  let item = {};
  item = _.reduce(
    dataNames,
    (prev, name) => {
      let newObj: any = {};
      const af = _.find(
        AttributeDefinitions,
        (af) => af.AttributeName === name,
      );
      if (af && af.AttributeType) {
        newObj[name] = {};
        if (af.AttributeType === "N") {
          data[name] = new String(data[name]);
        }
        newObj[name][af.AttributeType] = data[name];
        return {
          ...prev,
          ...newObj,
        };
      } else {
        newObj[name] = getAttributeValue(data[name]);
        return {
          ...prev,
          ...newObj,
        };
      }
    },
    item,
  );

  return item;
};

export type Query = {
  [key: string]: any;
};

const _prepareParameters = ({
  query,
  Parameters = [],
  Statement = "",
}: {
  query: Query;
  Parameters?: AttributeValue[];
  Statement?: string;
}): { Parameters: AttributeValue[]; Statement: string } => {
  if (!_.isPlainObject(query)) return { Parameters, Statement };

  _.each(query, (value, key) => {
    if (Statement !== "" && !/^\$(and|or|not)$/i.test(key)) {
      Statement += " AND ";
    }

    if (/^\$(and|or|not)$/i.test(key)) {
      // check $and | $or | $not
      const m = /^\$(and|or|not)$/i.exec(key);
      if (!m || !m[1]) return;
      Statement += ` ${m[1].toUpperCase()} (`;
      let { Parameters: p, Statement: s } = _prepareParameters({
        query: value,
      });
      Parameters = [...Parameters, ...p];
      Statement += s;
      Statement += ")";
    } else if (_.isPlainObject(value)) {
      // check value is object
      let i = 0;
      _.each(value, (v, k) => {
        if (i++ > 0) Statement += " AND ";
        if (k === "eq") Statement += `${key} = ?`;
        if (k === "ne") Statement += `${key} <> ?`;
        if (k === "ge" || k === "gte") Statement += `${key} >= ?`;
        if (k === "gt") Statement += `${key} > ?`;
        if (k === "le" || k === "lte") Statement += `${key} <= ?`;
        if (k === "lt") Statement += `${key} < ?`;
        if (k === "like") Statement += `contains(${key}, ?)`;

        const params = getAttributeValue(v) as AttributeValue;
        if (!params) return;
        Parameters.push(params);
      });
    } else if (_.isArray(value) && value.length > 0) {
      // check value is array
      Statement += ` ${key} IN (${_.map(value, () => "?").join(" , ")})`;
      Parameters = _.reduce(
        value,
        (prev, v) => {
          const params = getAttributeValue(v) as AttributeValue;
          if (!params) return prev;
          prev.push(params);
          return prev;
        },
        Parameters,
      );
    } else if (value) {
      Statement += ` ${key} = ?`;
      const params = getAttributeValue(value) as AttributeValue;
      if (!params) return;
      Parameters.push(params);
    }
  });

  return {
    Parameters,
    Statement,
  };
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
export const createPartiQL = ({ Table, query = {} }: CreatePartiQLProps) => {
  let partiQL: ExecuteStatementCommandInput = {
    Statement: `SELECT * FROM "${Table.TableName}" `,
  };
  const { limit, offset, ...option } = query;
  if (!!limit) partiQL["Limit"] = +limit;
  if (!!offset) partiQL["NextToken"] = offset;

  // check option is empty or not
  if (_.isEmpty(option)) return partiQL;

  // organize Parameters
  let { Parameters, Statement } = _prepareParameters({
    query: option,
    Parameters: [],
    Statement: "",
  });
  partiQL["Statement"] += ` WHERE ${Statement}`;
  partiQL["Parameters"] = Parameters;
  partiQL["ReturnConsumedCapacity"] = "TOTAL";
  return partiQL;
};
