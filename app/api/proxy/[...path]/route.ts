import { NextRequest, NextResponse } from "next/server";

const DEFAULT_PROXY_TARGET = "https://api.metaquorum.com";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding"
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    path?: string[];
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const upstreamBase = getProxyTarget();
  const targetUrl = buildTargetUrl(upstreamBase, context.params.path ?? [], request);
  const headers = buildForwardHeaders(request.headers);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  const upstreamResponse = await fetch(targetUrl, init);
  const responseHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  const body = await upstreamResponse.arrayBuffer();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: responseHeaders
  });
}

function getProxyTarget(): string {
  const target = process.env.API_PROXY_TARGET || process.env.NEXT_PUBLIC_API_URL || DEFAULT_PROXY_TARGET;
  return target.replace(/\/+$/, "");
}

function buildTargetUrl(base: string, pathSegments: string[], request: NextRequest): URL {
  const joinedPath = pathSegments.map((segment) => encodeURIComponent(segment)).join("/");
  const url = new URL(`${base}/${joinedPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return url;
}

function buildForwardHeaders(incoming: Headers): Headers {
  const headers = new Headers();
  const allowlist = ["accept", "content-type", "authorization", "user-agent"];
  for (const key of allowlist) {
    const value = incoming.get(key);
    if (value) {
      headers.set(key, value);
    }
  }
  return headers;
}
