const express = require("express");
const User = require("./Model/User");
const connect = require("./connect");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const app = express();
const port = 3000;

app.use(express.json());

connect();
app.get("/", (req, res) => {
  res.send("Start learning DevOps!");
});

app.get("/users", async (req, res, next) => {
  try {
    const { userid } = req.query;
    let query = {};
    if (userid) query = { ...query, _id: userid };

    if (userid && !ObjectId.isValid(userid)) {
      return res.status(400).json({
        success: false,
        messssage: "Not a valid mongodb objectid!",
      });
    }

    const result = await User.find(query);
    if (result.length === 0)
      return res.status(200).json({
        success: true,
        messssage: null,
        data: "No data available!",
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
