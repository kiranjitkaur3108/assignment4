require("dotenv").config();

module.exports = {
  url: process.env.MONGO_URI,
  port: process.env.PORT || 8001,
  env: process.env.NODE_ENV || "development"
};
