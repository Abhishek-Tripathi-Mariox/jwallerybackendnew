const { Upload } = require("@aws-sdk/lib-storage");
const { S3Client } = require("@aws-sdk/client-s3");

require("dotenv").config();

const Bucket = process.env.AWS_BUCKET_NAME || process.env.BUCKET;
const Region = process.env.AWS_REGION || process.env.REGION;
const AccessKey = process.env.AWS_ACCESS_KEY_ID || process.env.ACCESSKEY;
const SecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRETACCESSKEY;

const config = {
  region: Region,
  credentials: {
    accessKeyId: AccessKey,
    secretAccessKey: SecretKey,
  },
};

const s3Client = new S3Client(config);

async function uploadFileToAws(file) {
  const fileName = `${new Date().getTime()}_${file.name}`;
  const mimetype = file.mimetype;
  const fileData = file.data;

  // return { file };
  const target = {
    Bucket,
    Key: fileName,
    Body: fileData,
    ContentType: mimetype,
  };

  const upload = new Upload({
    params: target,
    client: s3Client,
    queueSize: 3,
  });

  upload.on("httpUploadProgress", (progress) => {
    // console.log(progress);
  });

  let data = await upload.done();

  let qrLocation = data.Location;

  return { images: qrLocation };
}

module.exports = {
  uploadFileToAws,
};
