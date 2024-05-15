const express = require("express");
const User = require("./Model/User");
const connect = require("./connect");
const app = express();
const port = 3000;

app.use(express.json());

connect();
app.get("/", (req, res) => {
  res.send("Start learning DevOps!");
});

app.get("/users", async (req, res, next) => {
  try {
    let query = {};
    if (req.query.userid) query = { ...query, _id: req.query.userid };

    const result = await User.find(query);
    if (result.length === 0)
      return res.status(200).json({
        success: true,
        messssage: null,
        data: "No users data available!",
      });
    res.status(200).json({ success: true, messssage: null, data: result });
  } catch (error) {
    console.log(error.messssage);
    next(error);
  }
});
app.post("/users", async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    if (!user)
      return res.status(400).json({
        success: false,
        messssage: "User not created! Please try again.",
      });
    res.status(201).json({ success: true, messssage: null });
  } catch (error) {
    console.log(error.messssage);
    next(error);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
