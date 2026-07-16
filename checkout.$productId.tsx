export async function signedUrl(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/uploads/")) return path;
  return `/uploads/${bucket}/${path}`;
}

export async function publicUrlFor(bucket: string, path: string | null | undefined): Promise<string | null> {
  return signedUrl(bucket, path);
}
