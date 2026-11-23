const { randomUUID } = require("crypto");
const sharp = require("sharp");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const r2 = require("../config/cloudConfig");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/expressError");

exports.uploadBlogImage = wrapAsync(async (req, res) => {
  if (!req.file?.buffer) {
    throw new ExpressError(400, "Please select an image.");
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL
    ?.trim()
    .replace(/\/+$/, "");

  if (!bucket || !publicUrl) {
    throw new ExpressError(
      500,
      "R2_BUCKET_NAME ya R2_PUBLIC_URL configuration missing hai."
    );
  }

  let optimizedBuffer;

  try {
    const image = sharp(req.file.buffer, {
      limitInputPixels: 25000000,
      animated: false,
    });

    const metadata = await image.metadata();

    if (!["jpeg", "png", "webp"].includes(metadata.format)) {
      throw new Error("Unsupported image format.");
    }

    optimizedBuffer = await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ExpressError(
      400,
      "Valid JPG, PNG ya WebP image upload karo."
    );
  }

  const key = `Blogs/${randomUUID()}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimizedBuffer,
      ContentType: "image/webp",
    })
  );

  res.status(201).json({
    success: true,
    message: "Image uploaded successfully.",
    url: `${publicUrl}/${key}`,
  });
});