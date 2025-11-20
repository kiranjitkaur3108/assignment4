require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const exphbs = require("express-handlebars");
const Handlebars = require("handlebars");

const config = require("./config/database");
const listingRoutes = require("./routes/listings");
const webRoutes = require("./routes/web");

const app = express();

// ------------------------------
// BODY PARSING
// ------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------
// STATIC FILES
// ------------------------------
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------
// VIEW ENGINE (HANDLEBARS) WITH HELPERS AND PROTOTYPE ACCESS
// ------------------------------
app.engine(
  "hbs",
  exphbs.engine({
    extname: ".hbs",
    handlebars: Handlebars,
    runtimeOptions: {
      allowProtoPropertiesByDefault: true, // Allow access to Mongoose props
      allowProtoMethodsByDefault: true,
    },
    helpers: {
      eq: (a, b) => a === b,
      emptyName: (name) => (name && name.trim() !== "" ? name : "N/A"),
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      gt: (a, b) => a > b,
      lt: (a, b) => a < b,
      keys: (obj) => Object.keys(obj), // 
      lookup: (obj, field) => obj[field] || "N/A", 
    },
  })
);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// ------------------------------
// CONNECT TO MONGODB
// ------------------------------
mongoose
  .connect(config.url)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("Connection error:", err));

const db = mongoose.connection;
db.on("connected", () => console.log("Mongoose connected"));
db.on("error", (err) => console.error("Mongoose error:", err));
db.on("disconnected", () => console.log("Mongoose disconnected"));

// Graceful shutdown
process.on("SIGINT", async () => {
  await db.close();
  console.log("Mongoose disconnected on app termination");
  process.exit(0);
});

// ------------------------------
// API ROUTES
// ------------------------------
app.use("/api/listings", listingRoutes);

// ------------------------------
// FRONTEND ROUTES
// ------------------------------
app.use("/", webRoutes);

// ------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") {
    return res
      .status(400)
      .json({ message: "Validation Error", errors: err.errors });
  }
  res.status(500).json({ message: "Internal Server Error" });
});

// ------------------------------
// START SERVER
// ------------------------------
const PORT = config.port || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
