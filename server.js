const express = require("express");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Start learning DevOps!");
});

app.listen(port, () => {
  console.log(`Example app listening at port ${port}`);
});
