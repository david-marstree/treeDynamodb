const treeDynamodb = require("./index");
const treeApiRequest = require("treeapirequest");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

//const { data } = treeApiRequest.option(require("./test.json"));

const func = async () => {
  const response = await treeDynamodb.get({
    client,
    table: "apiflowProject-dev",
    query: {
      limit: 1,
      NextToken:
        "BgcG/9uo6ItJjU7yogYUpEIFAXpSTew6rCHUJVF7menp4hKqgv5eHIOxDbprhTRy6lslqcroyVTKU1o6QWm9gqoA3a/4yDbMNxMrKVsa5kjDajvD/zott2wAuoIhLZHH1vJCUmFQhDXHt73FpFhNs8G5u0Ww/HWLAQZ1cjlx1b3SNwrmhmBboj0Be/cT/3RN6KunY7tm0cqrepOCHDGXJjGTrze5O/M7yHfcjTypXsESl23pHJiKF3k4h+gf4o4uI1hbuPybhMP43c87DneejvdaJXvAoP0+ktAgm1/lpU6QsHRj0lhYxdvRa8XoRFjEugaFdDkcx8t3c9XgD+QVBGHWpJrmAVgrNzWpjw==",
      // offset: "MTY4Nzg3NDAwNDkyNy0wLjky",
    },
  });
  console.log(response);
};

func();
