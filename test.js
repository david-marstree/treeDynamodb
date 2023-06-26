const treeDynamodb = require("./index");
const treeApiRequest = require("treeapirequest");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

const { data } = treeApiRequest.option(require("./test.json"));

const func = async () => {
  const response = await treeDynamodb.get({
    client,
    table: "apiflowProject-dev",
    data: {
      ...data,
    },
  });
  console.log(response);
};

func();
