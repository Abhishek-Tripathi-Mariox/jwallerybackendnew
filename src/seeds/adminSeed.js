/**
 * Admin Seed Script
 * Run this script to create a default admin user
 * Usage: node src/seeds/adminSeed.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const url = process.env.LOCAL_MONGO_DB;

const seedAdmin = async () => {
  try {
    await mongoose.connect(url);
    console.log("Connected to database");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("Admin already exists:");
      console.log("Email: admin@example.com");
      console.log("(Password unchanged)");
    } else {
      // Create default admin
      const admin = new Admin({
        name: "Super Admin",
        email: "admin@example.com",
        password: "admin123",
        role: "superadmin",
        isActive: true,
      });

      await admin.save();

      console.log("Default admin created successfully!");
      console.log("Email: admin@example.com");
      console.log("Password: admin123");
      console.log("\n⚠️  Please change the password after first login!");
    }

    await mongoose.disconnect();
    console.log("\nDisconnected from database");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
