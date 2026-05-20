import Express from "express";

const app = Express();

const requestMap: Record<string, any> = {};
const requestId = "123";

app.get("/", async (req, res) => {
  const promise = new Promise((resolve) => {
    requestMap[requestId] = resolve;
  });
  await promise;
  res.send("hello world");
});

setTimeout(() => {
  requestMap[requestId]();
}, 5000);

app.listen(3000, () => {
  console.log("listening");
});
