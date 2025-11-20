const mongoose = require("mongoose");

const ListingSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  host_id: { type: Number },
  host_name: { type: String },
  neighbourhood_group: { type: String },
  neighbourhood: { type: String },
  price: { type: Number, required: true, min: 0 },
  room_type: { type: String },
  property_type: { type: String }
});

module.exports = mongoose.model("Listing", ListingSchema);
