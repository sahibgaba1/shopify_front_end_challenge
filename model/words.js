const mongoose = require("mongoose");

const WordSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, expires: "10m", default: Date.now },
    keyword: { type: String, required: true, unique: true },
    data: { type: String, required: true },
  },
  { collection: "words" }
);

const model = mongoose.model("WordSchema", WordSchema);

module.exports = model;
