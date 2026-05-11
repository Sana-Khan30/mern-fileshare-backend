const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://mern-fileshare-frontend.vercel.app"
  ],
  methods: ["GET", "POST", "DELETE"],
}));

app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const FileSchema = new mongoose.Schema({
  url: String,
  name: String,
  publicId: String,
  resourceType: String,
  createdAt: { type: Date, default: Date.now },
});
const File = mongoose.model("File", FileSchema);

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "file_sharing_app",
    resource_type: "auto",
  },
});
const upload = multer({ storage: storage });

// UPLOAD
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const newFile = await File.create({
      url: req.file.path,
      name: req.file.originalname,
      publicId: req.file.filename,
      resourceType: req.file.resource_type || "image",
    });
    res.json(newFile);
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET FILES
app.get("/api/files", async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
app.delete("/api/files/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File nahi mili" });

    if (file.publicId) {
      await cloudinary.uploader.destroy(file.publicId, {
        resource_type: file.resourceType || "image",
      });
    }

    await File.findByIdAndDelete(req.params.id);
    res.json({ message: "File delete ho gayi" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
