// middleware.ts (Next.js Edge Middleware)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Use existing correlation ID header or generate a new UUID
  const correlationId =
    request.headers.get("x-correlation-id") ?? crypto.randomUUID();

  // Propagate downstream by adding to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-correlation-id", correlationId);

  // Create response and also set header for client visibility
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-correlation-id", correlationId);

  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
