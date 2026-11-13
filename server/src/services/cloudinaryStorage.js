import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { v2 as cloudinary } from "cloudinary";
import process from "node:process";

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    const error = new Error("Cloudinary is not configured.");
    error.name = "CloudinaryConfigurationError";
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function uploadResumeFile(fileBuffer, { resourceType = "image", format = "pdf" } = {}) {
  const client = configureCloudinary();
  const publicId = randomUUID();
  const uploadPublicId = resourceType === "raw" ? `${publicId}.${format}` : publicId;

  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream({
      resource_type: resourceType,
      folder: "resumes",
      public_id: uploadPublicId,
      ...(resourceType === "image" ? { format } : {}),
      overwrite: false,
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url || !result.public_id) {
        return reject(new Error("Cloudinary did not return a secure resume URL."));
      }
      return resolve({
        secureUrl: result.secure_url,
        publicId: result.public_id,
      });
    });

    upload.end(Buffer.from(fileBuffer));
  });
}

export function createResumeDownloadUrl(publicId, format = "pdf", resourceType = "image") {
  const client = configureCloudinary();
  return client.utils.private_download_url(publicId, format, {
    resource_type: resourceType,
    type: "upload",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: false,
  });
}

export async function deleteResumeFile(publicId, resourceType = "image") {
  const client = configureCloudinary();
  return client.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}
