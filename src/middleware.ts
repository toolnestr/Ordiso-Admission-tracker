import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Using the classic `middleware.ts` convention (not Next 16's `proxy.ts`)
// on purpose: proxy always runs on the Node runtime, but Cloudflare via
// OpenNext only supports Edge middleware. middleware.ts runs on Edge, and
// Supabase SSR is fetch-based so it works there unchanged.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
