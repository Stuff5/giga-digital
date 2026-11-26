/**
 * Cloudflare Worker: Universal CORS Relay Proxy for GameVault
 * 
 * Bypasses browser Cross-Origin (CORS) restrictions for:
 * 1. G2A Merchant API (OAuth2 & Catalog queries)
 * 2. Kinguin B2B Gateway API
 * 3. GG.deals Price Comparison API
 * 
 * How to deploy (100% Free - 100,000 requests/day):
 * 1. Log in to your Cloudflare Dashboard (dash.cloudflare.com).
 * 2. Navigate to "Workers & Pages" -> "Create application" -> "Create Worker".
 * 3. Name your worker (e.g., "gamevault-proxy") and click "Deploy".
 * 4. Click "Edit code", replace everything with this entire file, and click "Save and deploy".
 * 5. Copy your worker URL (e.g. https://gamevault-proxy.yourname.workers.dev/?url=)
 *    and paste it into GameVault Settings -> CORS Proxy / Relay URL!
 */

export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    };

    // Handle browser CORS preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const reqUrl = new URL(request.url);
      let targetUrl = reqUrl.searchParams.get("url");

      if (!targetUrl) {
        // Fallback: check if target URL is passed directly in pathname
        const rawPath = reqUrl.pathname.slice(1);
        if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
          targetUrl = rawPath + reqUrl.search;
        }
      }

      if (!targetUrl) {
        return new Response(
          JSON.stringify({
            error: "Missing target URL parameter.",
            usage: "Append ?url=https://api.g2a.com/... to your worker URL."
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      // Clone headers and remove host/origin headers to prevent SNI/SSL mismatches
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete("host");
      forwardHeaders.delete("origin");
      forwardHeaders.delete("referer");

      const init = {
        method: request.method,
        headers: forwardHeaders,
        redirect: "follow",
      };

      // Forward request body for POST, PUT, PATCH
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.arrayBuffer();
      }

      // Forward request to external destination (G2A, Kinguin, GG.deals)
      const response = await fetch(targetUrl, init);

      // Construct browser-safe response with CORS headers
      const resHeaders = new Headers(response.headers);
      resHeaders.set("Access-Control-Allow-Origin", "*");
      resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
      resHeaders.set("Access-Control-Allow-Headers", "*");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "CORS Proxy Relay Error",
          message: err.message
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
};
