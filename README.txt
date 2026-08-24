MiTech website — updated package

Upload these website files to GitHub Pages:
- index.html
- phones.html
- reviews.html
- videos.html
- exhibitions.html
- exhibition.html
- news.html
- contact.html
- admin.html
- style.css
- site.js
- exhibitions.json

Deploy worker.js to the existing Cloudflare Worker.

Removed from the website navigation/page:
- prices.html
- prices.css

Dashboard:
- /admin
- Reviews: add/delete YouTube reviews.
- Exhibitions: add/delete IFA, GITEX, etc.
- Media: upload exhibition images or add YouTube videos.

Important:
- Dynamic reviews/exhibitions are loaded from the Cloudflare Worker API so they work from GitHub Pages.
- Do not replace reviews.json with an empty file; it is managed by the worker.
