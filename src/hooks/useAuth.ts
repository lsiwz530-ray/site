import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type User = { id: string; username: string };
export type Profile = { id: string; username: string; display_name: string | null };

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data: p } = await supabase.from("profiles").select("id,username,display_name").eq("id", u.id).maybeSingle();
      setProfile(p as Profile | null);
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!r);
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, profile, isAdmin, loading };
}

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")}@north.store`;
}
