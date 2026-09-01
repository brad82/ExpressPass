import { optionalEnv, requiredBoolEnv, requiredEnv } from "./env.js";

export type S3Config = {
  awsRegion: string;
  s3Endpoint: string | undefined;
  s3ForcePathStyle: boolean;
  s3AccessKeyId: string | undefined;
  s3SecretAccessKey: string | undefined;
  s3ConsignmentBucket: string;
};

export function s3Config(): S3Config {
  const s3Endpoint = optionalEnv("S3_ENDPOINT");
  return {
    awsRegion: requiredEnv("AWS_REGION"),
    s3Endpoint,
    s3ForcePathStyle: requiredBoolEnv("S3_FORCE_PATH_STYLE"),
    s3AccessKeyId: s3Endpoint ? requiredEnv("AWS_ACCESS_KEY_ID") : undefined,
    s3SecretAccessKey: s3Endpoint
      ? requiredEnv("AWS_SECRET_ACCESS_KEY")
      : undefined,
    s3ConsignmentBucket: requiredEnv("S3_CONSIGNMENT_BUCKET"),
  };
}
