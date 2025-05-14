const mongoose = require("mongoose");
require("dotenv").config();

const DB_URI = `mongodb://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@${process.env.MONGO_DB_HOST}:${process.env.MONGO_DB_PORT}/?authSource=admin`;

const connect = async () => {
  try {
    await mongoose
      .connect(DB_URI, {
        dbName: "devops",
      })
      .then(() => {
        console.log("Successfully Established connection");
      });
  } catch (error) {
    console.error(error.message);
  }
};

module.exports = connect;
