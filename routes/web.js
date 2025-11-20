const express = require("express");
const router = express.Router();
const Listing = require("../models/listing"); // MongoDB model

// Home page
router.get("/", (req, res) => {
  res.render("index", { title: "Home" });
});

// About page
router.get("/about", (req, res) => {
  res.render("about", { title: "About" });
});

router.get("/allData", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const totalCount = await Listing.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const listings = await Listing.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Return JSON if requested
    if (req.headers.accept && req.headers.accept.includes("json")) {
      return res.json({
        page,
        totalPages,
        count: listings.length,
        data: listings,
      });
    }

    res.render("allData", {
      title: "All Airbnb Data",
      data: listings,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/viewData", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const totalCount = await Listing.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const listings = await Listing.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Map data to make it easier for helpers
    const mappedListings = listings.map((l) => ({
      id: l.id,
      name: l.NAME,
      host_name: l["host name"],
      neighbourhood: l.neighbourhood,
      room_type: l["room type"],
      price: l.price,
      image_url:
        l.thumbnail || (l.images && l.images.length > 0 ? l.images[0] : null),
    }));

    res.render("viewData", {
      title: "View Airbnb Data",
      data: mappedListings,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Display search form
router.get("/search/name", (req, res) => {
  res.render("searchName", { title: "Search by Property Name" });
});

router.post("/search/name", async (req, res) => {
  try {
    const nameInput = req.body.property_name?.trim();
    if (!nameInput) {
      // If browser submission with empty input
      if (req.headers.accept && req.headers.accept.includes("html")) {
        return res.render("searchName", {
          title: "Search by Property Name",
          errors: [{ msg: "Property name is required." }],
        });
      } else {
        return res.status(400).json({ error: "Property name is required" });
      }
    }

    const regex = new RegExp(nameInput, "i"); // case-insensitive search
    const results = await Listing.find({ NAME: regex }).lean().limit(50);

    const mappedResults = results.map((l) => ({
      id: l.id,
      name: l.NAME,
      host_name: l["host name"],
      neighbourhood: l.neighbourhood,
      room_type: l["room type"],
      price: l.price,
      picture_url:
        l.thumbnail || (l.images && l.images.length > 0 ? l.images[0] : null),
    }));

    // Detect if request wants JSON
    if (req.headers.accept && req.headers.accept.includes("json")) {
      return res.json({ count: mappedResults.length, data: mappedResults });
    }

    // Default: render Handlebars template for browser
    res.render("searchNameResult", {
      title: "Search Results",
      results: mappedResults,
      nameInput,
    });
  } catch (err) {
    console.error(err);
    if (req.headers.accept && req.headers.accept.includes("json")) {
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

// Render the Property ID search form
router.get("/search/PropertyID", (req, res) => {
  res.render("searchProperty", { title: "Search Airbnb Property" });
});

router.post("/search/PropertyID", async (req, res) => {
  try {
    let { property_id } = req.body;

    if (!property_id) {
      return res.render("searchResult", {
        title: "Search Result",
        result: null,
        notFound: true,
      });
    }

    property_id = property_id.toString().trim();

    const listing = await Listing.findOne({
      $expr: { $eq: [{ $toString: "$id" }, property_id] },
    }).lean();

    const result = listing
      ? {
          id: listing.id || "N/A",
          name: listing.NAME || listing.name || "N/A", // check both
          host_name: listing["host name"] || listing.host_name || "N/A",
          neighbourhood: listing.neighbourhood || "N/A",
          room_type: listing["room type"] || listing.room_type || "N/A",
          property_type: listing.property_type || "N/A",
          price: listing.price || "N/A",
          picture_url:
            listing.thumbnail ||
            (listing.images && listing.images[0] ? listing.images[0] : null),
        }
      : null;

    res.render("searchResult", {
      title: `Search Result for "${property_id}"`,
      result,
      notFound: !listing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// GET: Show price form OR show results
router.get("/viewData/price", async (req, res) => {
  try {
    // If user just opened the page → show form only
    if (!req.query.minPrice || !req.query.maxPrice) {
      return res.render("searchprice");
    }

    const min = parseFloat(req.query.minPrice);
    const max = parseFloat(req.query.maxPrice);

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const allListings = await Listing.find().lean();

    const filtered = allListings
      .map((l) => {
        let num = 0;
        if (l.price) {
          num = parseFloat(l.price.replace(/[$,]/g, "").trim()) || 0;
        }
        return { ...l, priceNumber: num };
      })
      .filter((l) => l.priceNumber >= min && l.priceNumber <= max);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);

    const results = filtered.slice(skip, skip + limit);

    const mapped = results.map((r) => ({
      id: r.id,
      name: r.NAME,
      host_name: r["host name"],
      neighbourhood: r.neighbourhood,
      room_type: r["room type"],
      price: r.price,
      image_url: r.thumbnail || (r.images && r.images[0] ? r.images[0] : null),
    }));

    res.render("searchPriceResult", {
      title: `Listings from $${min} to $${max}`,
      results: mapped,
      page,
      totalPages,
      minPrice: min,
      maxPrice: max,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/viewData/price", (req, res) => {
  const min = req.body.minPrice;
  const max = req.body.maxPrice;

  return res.redirect(`/viewData/price?minPrice=${min}&maxPrice=${max}`);
});

//viewdata
router.get("/viewData/clean", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50; // records per page
    const skip = (page - 1) * limit;

    // Only select listings with a non-empty name
    const totalCount = await Listing.countDocuments({ NAME: { $ne: "" } });
    const totalPages = Math.ceil(totalCount / limit);

    const listings = await Listing.find({ NAME: { $ne: "" } })
      .skip(skip)
      .limit(limit)
      .lean();

    // Map data to match the template
    const mappedListings = listings.map((l) => ({
      id: l.id,
      name: l.NAME,
      host_name: l["host name"],
      neighbourhood: l.neighbourhood,
      room_type: l["room type"],
      price: l.price,
      picture_url:
        l.thumbnail || (l.images && l.images.length > 0 ? l.images[0] : null),
    }));

    res.render("viewDataClean", {
      title: "Clean Airbnb Data",
      data: mappedListings,
      page,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// GET route – show insert form
router.get("/insert/product", (req, res) => {
  res.render("insertProduct", {
    title: "Insert New Product",
  });
});

router.post("/viewData/insert", async (req, res) => {
  try {
    // Parse number fields explicitly
    const newListing = new Listing({
      id: parseInt(req.body.id),
      name: req.body.name,
      host_name: req.body.host_name || "",
      neighbourhood: req.body.neighbourhood || "",
      room_type: req.body.room_type || "",
      property_type: req.body.property_type || "",
      price: parseFloat(req.body.price),
    });

    const savedListing = await newListing.save();

    // Render the success page instead of plain text
    res.render("insertSuccess", {
      title: "Listing Inserted",
      listing: {
        id: savedListing.id,
        name: savedListing.name,
        host_name: savedListing.host_name,
        neighbourhood: savedListing.neighbourhood,
        room_type: savedListing.room_type,
        property_type: savedListing.property_type,
        price: savedListing.price,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

// GET route – show delete form
router.get("/delete/product", (req, res) => {
  res.render("deleteProduct", { title: "Delete a Listing" });
});

// POST route – perform deletion
router.post("/delete/product", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.render("deleteProduct", {
        title: "Delete a Listing",
        errors: [{ msg: "Listing ID is required" }],
      });
    }

    // Delete the listing based on the 'id' field
    const deletedListing = await Listing.findOneAndDelete({ id: id }).lean();

    if (!deletedListing) {
      return res.render("deleteProduct", {
        title: "Delete a Listing",
        errors: [{ msg: `No listing found with ID: ${id}` }],
      });
    }

    const mappedListing = {
      id: deletedListing.id || "N/A",
      name: deletedListing.NAME || deletedListing.name || "N/A",
      host_name:
        deletedListing["host name"] || deletedListing.host_name || "N/A",
      neighbourhood: deletedListing.neighbourhood || "N/A",
      room_type:
        deletedListing["room type"] || deletedListing.room_type || "N/A",
      property_type: deletedListing.property_type || "N/A",
      price: deletedListing.price || "N/A",
      thumbnail:
        deletedListing.thumbnail ||
        (deletedListing.images && deletedListing.images[0]) ||
        null,
    };

    // Render success page
    res.render("deleteSuccess", {
      title: "Listing Deleted Successfully",
      listing: mappedListing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// GET: Show update form
router.get("/update/product", (req, res) => {
  res.render("updateProduct", {
    title: "Update Listing",
  });
});
// POST: Update listing
router.post("/update/product", async (req, res) => {
  try {
    const { id, name, price } = req.body;

    if (!id) {
      return res.render("updateProduct", {
        title: "Update Listing",
        errors: [{ msg: "Listing ID is required" }],
      });
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.NAME = name; // for old documents
    if (name) updateFields.name = name; // for newly inserted documents
    if (price !== undefined) {
      let priceNum = price;
      if (typeof price === "string") {
        priceNum = parseFloat(price.replace(/[$,]/g, ""));
      }
      if (!isNaN(priceNum)) {
        updateFields.price = priceNum;
      }
    }

    // Find and update the listing
    const updatedListing = await Listing.findOneAndUpdate(
      { id: id }, // you can also use { _id: id } if using Mongo _id
      { $set: updateFields },
      { new: true, lean: true } // return updated document
    );

    if (!updatedListing) {
      return res.render("updateProduct", {
        title: "Update Listing",
        errors: [{ msg: `No listing found with ID: ${id}` }],
      });
    }

    // Map fields for template
    const mappedListing = {
      id: updatedListing.id,
      name: updatedListing.NAME || updatedListing.name || "N/A",
      price: updatedListing.price || "N/A",
    };

    res.render("updateSuccess", {
      title: "Listing Updated Successfully",
      listing: mappedListing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error: " + err.message);
  }
});

module.exports = router;
