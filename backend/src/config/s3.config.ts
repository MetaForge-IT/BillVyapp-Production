import { optionalEnv } from "./parse-env";

export const s3Config = {
  enabled: process.env.FILES_STORAGE === "s3" && Boolean(process.env.AWS_S3_BUCKET),
  bucket: optionalEnv("AWS_S3_BUCKET", ""),
  region: optionalEnv("AWS_REGION", "ap-south-1"),
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  publicBaseUrl: optionalEnv("AWS_S3_PUBLIC_BASE_URL", ""),
  localUploadDir: optionalEnv("LOCAL_UPLOAD_DIR", "uploads"),
} as const;
