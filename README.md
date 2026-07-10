# Budget Power-Up for Trello

A per-card budgeting tool that lives on the back of every card. Set an approved budget and hourly rate, log time against tasks, track expenses (hotel, meals, travel, vendors, materials), watch a color-coded meter burn down, and export everything to CSV.

## Features

- **Card-back "Budget" section** — all tracking happens inside the card itself
- **Time logging** — description + hours; cost is computed from your hourly rate and snapshotted at entry time (changing the rate later won't rewrite history)
- **Expense tracking** — category, description, and amount
- **Visual budget meter** — green under 50% used, yellow at 50%, orange at 80%, red at/over 100%, with threshold tick marks
- **Card-front badge** — remaining budget shown on the board view, color-coded to match
- **CSV export** — full ledger plus budget/spent/remaining summary, opens cleanly in Excel

## Hosting

The Power-Up is static files only — no server code. Host it anywhere with HTTPS:

**GitHub Pages (free):** create a repo, push these files, enable Pages in repo Settings → Pages → deploy from branch. Your URL will be `https://<username>.github.io/<repo>/`.

**Netlify / Vercel (free):** drag the folder into the dashboard, done.

## Registering with Trello

1. Go to https://trello.com/power-ups/admin
2. Click **New** and fill in:
   - **Name:** Budget (or whatever you like)
   - **Workspace:** the workspace where you'll use it
   - **Iframe connector URL:** your hosted URL ending in `/index.html` (or just `/` if index.html is the root)
3. Under **Capabilities**, enable: `card-back-section` and `card-badges`
4. Open a board in that workspace → **Power-Ups** → **Custom** → add your Power-Up
5. Open any card — the Budget section appears at the bottom of the card back

The Power-Up stays private to your workspace unless you choose to publish it.

## Storage notes

Data is stored per-card in Trello's `pluginData` (shared scope), so budgets travel with the card and are visible to everyone on the board. Trello caps this storage at roughly 4KB per card, which is comfortably ~40–60 entries. If a card fills up, export to CSV and delete old entries.

## Files

| File | Purpose |
|---|---|
| `index.html` | Connector page Trello loads |
| `client.js` | Registers capabilities (section + badge) |
| `section.html` | Card-back section UI |
| `section.js` | Section logic, storage, CSV export |
| `styles.css` | Styling, incl. dark mode |
| `icon.svg` | Section icon |
