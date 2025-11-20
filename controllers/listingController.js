const Listing = require("../models/listing");


// GET all listings (limited)
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;   
    const limit = parseInt(req.query.limit) || 50; 

    const listings = await Listing.find()
      .sort({ id: 1 })              // Sort by Airbnb id ascending
      .skip((page - 1) * limit)     
      .limit(limit);                

    res.json({ page, limit, count: listings.length, data: listings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET a single listing by ID
exports.getOne = async (req, res) => {
  try {
    const listing = await Listing.findOne({ id: req.params.id });
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE a new listing
exports.create = async (req, res) => {
  try {
    const listing = await Listing.create(req.body);
    res.status(201).json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// UPDATE a listing by ID
exports.update = async (req, res) => {
  try {
    const listing = await Listing.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE a listing by ID
exports.remove = async (req, res) => {
  try {
    const listing = await Listing.findOneAndDelete({ id: req.params.id });
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
