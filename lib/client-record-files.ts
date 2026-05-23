import { utapi } from "@/lib/uploadthing-server";

/**
 * Uses UploadThing API so "Presigned GET Default Expiration" from the dashboard applies.
 * `generateSignedURL` signs locally and does not read that setting (SDK default ~5 min).
 * Requires paid plan + private ACL on the file route.
 */
export async function getClientRecordFileSignedUrl(fileKey: string): Promise<string> {
  const key = fileKey.trim();
  if (!key) throw new Error("Missing file key");
  const { ufsUrl } = await utapi.getSignedURL(key);
  return ufsUrl;
}

export async function attachSignedUrls<
  T extends { fileKey: string },
>(files: T[]): Promise<(T & { signedUrl: string | null })[]> {
  return Promise.all(
    files.map(async (file) => {
      try {
        const signedUrl = await getClientRecordFileSignedUrl(file.fileKey);
        return { ...file, signedUrl };
      } catch {
        return { ...file, signedUrl: null };
      }
    })
  );
}
