import { supabase } from "@/integrations/supabase/client";

export async function signedUrl(bucket: string, path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function publicUrlFor(bucket: string, path: string | null | undefined): Promise<string | null> {
  return signedUrl(bucket, path);
}
