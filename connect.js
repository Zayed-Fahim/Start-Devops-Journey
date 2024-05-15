const mongoose = require("mongoose");
require("dotenv").config();

const connect = async () => {
  try {
    await mongoose
      .connect(
        `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}`
      )
      .then(() => {
        console.log("Successfully Established connection");
      });
  } catch (error) {
    console.error(error.message);
  }
};

module.exports = connect;
