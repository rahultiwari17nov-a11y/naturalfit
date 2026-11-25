const serverless = require("serverless-http");
const { createApp } = require("../../server.cjs");

let cachedHandler = null;

async function getHandler() {
  if (!cachedHandler) {
    const app = await createApp({ skipStartupCheck: true, serverless: true });
    cachedHandler = serverless(app);
  }
  return cachedHandler;
}

function normalizeNetlifyPath(rawPath) {
  if (!rawPath) return "/api";
  let p = String(rawPath);
  if (p.startsWith("/.netlify/functions/api")) {
    p = p.slice("/.netlify/functions/api".length) || "/";
  }
  if (!p.startsWith("/")) p = "/" + p;
  if (p === "/") return "/api";
  if (!p.startsWith("/api/") && p !== "/api") {
    p = "/api" + p;
  }
  return p;
}

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  const normalizedPath = normalizeNetlifyPath(
    event.path || (event.rawUrl ? event.rawUrl.replace(/^https?:\/\/[^/]+/, "").split("?")[0] : "") || "/api"
  );

  const normalizedEvent = {
    ...event,
    path: normalizedPath
  };

  if (normalizedEvent.requestContext && normalizedEvent.requestContext.http) {
    normalizedEvent.requestContext = {
      ...normalizedEvent.requestContext,
      http: {
        ...normalizedEvent.requestContext.http,
        path: normalizedPath
      }
    };
  }

  const fnHandler = await getHandler();
  return fnHandler(normalizedEvent, context);
};
