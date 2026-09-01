import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ConsignmentExport } from "@expresspass/shared";
import { config } from "../config/index.js";
import {
  checksumPayload,
  recordOutboxExport,
} from "../repositories/integrations.js";

const s3 = new S3Client({
  region: config.awsRegion,
  endpoint: config.s3Endpoint,
  forcePathStyle: config.s3ForcePathStyle,
  credentials:
    config.s3AccessKeyId && config.s3SecretAccessKey
      ? {
          accessKeyId: config.s3AccessKeyId,
          secretAccessKey: config.s3SecretAccessKey,
        }
      : undefined,
});

export async function writeConsignmentExport(
  payload: ConsignmentExport,
): Promise<string> {
  const key = `consignments/${payload.consignmentId}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  const checksum = checksumPayload(payload);

  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3ConsignmentBucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      Metadata: {
        consignmentId: payload.consignmentId,
        checksum,
      },
    }),
  );

  await recordOutboxExport(payload.consignmentId, key, checksum);
  return key;
}
