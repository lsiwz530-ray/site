import { useEffect, useState } from "react";

export type User = { 
  id: string; 
  username: string 
};

export type Profile = { 
  id: string; 
  username: string; 
  display_name: string | null 
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (!data.user) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      } else {
        setUser(data.user);
        setProfile(data.profile);
        setIsAdmin(data.isAdmin);
      }
    } catch (e) {
      console.error("Auth error:", e);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  return { 
    user, 
    profile, 
    isAdmin, 
    loading,
    refresh: loadUser
  };
}
