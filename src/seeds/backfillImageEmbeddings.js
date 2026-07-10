/**
 * Backfill Image Embeddings Script
 * Generates a Vertex AI visual-search embedding for every existing product
 * that doesn't have one yet (products created before camera search shipped).
 * New products get their embedding automatically on create/update — this is
 * a one-time catch-up for old data.
 * Usage: node src/seeds/backfillImageEmbeddings.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { getImageEmbeddingFromUrl, isConfigured } = require("../util/vertexVision");

const url = process.env.LOCAL_MONGO_DB;

const backfill = async () => {
  if (!isConfigured()) {
    console.error(
      "GOOGLE_CLOUD_PROJECT_ID is not set — configure Vertex AI in .env before running this script.",
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(url);
    console.log("Connected to database");

    const products = await Product.find({
      isDeleted: { $ne: true },
      $or: [
        { imageEmbedding: { $exists: false } },
        { imageEmbedding: { $size: 0 } },
      ],
      "productImages.0": { $exists: true },
    }).select("_id productImages");

    console.log(`Found ${products.length} product(s) needing an embedding`);

    let done = 0, failed = 0;
    for (const product of products) {
      const embedding = await getImageEmbeddingFromUrl(product.productImages[0].url);
      if (embedding) {
        await Product.updateOne({ _id: product._id }, { imageEmbedding: embedding });
        done++;
      } else {
        failed++;
        console.warn(`  Skipped ${product._id} — embedding failed`);
      }
    }

    console.log(`Done. Embedded: ${done}, failed: ${failed}`);
    await mongoose.disconnect();
    console.log("Disconnected from database");
    process.exit(0);
  } catch (error) {
    console.error("Error backfilling image embeddings:", error);
    process.exit(1);
  }
};

backfill();
