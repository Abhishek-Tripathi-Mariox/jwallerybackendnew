const { GoogleAuth } = require("google-auth-library");

require("dotenv").config();

const ProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const Location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const ServiceAccountKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// google-auth-library auto-discovers a credentials file via
// GOOGLE_APPLICATION_CREDENTIALS when no explicit `credentials` is passed, so
// GOOGLE_SERVICE_ACCOUNT_KEY (inline JSON, handy for containers) is only
// needed as an alternative to that file-path env var.
const auth = new GoogleAuth({
  ...(ServiceAccountKeyJson
    ? { credentials: JSON.parse(ServiceAccountKeyJson) }
    : {}),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

const isConfigured = () => !!ProjectId;

async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

/**
 * Embeds an image via Vertex AI's multimodalembedding@001 model (1408-dim
 * vector). Returns null (instead of throwing) on any failure — missing
 * config, auth error, quota, bad image — so callers can treat visual search
 * as best-effort and never break product create/update or block a user's
 * search request.
 */
async function getImageEmbedding(base64Image) {
  if (!isConfigured()) {
    console.warn("Vertex AI not configured — skipping image embedding");
    return null;
  }

  try {
    const token = await getAccessToken();
    const url = `https://${Location}-aiplatform.googleapis.com/v1/projects/${ProjectId}/locations/${Location}/publishers/google/models/multimodalembedding@001:predict`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ image: { bytesBase64Encoded: base64Image } }],
      }),
    });

    if (!response.ok) {
      console.error(
        "Vertex AI embedding request failed:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    const embedding = data?.predictions?.[0]?.imageEmbedding;
    return Array.isArray(embedding) ? embedding : null;
  } catch (error) {
    console.error("Vertex AI embedding error:", error);
    return null;
  }
}

/** Downloads a public image URL (e.g. an S3 product image) and embeds it. */
async function getImageEmbeddingFromUrl(imageUrl) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return getImageEmbedding(buffer.toString("base64"));
  } catch (error) {
    console.error("Fetching image for embedding failed:", error);
    return null;
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return -1;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

module.exports = {
  isConfigured,
  getImageEmbedding,
  getImageEmbeddingFromUrl,
  cosineSimilarity,
};
