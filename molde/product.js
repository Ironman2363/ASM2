const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const product = new Schema({
  code_product: String,
  name_product: String,
  price: Number,
  image: String,
  color: String,
  id_KH: String,
  name_KH: String,
  type_product: String,
});

module.exports = mongoose.model("product", product);
