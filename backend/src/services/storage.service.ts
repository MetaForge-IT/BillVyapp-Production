import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { s3Config } from "../config/s3.config";
import { AppError } from "../utils/errors";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function checkS3Connection(): Promise<"up" | "down" | "disabled"> {
  if (!s3Config.enabled) return "disabled";

  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: s3Config.bucket }));
    return "up";
  } catch {
    return "down";
  }
}

export async function uploadFile(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ key: string; url: string; storage: "s3" | "local" }> {
  if (s3Config.enabled) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      }),
    );

    const url = s3Config.publicBaseUrl
      ? `${s3Config.publicBaseUrl.replace(/\/$/, "")}/${params.key}`
      : `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${params.key}`;

    return { key: params.key, url, storage: "s3" };
  }

  const localDir = path.resolve(process.cwd(), s3Config.localUploadDir);
  await mkdir(localDir, { recursive: true });
  const filePath = path.join(localDir, params.key.replace(/\//g, path.sep));
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, params.body);

  return {
    key: params.key,
    url: `/uploads/${params.key}`,
    storage: "local",
  };
}

export async function deleteFile(key: string): Promise<void> {
  if (s3Config.enabled) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      }),
    );
    return;
  }

  throw new AppError(400, "Local file delete is not implemented", {
    code: "LOCAL_DELETE_UNSUPPORTED",
  });
}
