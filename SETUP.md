# Habby Interior — Decap CMS Setup Guide

This turns the static site into one where Habby Interior can update the logo,
hero photo, service images, and portfolio projects themselves at `/admin`,
with zero code editing.

## 1. What changed and why

**Scope, as agreed:** only what already exists on the live page is CMS-managed —
hero image, the 3 photographic service cards, the logo, and the 6 portfolio
projects. The "Studio" section stayed text-only and no Gallery/Testimonials
sections were added, since none exist on the current page.

**Modified:** `index.html` — one addition, nothing else touched: a
`hydrateFromCMS()` function that fetches CMS content and swaps it into the
existing DOM elements (by their existing classes — no markup changed).

`style.css` and `a.png` are byte-for-byte unchanged. No layout, animation,
typography, or color was touched. (An earlier draft of this project added
Netlify Identity widget scripts here for login redirects — those have since
been removed since auth now runs through DecapBridge, see section 2.)

**New files:**
```
admin/index.html         → loads the Decap CMS admin app
admin/config.yml          → defines what the client can edit
content/homepage.json     → hero/service/logo content (edited via CMS)
content/projects/*.json   → one file per project (edited via CMS)
scripts/build-content.js  → combines the project files into one JSON at build time
netlify.toml               → tells Netlify to run that build script
.gitignore                 → excludes the generated /data folder from git
```

**Why a build script:** Decap writes one file per project, but a plain static
site (no framework) can't ask a browser to "list a folder." `scripts/build-content.js`
runs automatically on every Netlify deploy, reads every file in
`content/projects/`, and writes a single `data/projects.json` that the
homepage fetches with one request. This is a ~60-line Node script with zero
dependencies — not a framework.

**Why the site still works if the CMS has never been touched:** `index.html`
keeps its original hardcoded content. `hydrateFromCMS()` only *overwrites*
that content if the fetch succeeds. Nothing can break the live site by being
absent or malformed — worst case, it silently shows the original content.

## 2. Authentication: DecapBridge (not Netlify Identity / Git Gateway)

Netlify Identity and Netlify's own Git Gateway are both officially
deprecated — new setups aren't recommended, and Netlify no longer fixes
bugs in either. Netlify's suggested replacement (Auth0) only covers login;
it doesn't replace the Git-write proxy, so it isn't a drop-in fix.

Instead this project uses **DecapBridge** (decapbridge.com) — a free,
purpose-built replacement whose Git Gateway component is a direct fork of
Netlify's own open-source git-gateway project, just hosted multi-tenant
instead of by Netlify. It's what Decap CMS's own community migrated to for
this exact gap.

**How it works:**
- Habby logs into `/admin` with an email + password (or Google/Microsoft,
  if you enable that later) — no GitHub account needed.
- That login is verified by DecapBridge's hosted auth API.
- When Habby clicks Publish, DecapBridge's hosted Git Gateway makes the
  actual commit to your GitHub repo, using a GitHub access token *you*
  generate once and store in the DecapBridge dashboard — it's never in your
  code or visible to the client.
- GitHub → Netlify webhook → build → deploy, exactly as before. Netlify's
  role is now purely hosting + running the build script — it has no part
  in authentication anymore.

**Setting up DecapBridge:**

1. Go to [decapbridge.com](https://decapbridge.com) → create a free account.
2. Dashboard → **Add a site**:
   - **Git provider:** GitHub
   - **Git repository:** `your-username/habby-interior`
   - **Git access token:** create one at
     [github.com/settings/tokens](https://github.com/settings/tokens) —
     use a **fine-grained token**, scoped to only this repository, with
     read + write access to **Contents** (that's the only permission
     needed since this config uses `publish_mode: simple`, not the
     editorial workflow).
   - **Decap CMS login URL:** `https://<your-netlify-site>.netlify.app/admin/index.html`
   - **Auth type:** Classic (plain email/password login — simplest for a
     non-technical client; you can switch to Google/Microsoft SSO later
     from the DecapBridge dashboard with no code changes)
3. Click **Create site**. DecapBridge shows you the `repo`, `identity_url`,
   and `gateway_url` values for your site.
4. Open `admin/config.yml` in this project and replace the two `TODO`
   placeholders (`YOUR-GITHUB-USERNAME/habby-interior` and the
   `identity_url` site ID) with the real values DecapBridge gave you.
   Commit and push.

No API keys or secrets appear anywhere in these project files — the GitHub
token lives only in your DecapBridge account settings.

**Worth knowing before you commit to this long-term:** DecapBridge is a
third-party service, not something you run yourself, so you're trusting
their uptime the same way you were previously trusting Netlify's. If that
ever becomes a concern, DecapBridge also publishes self-hosting docs for
running the same components yourself — nothing here locks you in.

## 3. GitHub setup

```bash
cd habby-interior
git init
git add .
git commit -m "Add Decap CMS integration"
git branch -M main
git remote add origin https://github.com/<your-username>/habby-interior.git
git push -u origin main
```

If this is an existing repo, just copy these new files into it, commit, and push.

## 4. Netlify setup

1. **New site from Git** → connect the GitHub repo → select the `main` branch.
2. Build settings (should auto-fill from `netlify.toml`, verify anyway):
   - Build command: `node scripts/build-content.js`
   - Publish directory: `.` (repo root)
3. Deploy. Confirm the site loads and looks identical to before.
4. In `admin/config.yml`, replace the `site_url` / `display_url` placeholder
   lines with your real Netlify URL, commit, and push.

That's it on the Netlify side — **Identity and Git Gateway do not need to be
enabled.** Authentication is entirely handled by DecapBridge (section 2).

## 5. Adding the first Habby Interior admin user

1. DecapBridge dashboard → your site → **Manage collaborators.**
2. Enter the client's email address → send invite.
3. They'll receive an email with a setup link.
4. Clicking it lets them set a password (or connect Google/Microsoft if
   you've enabled that auth type) — no GitHub account involved at any point.
5. New invitees join as **Collaborators** (can log in and edit content).
   Promote to **Admin** in the same dashboard if they should also be able
   to invite others — optional, and only available on DecapBridge's paid
   tiers, so Collaborator is fine for most single-client setups.

Invite yourself the same way first, to test everything below before handing
it off.

## 6. How the client logs in

1. Go to `yoursite.netlify.app/admin`
2. Enter the email + password set up in step 5 above, directly in the
   Decap CMS login screen.
3. They land on the CMS dashboard: **Homepage** and **Projects** in the
   left sidebar — nothing else, no developer settings visible.

## 7. How they replace an image

1. `/admin` → **Homepage** → **Homepage Images**
2. Click the field they want to change (e.g. "Hero Background Image")
3. Click the image preview → **Choose an image** → select a file from
   their computer or phone
4. Scroll up, click **Publish** (top right)

That commit triggers a Netlify rebuild automatically — the new image is
live in roughly 1–2 minutes.

## 8. How they add a new project

1. `/admin` → **Projects** → **New Projects**
2. Fill in: Project Title, Category (dropdown), Cover Image, Image
   Description, Display Order (a number — lower shows first)
3. Leave **Published** switched on
4. **Publish**

To remove a project from the site without deleting it, they can just switch
**Published** off and republish. To delete it permanently, they delete the
entry from the Projects list.

## 9. How they publish changes

Every save in Decap is a real Git commit. The **Publish** button commits
directly to `main` (this repo uses `publish_mode: simple`, no draft/review
queue). Netlify picks up the push, reruns the build script, and redeploys —
watch progress on the Netlify dashboard under **Deploys**.

## 10. Testing before handoff

Run through this checklist yourself before giving the client the login:

1. `node scripts/build-content.js` locally — confirms it runs cleanly and
   produces `data/projects.json`.
2. Serve the folder locally (`npx serve .` or `python3 -m http.server`) and
   confirm the homepage still looks identical to the original.
3. Deploy to Netlify, confirm the live site matches.
4. Invite yourself via DecapBridge, log into `/admin`, and:
   - Change the hero image → Publish → confirm it updates live after rebuild
   - Add a test project → Publish → confirm it appears in the portfolio grid
   - Toggle a project's Published switch off → confirm it disappears
   - Delete the test project when done
5. Only then invite the actual client.

## 11. Troubleshooting

**"Failed to load config.yml" on `/admin`**
`admin/config.yml` isn't reachable — check it deployed (Netlify serves the
whole repo as static files by default, so this usually means a typo in the
file path or it wasn't committed).

**Login screen shows an error / won't load**
Check the `identity_url` and `gateway_url` values in `admin/config.yml`
against exactly what's shown in your DecapBridge site dashboard — a typo'd
site ID is the most common cause.

**Client logs in fine but Publish fails / commit doesn't land on GitHub**
The GitHub access token stored in DecapBridge has expired, was revoked, or
doesn't have Contents read/write on the right repo — regenerate it in
GitHub settings and update it in the DecapBridge dashboard (not in any
project file).

**Client saves a change but the live site doesn't update**
Check Netlify → Deploys — if the build shows a red "failed" status, click
into it for the error (most often a bad edit produced invalid JSON, though
the CMS's own form fields make that hard to do by accident). If the build
succeeded but content still looks old, hard-refresh — the fetches in
`hydrateFromCMS()` are set to bypass cache, but browser/CDN caching of
`index.html` itself can occasionally lag by a minute.

**New project doesn't show up in the portfolio grid**
Check its **Published** switch is on, and confirm the Netlify build log shows
`[build-content] Wrote N project(s)` with the expected count.

**Client accidentally deletes something important**
Every change is a Git commit — nothing is unrecoverable. From the GitHub
repo's commit history, revert the specific commit, push, and Netlify
redeploys the previous state.
