import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

try {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    const undici = eval("require('undici')");
    const dns = eval("require('dns')");
    const agent = new undici.Agent({
      connect: {
        lookup: (hostname: string, options: any, callback: any) => {
          if (hostname === "ygbtrapskuguoagegftn.supabase.co") {
            // Force IPv4 address to fix ENETUNREACH on broken IPv6 networks
            callback(null, [{ address: "172.64.149.246", family: 4 }]);
          } else {
            dns.lookup(hostname, options, callback);
          }
        },
      },
    });
    undici.setGlobalDispatcher(agent);
  }
} catch (e) {
  console.warn("Could not set IPv4 fetch dispatcher", e);
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
