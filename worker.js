export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://ruoodui.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
      "Access-Control-Max-Age": "86400"
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================
    // UPDATE PRICES
    // =========================
    if (url.pathname === "/api/update-prices") {

      if (request.method !== "POST") {
        return json(
          { error: "Method not allowed" },
          405,
          corsHeaders
        );
      }

      if (request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) {
        return json(
          { error: "رمز الإدارة غير صحيح" },
          401,
          corsHeaders
        );
      }

      let p;

      try {
        p = await request.json();
      } catch {
        return json(
          { error: "بيانات غير صالحة" },
          400,
          corsHeaders
        );
      }

      if (!Array.isArray(p.phones) || !p.phones.length) {
        return json(
          { error: "لا توجد أجهزة" },
          400,
          corsHeaders
        );
      }

      const phones = p.phones
        .map(x => ({
          name: String(x.name ?? "").trim(),
          ram: String(x.ram ?? "").trim(),
          price: x.price ?? "",
          brand: String(x.brand ?? "").trim(),
          store: String(x.store ?? "").trim(),
          address: String(x.address ?? "").trim()
        }))
        .filter(x => x.name);

      const repo = "ruoodui/mitech-website";
      const path = "prices.json";
      const branch = "main";

      const api =
        `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

      const githubHeaders = {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MiTech-Price-Admin"
      };

      // قراءة prices.json الحالي من GitHub
      const g = await fetch(api, {
        headers: githubHeaders
      });

      if (!g.ok) {
        return json(
          { error: "تعذر قراءة prices.json من GitHub" },
          502,
          corsHeaders
        );
      }

      const cur = await g.json();

      let old = null;

      try {
        old = JSON.parse(
          decodeURIComponent(
            escape(
              atob(cur.content.replace(/\n/g, ""))
            )
          )
        );
      } catch {}

      const out = Array.isArray(old)
        ? phones
        : {
            ...(old && typeof old === "object" ? old : {}),
            phones,
            updatedAt:
              p.updatedAt ||
              new Date().toISOString().slice(0, 10)
          };

      const content = btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(out, null, 2)
          )
        )
      );

      // تحديث prices.json على GitHub
      const put = await fetch(
        `https://api.github.com/repos/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            ...githubHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message:
              `Update phone prices - ${p.updatedAt || "today"}`,
            content,
            sha: cur.sha,
            branch
          })
        }
      );

      if (!put.ok) {
        return json(
          { error: "GitHub رفض تحديث الأسعار" },
          502,
          corsHeaders
        );
      }

      return json(
        {
          ok: true,
          count: phones.length,
          updatedAt:
            p.updatedAt ||
            new Date().toISOString().slice(0, 10)
        },
        200,
        corsHeaders
      );
    }

    // =========================
    // GET PRICES.JSON
    // =========================
    if (url.pathname === "/prices.json") {

      const repo = "ruoodui/mitech-website";
      const path = "prices.json";
      const branch = "main";

      const api =
        `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

      const githubHeaders = {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MiTech-Website"
      };

      const r = await fetch(api, {
        headers: githubHeaders
      });

      if (!r.ok) {
        return json(
          { error: "تعذر تحميل الأسعار" },
          502,
          corsHeaders
        );
      }

      const data = await r.json();

      try {

        const decoded = decodeURIComponent(
          escape(
            atob(
              data.content.replace(/\n/g, "")
            )
          )
        );

        return new Response(decoded, {
          status: 200,
          headers: {
            ...corsHeaders,

            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store, no-cache, must-revalidate, proxy-revalidate",

            "Pragma": "no-cache",

            "Expires": "0"
          }
        });

      } catch {

        return json(
          { error: "ملف الأسعار غير صالح" },
          502,
          corsHeaders
        );
      }
    }

    // =========================
    // WEBSITE FILES
    // =========================
    return env.ASSETS.fetch(request);
  }
};


// =========================
// JSON RESPONSE
// =========================
function json(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...extraHeaders
      }
    }
  );
}
