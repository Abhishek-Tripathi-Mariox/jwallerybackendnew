const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }
  // Ensure key is exactly 32 bytes for AES-256
  return crypto.createHash("sha256").update(key).digest();
};

const encrypt = (text) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Return iv:tag:encrypted as a single string
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText) => {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

const encryptObject = (obj) => {
  const encrypted = {};
  for (const [key, value] of Object.entries(obj)) {
    encrypted[key] = encrypt(String(value));
  }
  return encrypted;
};

const decryptObject = (obj) => {
  const decrypted = {};
  for (const [key, value] of Object.entries(obj)) {
    decrypted[key] = decrypt(String(value));
  }
  return decrypted;
};

module.exports = { encrypt, decrypt, encryptObject, decryptObject };
