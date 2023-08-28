const treeDynamodb = require("../lib/cjs/");

const client = treeDynamodb.createClient({
  region: "ap-southeast-1",
});

//const { data } = treeApiRequest.option(require("./test.json"));

const func = async () => {
  const response = await treeDynamodb.get({
    client,
    table: "buildlinkPage-main",
    query: {
      slug: "home",
      projectId: "MTY5MzIyNjc0MjkwNi0wLjM4",
      parentId: undefined,
    },
  });
  console.log(response);
};

func();
