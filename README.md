# MiTech — Real Price Database

This version keeps the original MiTech design and connects the phone/pricing sections to `prices.json`, generated from `prices.xlsx`.

## Update prices later
1. Edit `prices.xlsx`.
2. Convert it to `prices.json` using the same column structure.
3. Replace `prices.json` in the repository.
4. Commit changes in GitHub.
5. GitHub Pages will serve the updated data.

The site does not read Excel directly; it reads the lightweight JSON file in the same repository.
