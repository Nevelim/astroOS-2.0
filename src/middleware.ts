/**
 * Next.js middleware — rate limiting + security headers для всех /api/* routes.
 * Clean Architecture: Infrastructure cross-cutting concern.
 * Защита под нагрузкой 500k: per-IP sliding window rate limiting.
 */
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp, getRateLimitStats } from "@/infrastructure/security/RateLimiter";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting только для API
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const result = rateLimit(ip, pathname);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMITED",
          retryAfter: result.retryAfter,
          resetAt: new Date(result.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter ?? 60),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetAt),
            ...SECURITY_HEADERS,
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));

    // Security headers
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Security headers для всех остальных запросов
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg).*)"],
};
