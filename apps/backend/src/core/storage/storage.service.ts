import fs from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

// Load configuration
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;

const isS3Configured = Boolean(
  AWS_ACCESS_KEY_ID &&
  AWS_SECRET_ACCESS_KEY &&
  AWS_S3_BUCKET
);

let s3Client: S3Client | null = null;
if (isS3Configured) {
  console.log("☁️  Initializing AWS S3 Cloud Storage Client...");
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID!,
      secretAccessKey: AWS_SECRET_ACCESS_KEY!,
    },
  });
} else {
  console.log("📁 Local file storage active (S3 env variables not fully configured).");
}

export class StorageService {
  /**
   * Checks if S3 Cloud Storage is active.
   */
  static isS3Enabled(): boolean {
    return isS3Configured;
  }

  /**
   * Uploads a file. If S3 is active, uploads to S3 and unlinks the local file.
   * Returns the file path (S3 key or local relative path) to be stored in DB.
   */
  static async uploadFile(
    localPath: string,
    originalName: string,
    mimeType: string
  ): Promise<string> {
    if (s3Client && AWS_S3_BUCKET) {
      const fileStream = fs.createReadStream(localPath);
      const filename = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const s3Key = `claims/documents/${filename}`;

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: AWS_S3_BUCKET,
            Key: s3Key,
            Body: fileStream,
            ContentType: mimeType,
          })
        );

        // Delete the local file since it's uploaded to S3 successfully
        try {
          fs.unlinkSync(localPath);
        } catch (unlinkErr) {
          console.warn("⚠️ Failed to delete local temp file:", unlinkErr);
        }

        console.log(`☁️ Successfully uploaded file to S3: ${s3Key}`);
        return s3Key;
      } catch (err) {
        console.error("❌ AWS S3 Upload Error. Falling back to local storage:", err);
        return localPath; // fallback
      }
    }

    return localPath;
  }

  /**
   * Retrieves a file. If S3 is enabled and the filePath looks like an S3 key,
   * it returns the S3 stream. Otherwise, it returns a local file stream.
   */
  static async getFileStream(filePath: string): Promise<{
    stream: NodeJS.ReadableStream;
    fromCloud: boolean;
  }> {
    // If it looks like an S3 key and S3 client is initialized
    if (s3Client && AWS_S3_BUCKET && filePath.startsWith("claims/documents/")) {
      try {
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: AWS_S3_BUCKET,
            Key: filePath,
          })
        );

        if (response.Body instanceof Readable) {
          return {
            stream: response.Body,
            fromCloud: true,
          };
        } else {
          throw new Error("S3 Response Body is not a readable stream.");
        }
      } catch (err) {
        console.error("❌ AWS S3 Download Error. Falling back to local check:", err);
      }
    }

    // Fallback to local file stream
    return {
      stream: fs.createReadStream(filePath),
      fromCloud: false,
    };
  }
}
