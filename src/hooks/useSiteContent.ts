import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSiteContent<T = any>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    supabase.from("site_content").select("value").eq("key", key).maybeSingle().then(({ data }) => {
      if (data?.value) setValue(data.value as T);
    });
  }, [key]);
  return value;
}
