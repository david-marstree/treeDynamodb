const treeDynamodb = require("./index");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

const func = async () => {
  const response = await treeDynamodb.get({
    client,
    table: "apiflowProject-dev",
    query: {
      limit: "10",
    },
  });
  console.log(response);
};

func();
