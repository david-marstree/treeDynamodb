const _ = require("lodash");

/**
 * @name dataType
 * @abstract get AWS dynamodb basic dataType
 * @param {*} value
 * @returns
 */
const dataType = (value) => {
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
  if (_.isNull(value)) {
    // NULL
    return "NULL";
  }
  return false;
};

/**
 * @name getAttributeValue
 * @abstract get AWS dynamodb AttributeValue by value
 * @param {*} value
 * @returns
 */
const getAttributeValue = (value) => {
  let obj = {};
  if (!!dataType(value)) {
    // Basic data type
    obj[dataType(value)] = dataType(value) === "NULL" ? true : value;
    return obj;
  }

  if (_.isArray(value)) {
    if (_.every(value, (v) => dataType(v) === "B")) {
      //Binary Set
      obj["BS"] = value;
      return obj;
    } else if (_.every(value, (v) => dataType(v) === "N")) {
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
      (prev, v, k) => {
        prev[k] = getAttributeValue(v);
        return prev;
      },
      {}
    );
    obj["M"] = newValue;
    return obj;
  }
};

/**
 * @name getValue
 * @abstract get value by AWS dynamodb AttributeValue
 * @param {*} attributeValue
 * @returns
 */
const getValue = (attributeValue) => {
  if (!_.isPlainObject(attributeValue) && !_.isArray(attributeValue)) {
    if (dataType(attributeValue) === "N") {
      return +attributeValue;
    }
    if (dataType(attributeValue) === "NULL") {
      return null;
    }
    return attributeValue;
  }

  // check attributeValue is object
  if (_.isPlainObject(attributeValue)) {
    if (_.keys(attributeValue).length > 1) {
      // check attributeValue's key > 1
      return _.reduce(
        attributeValue,
        (prev, attrV, attrKey) => {
          prev[attrKey] = getValue(attrV);
          return prev;
        },
        {}
      );
    } else if (_.keys(attributeValue).length == 1) {
      // check attributeValue's key == 1
      let key = _.keys(attributeValue)[0];
      if (
        _.includes(
          ["B", "BOOL", "BS", "L", "M", "N", "NS", "NULL", "S", "SS"],
          key
        )
      ) {
        return getValue(attributeValue[key]);
      } else {
        if (
          _.isPlainObject(attributeValue[key]) ||
          _.isArray(attributeValue[key])
        ) {
          attributeValue[key] = getValue(attributeValue[key]);
        }
        return attributeValue;
      }
    }
  }
  // check attributeValue is array
  if (_.isArray(attributeValue)) {
    return _.reduce(
      attributeValue,
      (prev, attrV) => {
        prev.push(getValue(attrV));
        return prev;
      },
      []
    );
  }
};

/**
 * @name createItem
 * @abstract change data to AWS dynamodb Item
 * @param {String} tablename
 * @param {*} data
 * @returns
 */
const createItem = ({ Table, data }) => {
  const dataNames = _.keys(data);
  const { KeySchema, AttributeDefinitions } = Table;
  // check data keys include key or not
  if (
    !_.some(
      KeySchema,
      (k) => _.includes(dataNames, k.AttributeName) && k.KeyType === "HASH"
    )
  ) {
    console.log("KEY is not includes in data");
    return;
  }

  let item = {};
  item = _.reduce(
    dataNames,
    (prev, name) => {
      let newObj = {};
      const af = _.find(
        AttributeDefinitions,
        (af) => af.AttributeName === name
      );
      if (af && af.AttributeType) {
        newObj[name] = {};
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
    item
  );

  return item;
};

const _prepareParameters = ({ query, Parameters = [], Statement = "" }) => {
  if (!_.isPlainObject(query)) return { Parameters, Statement };

  _.each(query, (value, key) => {
    if (Statement !== "" && !/^\$(and|or|not)$/i.test(key)) {
      Statement += " AND ";
    }

    if (/^\$(and|or|not)$/i.test(key)) {
      // check $and | $or | $not
      const m = /^\$(and|or|not)$/i.exec(key);
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

        Parameters.push(getAttributeValue(v));
      });
    } else if (_.isArray(value)) {
      // check value is array
      Statement += ` ${key} IN (${_.map(value, () => "?").join(" , ")})`;
      Parameters = _.reduce(
        value,
        (prev, v) => {
          prev.push(getAttributeValue(v));
          return prev;
        },
        Parameters
      );
    } else {
      Statement += ` ${key} = ?`;
      Parameters.push(getAttributeValue(value));
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
const createPartiQL = ({ Table, query = {} }) => {
  let partiQL = {
    Statement: `SELECT * FROM "${Table.TableName}" `,
  };
  const { limit, ...option } = query;
  if (!!limit) partiQL["Limit"] = limit;

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

  return partiQL;
};

module.exports = {
  getAttributeValue,
  createItem,
  createPartiQL,
  getValue,
};
