const treeDynamodb = require("./index");
const treeApiRequest = require("treeapirequest");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

const { data } = treeApiRequest.option(require("./test.json"));

const func = async () => {
  const projectId = Buffer.from(
    new Date().getTime() + "-" + Math.round(Math.random() * 100) / 100
  ).toString("base64");
  const createdAt = parseInt(new Date().getTime() / 1000);

  const response = await treeDynamodb.add({
    client,
    table: "apiflowProject-dev",
    data: {
      ...data,
      projectId,
      createdAt,
    },
  });
  console.log(response);
};

func();
