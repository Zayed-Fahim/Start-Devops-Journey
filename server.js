const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const connect = require("./connect");
const User = require("./models/User");

const app = express();
const port = 3000;

app.use(express.json());

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
        message: "Not a valid MongoDB ObjectId!",
      });
    }

    const result = await User.findOne(query);
    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No data available!",
        data: [],
      });
    }
    res.status(200).json({ success: true, message: null, data: result });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
});

app.post("/users", async (req, res, next) => {
  try {
    await User.create(req.body);
    res
      .status(201)
      .json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.log(error.message);
    next(error);
  }
});

connect().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
});
