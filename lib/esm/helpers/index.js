var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import _ from "lodash";
/**
 * @name dataType
 * @abstract get AWS dynamodb basic dataType
 * @param {*} value
 * @returns
 */
const dataType = (value) => {
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
export const getAttributeValue = (value) => {
    let obj = {};
    const dt = dataType(value);
    if (dt !== false) {
        // Basic data type
        obj[dt] = dt === "NULL" ? true : value;
        if (dt === "N") {
            obj[dt] = new String(value);
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
        }
        else if (_.every(value, (v) => dataType(v) === "S")) {
            //string set
            obj["SS"] = value;
            return obj;
        }
        else {
            //list
            let newValue = _.map(value, (v) => getAttributeValue(v));
            obj["L"] = newValue;
            return obj;
        }
    }
    if (_.isPlainObject(value)) {
        //map
        let newValue = _.reduce(value, (prev, v, k) => {
            prev[k] = getAttributeValue(v);
            return prev;
        }, {});
        obj["M"] = newValue;
        return obj;
    }
};
export const getValue = (AttributeValue) => {
    // check attributeValue is object
    if (_.isArray(AttributeValue)) {
        return _.reduce(AttributeValue, (prev, attrV) => {
            prev.push(getValue(attrV));
            return prev;
        }, []);
    }
    // check attributeValue is object
    if (_.isPlainObject(AttributeValue)) {
        const keys = _.keys(AttributeValue);
        if (keys.length > 1) {
            return _.reduce(AttributeValue, (prev, attrV, key) => {
                prev[key] = getValue(attrV);
                return prev;
            }, {});
        }
        if (keys[0] === "S") {
            return AttributeValue.S + "";
        }
        else if (keys[0] === "N" && AttributeValue.N) {
            return +AttributeValue.N;
        }
        else if (keys[0] === "B" || keys[0] === "BOOL") {
            return AttributeValue[keys[0]];
        }
        else if (keys[0] === "NULL") {
            return !!AttributeValue.NULL ? null : "1";
        }
        else if (keys[0] === "BS" || keys[0] === "SS") {
            return AttributeValue[keys[0]];
        }
        else if (keys[0] === "NS") {
            return _.map(AttributeValue.NS, (v) => +v);
        }
        else if (keys[0] === "M" && AttributeValue.M) {
            return getValue(AttributeValue.M);
        }
        else if (keys[0] === "L") {
            return _.map(AttributeValue.L, (v) => getValue(v));
        }
        else if (_.isPlainObject(AttributeValue[keys[0]]) ||
            _.isArray(AttributeValue[keys[0]])) {
            let obj = {};
            obj[keys[0]] = getValue(AttributeValue[keys[0]]);
            return obj;
        }
        else {
            return AttributeValue[keys[0]];
        }
    }
    return AttributeValue;
};
export const createItem = ({ Table, data }) => {
    const dataNames = _.keys(data);
    const { KeySchema, AttributeDefinitions } = Table;
    // // check data keys include key or not
    // console.log("KeySchema", KeySchema);
    // console.log("dataNames", dataNames);
    if (!_.some(KeySchema, (k) => _.includes(dataNames, k.AttributeName) && k.KeyType === "HASH")) {
        console.log("KEY is not includes in data");
        return;
    }
    let item = {};
    item = _.reduce(dataNames, (prev, name) => {
        let newObj = {};
        const af = _.find(AttributeDefinitions, (af) => af.AttributeName === name);
        if (af && af.AttributeType) {
            newObj[name] = {};
            if (af.AttributeType === "N") {
                data[name] = data[name] + "";
            }
            newObj[name][af.AttributeType] = data[name];
            return Object.assign(Object.assign({}, prev), newObj);
        }
        else {
            newObj[name] = getAttributeValue(data[name]);
            return Object.assign(Object.assign({}, prev), newObj);
        }
    }, item);
    return item;
};
const _prepareParameters = ({ query, Parameters = [], Statement = "", }) => {
    if (!_.isPlainObject(query))
        return { Parameters, Statement };
    _.each(query, (value, key) => {
        if (Statement !== "" && !/^\$(and|or|not)$/i.test(key)) {
            Statement += " AND ";
        }
        if (/^\$(and|or|not)$/i.test(key)) {
            // check $and | $or | $not
            const m = /^\$(and|or|not)$/i.exec(key);
            if (!m || !m[1])
                return;
            Statement += ` ${m[1].toUpperCase()} (`;
            let { Parameters: p, Statement: s } = _prepareParameters({
                query: value,
            });
            Parameters = [...Parameters, ...p];
            Statement += s;
            Statement += ")";
        }
        else if (_.isPlainObject(value)) {
            // check value is object
            let i = 0;
            _.each(value, (v, k) => {
                if (i++ > 0)
                    Statement += " AND ";
                if (k === "eq")
                    Statement += `${key} = ?`;
                if (k === "ne")
                    Statement += `${key} <> ?`;
                if (k === "ge" || k === "gte")
                    Statement += `${key} >= ?`;
                if (k === "gt")
                    Statement += `${key} > ?`;
                if (k === "le" || k === "lte")
                    Statement += `${key} <= ?`;
                if (k === "lt")
                    Statement += `${key} < ?`;
                if (k === "like")
                    Statement += `contains(${key}, ?)`;
                const params = getAttributeValue(v);
                if (!params)
                    return;
                Parameters.push(params);
            });
        }
        else if (_.isArray(value) && value.length > 0) {
            // check value is array
            Statement += ` ${key} IN (${_.map(value, () => "?").join(" , ")})`;
            Parameters = _.reduce(value, (prev, v) => {
                const params = getAttributeValue(v);
                if (!params)
                    return prev;
                prev.push(params);
                return prev;
            }, Parameters);
        }
        else if (value) {
            Statement += ` ${key} = ?`;
            const params = getAttributeValue(value);
            if (!params)
                return;
            Parameters.push(params);
        }
    });
    return {
        Parameters,
        Statement,
    };
};
export const createPartiQL = ({ Table, query = {} }) => {
    let partiQL = {
        Statement: `SELECT * FROM "${Table.TableName}" `,
    };
    const { limit, offset } = query, option = __rest(query, ["limit", "offset"]);
    if (!!limit)
        partiQL["Limit"] = +limit;
    if (!!offset)
        partiQL["NextToken"] = offset;
    // check option is empty or not
    if (_.isEmpty(option))
        return partiQL;
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
