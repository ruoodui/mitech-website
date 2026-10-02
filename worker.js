export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const allowedOrigins = new Set([
      "https://mitechiraq.com",
      "https://www.mitechiraq.com",
      "https://ruoodui.github.io",
      "https://mitech-website.eng-mohammede-me.workers.dev"
    ]);
    const requestOrigin = request.headers.get("Origin") || "";
    const corsOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : "https://mitechiraq.com";

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };

    // =========================
    // CORS PREFLIGHT
    // =========================
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

      // التحقق من رمز الإدارة
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

      // تنظيف بيانات الأجهزة
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

      // =========================
      // READ CURRENT PRICES
      // =========================

      const g = await fetch(api, {
        headers: githubHeaders
      });

      if (!g.ok) {
        return json(
          {
            error: "تعذر قراءة prices.json من GitHub"
          },
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
              atob(
                cur.content.replace(/\n/g, "")
              )
            )
          )
        );
      } catch {
        old = null;
      }

      // =========================
      // BUILD NEW PRICES FILE
      // =========================
      //
      // دائماً نخزن بالشكل:
      //
      // {
      //   phones: [...],
      //   updatedAt: "19/08/2026"
      // }
      //

      const updatedAt =
        p.updatedAt ||
        new Date().toLocaleDateString("en-GB", {
          timeZone: "Asia/Baghdad"
        });

      const out = {
        ...(old &&
        !Array.isArray(old) &&
        typeof old === "object"
          ? old
          : {}),

        phones,

        updatedAt
      };

      // =========================
      // ENCODE JSON
      // =========================

      const content = btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(out, null, 2)
          )
        )
      );

      // =========================
      // UPDATE GITHUB
      // =========================

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
              `Update phone prices - ${updatedAt}`,

            content,

            sha: cur.sha,

            branch
          })
        }
      );

      if (!put.ok) {
        return json(
          {
            error: "GitHub رفض تحديث الأسعار"
          },
          502,
          corsHeaders
        );
      }

      // =========================
      // SUCCESS
      // =========================

      return json(
        {
          ok: true,
          count: phones.length,
          updatedAt
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
          {
            error: "تعذر تحميل الأسعار"
          },
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

        return new Response(
          decoded,
          {
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
          }
        );

      } catch {

        return json(
          {
            error: "ملف الأسعار غير صالح"
          },
          502,
          corsHeaders
        );
      }
    }

    // =========================
    // REVIEWS API
    // =========================
    //
    // Reviews are stored in the same GitHub repository as:
    // reviews.json
    //
    // GET    /api/reviews
    // POST   /api/reviews
    // DELETE /api/reviews
    //

    if (url.pathname === "/api/reviews") {
      const repo = "ruoodui/mitech-website";
      const path = "reviews.json";
      const branch = "main";

      const api =
        `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;

      const githubHeaders = {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MiTech-Reviews-Admin"
      };

      // Public read
      if (request.method === "GET") {
        const r = await fetch(api, { headers: githubHeaders });

        if (!r.ok) {
          return json(
            { error: "تعذر تحميل المراجعات" },
            502,
            corsHeaders
          );
        }

        const data = await r.json();

        try {
          const decoded = decodeURIComponent(
            escape(
              atob(data.content.replace(/\n/g, ""))
            )
          );

          return new Response(decoded, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
              "Pragma": "no-cache",
              "Expires": "0"
            }
          });
        } catch {
          return json(
            { error: "ملف المراجعات غير صالح" },
            502,
            corsHeaders
          );
        }
      }

      // Admin only for write operations
      if (request.method !== "POST" && request.method !== "DELETE") {
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

      // Read current reviews from GitHub.
      const g = await fetch(api, { headers: githubHeaders });

      let currentSha = null;
      let reviews = [];

      if (g.ok) {
        const cur = await g.json();
        currentSha = cur.sha;

        try {
          reviews = JSON.parse(
            decodeURIComponent(
              escape(
                atob(cur.content.replace(/\n/g, ""))
              )
            )
          );

          if (!Array.isArray(reviews)) {
            reviews = Array.isArray(reviews.reviews)
              ? reviews.reviews
              : [];
          }
        } catch {
          reviews = [];
        }
      } else if (g.status !== 404) {
        return json(
          { error: "تعذر قراءة reviews.json من GitHub" },
          502,
          corsHeaders
        );
      }

      if (request.method === "POST") {
        let item;

        try {
          item = await request.json();
        } catch {
          return json(
            { error: "بيانات المراجعة غير صالحة" },
            400,
            corsHeaders
          );
        }

        const title = String(item.title ?? "").trim();
        const youtube = String(item.youtube ?? "").trim();

        if (!title || !youtube) {
          return json(
            { error: "العنوان ورابط YouTube مطلوبان" },
            400,
            corsHeaders
          );
        }

        const review = {
          title,
          youtube,
          device: String(item.device ?? "").trim(),
          description: String(item.description ?? "").trim(),
          date: String(item.date ?? "").trim()
        };

        reviews.unshift(review);
      }

      if (request.method === "DELETE") {
        let item;

        try {
          item = await request.json();
        } catch {
          return json(
            { error: "بيانات الحذف غير صالحة" },
            400,
            corsHeaders
          );
        }

        const youtube = String(item.youtube ?? "").trim();
        const title = String(item.title ?? "").trim();

        const before = reviews.length;

        reviews = reviews.filter(r => {
          const sameYoutube =
            youtube && String(r.youtube ?? "").trim() === youtube;
          const sameTitle =
            title && String(r.title ?? "").trim() === title;

          return !(sameYoutube || sameTitle);
        });

        if (reviews.length === before) {
          return json(
            { error: "المراجعة غير موجودة" },
            404,
            corsHeaders
          );
        }
      }

      const content = btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify(reviews, null, 2)
          )
        )
      );

      const body = {
        message:
          request.method === "POST"
            ? `Add review - ${new Date().toISOString()}`
            : `Delete review - ${new Date().toISOString()}`,
        content,
        branch
      };

      if (currentSha) {
        body.sha = currentSha;
      }

      const put = await fetch(
        `https://api.github.com/repos/${repo}/contents/${path}`,
        {
          method: "PUT",
          headers: {
            ...githubHeaders,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );

      if (!put.ok) {
        const errText = await put.text();
        console.error("GitHub reviews update failed:", errText);

        return json(
          { error: "GitHub رفض تحديث المراجعات" },
          502,
          corsHeaders
        );
      }

      return json(
        {
          ok: true,
          count: reviews.length,
          reviews
        },
        200,
        corsHeaders
      );
    }


    // =========================
    // EXHIBITIONS API
    // =========================
    if (url.pathname === "/api/exhibitions") {
      const repo = "ruoodui/mitech-website";
      const path = "exhibitions.json";
      const branch = "main";
      const api = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
      const githubHeaders = {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "MiTech-Exhibitions-Admin"
      };
      const readFile = async () => {
        const r = await fetch(api,{headers:githubHeaders});
        if (r.status === 404) return {sha:null, data:[]};
        if (!r.ok) throw new Error("تعذر قراءة exhibitions.json من GitHub");
        const c = await r.json();
        let data=[];
        try { data=JSON.parse(decodeURIComponent(escape(atob(c.content.replace(/\n/g,""))))); } catch {}
        if (!Array.isArray(data)) data=Array.isArray(data.exhibitions)?data.exhibitions:[];
        return {sha:c.sha,data};
      };
      try {
        const current = await readFile();
        if (request.method === "GET") return json({exhibitions:current.data},200,corsHeaders);
        if (request.method !== "POST" && request.method !== "DELETE") return json({error:"Method not allowed"},405,corsHeaders);
        if (request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) return json({error:"رمز الإدارة غير صحيح"},401,corsHeaders);
        const p=await request.json();
        let data=current.data;
        if (request.method === "POST" && p.action === "add-exhibition") {
          const title=String(p.title||"").trim(), slug=String(p.slug||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");
          if(!title||!slug) return json({error:"اسم المعرض وSlug مطلوبان"},400,corsHeaders);
          if(data.some(x=>x.slug===slug)) return json({error:"هذا الـSlug موجود مسبقاً"},409,corsHeaders);
          let cover=String(p.cover||"").trim();
          if(String(p.coverData||"").startsWith('data:image/')){
            const m=String(p.coverData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if(!m) return json({error:"صورة الغلاف غير صالحة"},400,corsHeaders);
            const ext=(String(p.coverFilename||"cover.jpg").split('.').pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"").toLowerCase()||"jpg";
            const safe=(title.replace(/[^a-zA-Z0-9\u0600-\u06ff._-]/g,"_").slice(0,70)||"cover");
            const coverPath=`media/exhibitions/${slug}/cover-${Date.now()}-${safe}.${ext}`;
            const putCover=await fetch(`https://api.github.com/repos/${repo}/contents/${coverPath}`,{method:'PUT',headers:{...githubHeaders,'Content-Type':'application/json'},body:JSON.stringify({message:`Add exhibition cover - ${slug}`,content:m[2],branch})});
            if(!putCover.ok) return json({error:"فشل رفع صورة غلاف المعرض إلى GitHub"},502,corsHeaders);
            cover=`https://raw.githubusercontent.com/${repo}/${branch}/${coverPath}`;
          }
          data.unshift({title,slug,location:String(p.location||"").trim(),date:String(p.date||"").trim(),status:String(p.status||"COVERAGE").trim(),cover,description:String(p.description||"").trim(),media:[]});
        } else if (request.method === "POST" && p.action === "update-exhibition") {
          const oldSlug=String(p.oldSlug||"").trim();
          const title=String(p.title||"").trim();
          const slug=String(p.slug||"").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"");
          if(!oldSlug||!title||!slug) return json({error:"اسم المعرض وSlug مطلوبان"},400,corsHeaders);
          const x=data.find(v=>v.slug===oldSlug);
          if(!x) return json({error:"المعرض غير موجود"},404,corsHeaders);
          if(slug!==oldSlug && data.some(v=>v.slug===slug)) return json({error:"هذا الـSlug موجود مسبقاً"},409,corsHeaders);
          x.title=title;
          x.slug=slug;
          x.location=String(p.location||"").trim();
          x.date=String(p.date||"").trim();
          x.status=String(p.status||"COVERAGE").trim();
          let cover=String(p.cover||"").trim();
          if(String(p.coverData||"").startsWith('data:image/')){
            const m=String(p.coverData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
            if(!m) return json({error:"صورة الغلاف غير صالحة"},400,corsHeaders);
            const ext=(String(p.coverFilename||"cover.jpg").split('.').pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"").toLowerCase()||"jpg";
            const safe=(title.replace(/[^a-zA-Z0-9\u0600-\u06ff._-]/g,"_").slice(0,70)||"cover");
            const coverPath=`media/exhibitions/${slug}/cover-${Date.now()}-${safe}.${ext}`;
            const putCover=await fetch(`https://api.github.com/repos/${repo}/contents/${coverPath}`,{method:'PUT',headers:{...githubHeaders,'Content-Type':'application/json'},body:JSON.stringify({message:`Update exhibition cover - ${slug}`,content:m[2],branch})});
            if(!putCover.ok) return json({error:"فشل رفع صورة غلاف المعرض إلى GitHub"},502,corsHeaders);
            cover=`https://raw.githubusercontent.com/${repo}/${branch}/${coverPath}`;
          }
          x.cover=cover;
          x.description=String(p.description||"").trim();
          x.media=Array.isArray(x.media)?x.media:[];
        } else if (request.method === "POST" && p.action === "add-media") {
          const x=data.find(v=>v.slug===String(p.slug||"")); if(!x) return json({error:"المعرض غير موجود"},404,corsHeaders);
          const type=String(p.type||""); if(type!=="image"&&type!=="video") return json({error:"نوع المحتوى غير صالح"},400,corsHeaders);
          let media={type,title:String(p.title||"").trim(),url:""};
          if(type==="video") { media.url=String(p.url||"").trim(); if(!media.url) return json({error:"رابط الفيديو مطلوب"},400,corsHeaders); }
          else { const dataUrl=String(p.data||""); if(!dataUrl.startsWith("data:image/")) return json({error:"ملف الصورة غير صالح"},400,corsHeaders); const m=dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/); if(!m) return json({error:"الصورة غير صالحة"},400,corsHeaders); const ext=(String(p.filename||"image.jpg").split(".").pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"").toLowerCase()||"jpg"; const safe=(String(p.filename||"image").replace(/[^a-zA-Z0-9._-]/g,"_").replace(/\.[^.]+$/,""))||"image"; const mediaPath=`media/exhibitions/${x.slug}/${Date.now()}-${safe}.${ext}`; const bin=m[2]; const put=await fetch(`https://api.github.com/repos/${repo}/contents/${mediaPath}`,{method:"PUT",headers:{...githubHeaders,"Content-Type":"application/json"},body:JSON.stringify({message:`Add exhibition image - ${x.slug}`,content:bin,branch})}); if(!put.ok) return json({error:"فشل رفع الصورة إلى GitHub"},502,corsHeaders); media.url=`https://raw.githubusercontent.com/${repo}/${branch}/${mediaPath}`; }
          x.media=x.media||[]; x.media.unshift(media);
        } else if (request.method === "DELETE" && p.action === "delete-exhibition") {
          const before=data.length; data=data.filter(x=>x.slug!==String(p.slug||"")); if(data.length===before) return json({error:"المعرض غير موجود"},404,corsHeaders);
        } else if (request.method === "DELETE" && p.action === "delete-media") {
          const x=data.find(v=>v.slug===String(p.slug||"")); if(!x) return json({error:"المعرض غير موجود"},404,corsHeaders); const i=Number(p.index); if(!Number.isInteger(i)||i<0||i>=(x.media||[]).length) return json({error:"المحتوى غير موجود"},404,corsHeaders); x.media.splice(i,1);
        } else return json({error:"طلب غير معروف"},400,corsHeaders);
        const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
        const body={message:`Update exhibitions - ${new Date().toISOString()}`,content,branch}; if(current.sha) body.sha=current.sha;
        const put=await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{method:"PUT",headers:{...githubHeaders,"Content-Type":"application/json"},body:JSON.stringify(body)});
        if(!put.ok) return json({error:"GitHub رفض تحديث المعارض"},502,corsHeaders);
        return json({ok:true,exhibitions:data},200,corsHeaders);
      } catch(e) { return json({error:e.message||"فشل API المعارض"},500,corsHeaders); }
    }



    // =========================
    // AI ARTICLE WRITER
    // =========================
    if (url.pathname === "/api/ai/generate-article") {
      if (request.method !== "POST") return json({error:"Method not allowed"},405,corsHeaders);
      if (request.headers.get("X-Admin-Key") !== env.ADMIN_KEY) return json({error:"رمز الإدارة غير صحيح"},401,corsHeaders);
      if (!env.OPENAI_API_KEY) return json({error:"OPENAI_API_KEY غير مضبوط في Cloudflare Secrets"},500,corsHeaders);

      let p;
      try { p = await request.json(); } catch { return json({error:"بيانات غير صالحة"},400,corsHeaders); }
      const type = String(p.type || "news");
      const titleHint = String(p.titleHint || "").trim();
      const company = String(p.company || "").trim();
      const product = String(p.product || "").trim();
      const notes = String(p.notes || "").trim();
      const exhibition = String(p.exhibition || "").trim();
      const imageData = String(p.imageData || "").trim();
      if (!imageData.startsWith("data:image/")) return json({error:"ارفع صورة أولاً"},400,corsHeaders);
      if (imageData.length > 10 * 1024 * 1024) return json({error:"الصورة كبيرة جداً للتوليد. استخدم صورة أقل من 7MB تقريباً."},413,corsHeaders);

      const kind = type === "exhibition" ? "تغطية معرض" : "خبر تقني";
      const context = [
        `نوع المحتوى: ${kind}`,
        company && `الشركة: ${company}`,
        product && `المنتج: ${product}`,
        exhibition && `المعرض: ${exhibition}`,
        titleHint && `فكرة/عنوان مبدئي: ${titleHint}`,
        notes && `ملاحظات من المحرر: ${notes}`
      ].filter(Boolean).join("\n");

      const prompt = `أنت محرر أخبار تقنية لموقع M.iTech، وتكتب بالعربية بأسلوب صحفي تقني واضح ومختصر ومناسب للقارئ العراقي والعربي.\n\n${context}\n\nحلل الصورة المرفقة كمرجع بصري فقط. لا تخترع مواصفات أو أسعاراً أو تواريخ أو تصريحات غير ظاهرة في الصورة أو غير مذكورة في معلومات المحرر. إذا كانت معلومة غير مؤكدة، صغها بحذر أو اتركها. لا تنسب اقتباسات لأشخاص.\n\nأنشئ مسودة قابلة للمراجعة قبل النشر، وأعد JSON فقط بدون Markdown أو code fences بالشكل التالي:\n{\n  "title":"عنوان عربي جذاب ودقيق",\n  "excerpt":"ملخص من جملة أو جملتين",\n  "content":"مقال عربي من 5 إلى 8 فقرات قصيرة، مع عناوين فرعية عند الحاجة",\n  "seoTitle":"عنوان SEO قصير",\n  "seoDescription":"وصف SEO من 140 إلى 160 حرفاً تقريباً",\n  "tags":["تقنية","..."]\n}`;

      const ai = await fetch("https://api.openai.com/v1/responses", {
        method:"POST",
        headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6-luna",
          input:[{role:"user",content:[
            {type:"input_text",text:prompt},
            {type:"input_image",image_url:imageData}
          ]}],
          max_output_tokens: 2200
        })
      });
      const raw = await ai.text();
      if (!ai.ok) {
        let msg="فشل الاتصال بالذكاء الاصطناعي";
        try { const e=JSON.parse(raw); msg=e.error?.message||msg; } catch {}
        return json({error:msg},502,corsHeaders);
      }
      let out;
      try { out=JSON.parse(raw); } catch { return json({error:"استجابة AI غير صالحة"},502,corsHeaders); }
      let text=String(out.output_text||"").trim();
      if (!text && Array.isArray(out.output)) {
        for (const item of out.output) for (const c of (item.content||[])) if (c.type==="output_text") text += c.text || "";
      }
      text=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
      let article;
      try { article=JSON.parse(text); } catch { return json({error:"AI لم يرجع JSON صالح",raw:text.slice(0,4000)},502,corsHeaders); }
      return json({ok:true,article},200,corsHeaders);
    }

    // =========================
    // ARTICLES API
    // =========================
    if (url.pathname === "/api/articles") {
      const repo="ruoodui/mitech-website", path="articles.json", branch="main";
      const api=`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
      const githubHeaders={"Authorization":`Bearer ${env.GITHUB_TOKEN}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"MiTech-Articles-Admin"};
      const read=async()=>{const r=await fetch(api,{headers:githubHeaders});if(r.status===404)return {sha:null,data:[]};if(!r.ok)throw Error("تعذر قراءة articles.json من GitHub");const c=await r.json();let data=[];try{data=JSON.parse(decodeURIComponent(escape(atob(c.content.replace(/\n/g,"")))))}catch{}if(!Array.isArray(data))data=Array.isArray(data.articles)?data.articles:[];return {sha:c.sha,data};};
      try {
        const current=await read();
        if(request.method==="GET") {
          const slug=String(url.searchParams.get("slug")||"").trim();
          const id=String(url.searchParams.get("id")||"").trim();
          const published=url.searchParams.get("published");
          const type=String(url.searchParams.get("type")||"").trim();
          const exhibitionSlug=String(url.searchParams.get("exhibitionSlug")||"").trim();
          const limit=Math.min(Math.max(Number(url.searchParams.get("limit")||0)||0,0),50);
          if(slug || id) {
            const article=current.data.find(a => (slug && String(a.slug||"")===slug) || (id && String(a.id||"")===id));
            if(!article) return json({error:"المقال غير موجود"},404,corsHeaders);
            return json({article},200,corsHeaders);
          }
          let list=current.data.slice();
          if(published!==null) list=list.filter(a => published==="true" ? a.published===true : a.published!==true);
          if(type) list=list.filter(a => String(a.type||"")===type);
          if(exhibitionSlug) list=list.filter(a => String(a.exhibitionSlug||"")===exhibitionSlug);
          list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
          if(limit) list=list.slice(0,limit);
          return json({articles:list},200,corsHeaders);
        }
        if(request.method!=="POST"&&request.method!=="DELETE") return json({error:"Method not allowed"},405,corsHeaders);
        if(request.headers.get("X-Admin-Key")!==env.ADMIN_KEY) return json({error:"رمز الإدارة غير صحيح"},401,corsHeaders);
        const p=await request.json(); let data=current.data;
        if(request.method==="POST"){
          if(String(p.action||"")==="update-article") {
            const id=String(p.id||"").trim();
            const item=data.find(a=>a.id===id);
            if(!item) return json({error:"المقال غير موجود"},404,corsHeaders);
            const fields=["title","excerpt","content","seoTitle","seoDescription"];
            for(const k of fields) if(p[k]!==undefined) item[k]=String(p[k]||"").trim();
            if(Array.isArray(p.tags)) item.tags=p.tags.map(x=>String(x).trim()).filter(Boolean);
            if(Array.isArray(p.socialLinks)) item.socialLinks=p.socialLinks.map(x=>({platform:String(x?.platform||"").trim().toLowerCase(),url:String(x?.url||"").trim()})).filter(x=>x.url && ["instagram","tiktok","youtube"].includes(x.platform));
            if(p.type!==undefined) item.type=String(p.type||"news").trim()==="exhibition"?"exhibition":"news";
            if(p.exhibitionSlug!==undefined) item.exhibitionSlug=String(p.exhibitionSlug||"").trim();
            if(item.type!=="exhibition") item.exhibitionSlug="";
            if(p.published!==undefined) item.published=Boolean(p.published);
          } else {
          const title=String(p.title||"").trim(), slug=String(p.slug||title).trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,"-").replace(/^-+|-+$/g,"") || `article-${Date.now()}`;
          if(!title) return json({error:"العنوان مطلوب"},400,corsHeaders);
          if(data.some(a=>a.slug===slug)) return json({error:"هذا المقال موجود مسبقاً"},409,corsHeaders);
          let imageUrl=String(p.imageUrl||"").trim();
          if(String(p.imageData||"").startsWith("data:image/")){
            const m=String(p.imageData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/); if(!m)return json({error:"الصورة غير صالحة"},400,corsHeaders);
            const ext=(String(p.filename||"image.jpg").split(".").pop()||"jpg").replace(/[^a-zA-Z0-9]/g,"").toLowerCase()||"jpg";
            const safe=(title.replace(/[^a-zA-Z0-9\u0600-\u06ff._-]/g,"_").slice(0,80)||"article");
            const mediaPath=`media/articles/${Date.now()}-${safe}.${ext}`;
            const putImg=await fetch(`https://api.github.com/repos/${repo}/contents/${mediaPath}`,{method:"PUT",headers:{...githubHeaders,"Content-Type":"application/json"},body:JSON.stringify({message:`Add article image - ${title}`,content:m[2],branch})});
            if(!putImg.ok)return json({error:"فشل رفع صورة المقال إلى GitHub"},502,corsHeaders);
            imageUrl=`https://raw.githubusercontent.com/${repo}/${branch}/${mediaPath}`;
          }
          const article={id:crypto.randomUUID(),slug,title,excerpt:String(p.excerpt||"").trim(),content:String(p.content||"").trim(),seoTitle:String(p.seoTitle||title).trim(),seoDescription:String(p.seoDescription||"").trim(),tags:Array.isArray(p.tags)?p.tags:[],socialLinks:Array.isArray(p.socialLinks)?p.socialLinks.map(x=>({platform:String(x?.platform||"").trim().toLowerCase(),url:String(x?.url||"").trim()})).filter(x=>x.url && ["instagram","tiktok","youtube"].includes(x.platform)):[],image:imageUrl,type:String(p.type||"news"),exhibitionSlug:String(p.exhibitionSlug||"").trim(),createdAt:new Date().toISOString(),published:p.published!==false};
          data.unshift(article);
          }
        } else {
          const id=String(p.id||""); const before=data.length; data=data.filter(a=>a.id!==id); if(data.length===before)return json({error:"المقال غير موجود"},404,corsHeaders);
        }
        const content=btoa(unescape(encodeURIComponent(JSON.stringify(data,null,2))));
        const body={message:`Update articles - ${new Date().toISOString()}`,content,branch};if(current.sha)body.sha=current.sha;
        const put=await fetch(`https://api.github.com/repos/${repo}/contents/${path}`,{method:"PUT",headers:{...githubHeaders,"Content-Type":"application/json"},body:JSON.stringify(body)});
        if(!put.ok)return json({error:"GitHub رفض تحديث المقالات"},502,corsHeaders);
        return json({ok:true,articles:data},200,corsHeaders);
      }catch(e){return json({error:e.message||"فشل API المقالات"},500,corsHeaders)}
    }

    // =========================
    // WEBSITE ASSETS
    // =========================

    return env.ASSETS.fetch(request);
  }
};


// =========================
// JSON RESPONSE HELPER
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
