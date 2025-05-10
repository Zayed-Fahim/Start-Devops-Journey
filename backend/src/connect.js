const mongoose = require("mongoose");
const path = require("path");

process.env.NODE_ENV = process.env.NODE_ENV || "development";

require("dotenv").config({
  path: path.resolve(
    __dirname,
    process.env.NODE_ENV === "development" ? "../.env.dev" : "../.env.prod"
  ),
});

const connect = async () => {
  try {
    await mongoose
      .connect(
        `mongodb://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_HOST}:${process.env.MONGO_DB_PORT}`
      )
      .then(() => {
        console.log("Successfully Established connection");
      });
  } catch (error) {
    console.error(error.message);
  }
};

module.exports = connect;
