const treeDynamodb = require("../lib/cjs/");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

//const { data } = treeApiRequest.option(require("./test.json"));

const func = async () => {
  const response = await treeDynamodb.getOne({
    client,
    table: "buildlinkProject-main",
    query: {
      id: "MTY5MzMwNDIxMTQwOC0wLjgz",
    },
  });
  console.log(response);
};

func();
