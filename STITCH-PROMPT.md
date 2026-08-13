# Stitch AI — Design Prompts

Prompts for designing the User Management Dashboard UI in [Google Stitch](https://stitch.withgoogle.com).
Visual description only — no API, database, or infrastructure detail (Stitch ignores it and
it dilutes the prompt).

**How to use:** paste Prompt 1 first and generate. Then refine with the follow-up prompts
one at a time — Stitch handles focused single-change requests far better than one giant
brief. Keep the design tokens consistent with [DESIGN.md §8](DESIGN.md).

---

## Prompt 1 — Main screen (start here)

```text
Design a web dashboard for a User Management admin panel. Desktop layout, 1440px wide,
clean and professional, similar in feel to Linear or Vercel's dashboard.

Top navigation bar: thin, with the product name "User Management" on the left in
semibold, and a circular avatar plus a theme toggle icon on the right. Below it a page
header row with the title "Users" in large semibold text, a muted one-line subtitle
"Manage your team members and their account status", and a primary blue button labeled
"+ Add User" aligned to the far right.

Below the header, a row of four stat cards with equal width and generous padding. Each
card shows a small uppercase muted label, a large bold number below it, and a small
colored icon in the top right corner. The cards are: Total Users 25, Active 21,
Administrators 3, Developers 12. Cards have a subtle border, rounded 12px corners, white
background, and a very soft shadow.

Below the cards, a filter bar in a single horizontal row: a search input with a magnifier
icon and placeholder "Search by name or email" taking about half the width, then two
compact dropdown selects labeled "All Roles" and "All Status", then a subtle text button
"Clear filters" on the right.

Below that, a data table inside a bordered rounded container. The table header row has a
light gray background with small uppercase letter-spaced column labels: NAME, EMAIL,
ROLE, STATUS, CREATED, and a narrow empty column for actions. Sortable columns show a
small faint up-down arrow icon next to the label.

Each table row shows: a small circular avatar with the person's initials next to their
full name in medium weight, their email address below the name in smaller muted gray
text, a rounded pill badge for role, a rounded pill badge for status, a date like
"14 Aug 2026" in muted text, and a three-dot menu icon at the far right.

Role badges: ADMIN in soft violet background with violet text, DEVELOPER in soft blue
background with blue text, USER in soft gray background with gray text. Status badges:
ACTIVE in soft green background with green text and a small filled dot before the label,
INACTIVE in gray. All badges are small, rounded-full, uppercase, and letter-spaced.

Show 8 rows of realistic sample people with a varied mix of roles and statuses.

Bottom of the table container: a footer row with muted text "Showing 1 to 8 of 25 users"
on the left and pagination controls on the right — a previous chevron, page numbers 1 2 3
with page 1 highlighted in blue, and a next chevron.

Style: light theme, white page background with a very light gray canvas behind the cards,
blue #2563eb as the only accent color, Inter or Geist font, generous whitespace, thin
1px borders in light gray, subtle rounded corners throughout. Minimal and calm — no
gradients, no heavy shadows, no decorative illustrations.
```

---

## Prompt 2 — Add / Edit user modal

```text
Design a centered modal dialog over a dimmed blurred version of the users dashboard.

The modal is about 480px wide with 16px rounded corners, white background, and a soft
shadow. Header row: title "Add New User" in semibold on the left, a small X close icon on
the right, a thin divider below.

Form fields stacked vertically with comfortable spacing. Each field has a small medium-
weight label above its input. Inputs are full width, 40px tall, 8px rounded, with a thin
gray border, and show a blue focus ring when active.

Fields in order:
1. Full Name — text input, placeholder "Ada Lovelace"
2. Email Address — text input, placeholder "ada@example.com"
3. Password — password input with a small eye icon on the right to toggle visibility
4. Role — dropdown select showing Admin, Developer, User
5. Status — a two-option segmented toggle: Active and Inactive, with Active selected and
   filled in green

Show the Email field in an error state: red border, a small red warning icon inside the
right edge of the input, and small red helper text below reading "This email is already
in use".

Footer: a thin divider, then two buttons aligned right — a secondary "Cancel" button with
a gray outline and a white background, and a primary "Create User" button filled blue
with white text.

Match the dashboard style: Inter or Geist font, blue #2563eb accent, thin light gray
borders, minimal and clean.
```

---

## Prompt 3 — Delete confirmation dialog

```text
Design a small centered confirmation dialog, about 400px wide, over a dimmed background.

At the top left, a circular soft-red background containing a red trash icon. Next to it,
the title "Delete user" in semibold. Below, body text in muted gray reading: "Are you
sure you want to delete Ada Lovelace? This action cannot be undone and all of their data
will be permanently removed."

Two buttons aligned right at the bottom: a secondary "Cancel" button with a gray outline,
and a destructive "Delete" button filled in red #dc2626 with white text.

White background, 16px rounded corners, soft shadow, generous padding, same font and
spacing style as the rest of the dashboard.
```

---

## Prompt 4 — Empty and loading states

```text
Design two variations of the users dashboard table area, keeping the header, stat cards,
and filter bar identical to the main screen.

Variation A — empty state. The table container holds a centered vertical stack: a large
muted outline icon of a group of people, a semibold line "No users yet", a smaller muted
line "Get started by adding your first team member", and a primary blue "+ Add User"
button below. Generous vertical padding, everything centered.

Variation B — loading state. The table shows its normal header row, then 6 skeleton
placeholder rows. Each skeleton row has a light gray circle where the avatar goes, two
stacked gray rounded bars of different widths where the name and email go, and shorter
gray rounded pills in the role, status, and date columns. All skeletons are light gray
with soft rounded corners and no text.
```

---

## Prompt 5 — Dark mode

```text
Redesign the main users dashboard screen in dark mode, keeping the exact same layout,
spacing, and component structure.

Page background near-black #0a0a0a, cards and table container in dark gray #171717,
borders in #262626. Primary text near-white #ededed, secondary and muted text in
#a1a1aa. Accent blue brightens to #3b82f6 for the primary button, active page number,
and focus rings.

Badges keep their hue but invert: darker translucent colored backgrounds with brighter
colored text — violet for ADMIN, blue for DEVELOPER, gray for USER, green for ACTIVE,
gray for INACTIVE.

Keep it flat and low-contrast rather than harsh — no pure black text areas, no glowing
effects, no heavy shadows. Borders do the separation work instead of shadows.
```

---

## Prompt 6 — Mobile / responsive (optional)

```text
Design the users dashboard for mobile, 390px wide.

The four stat cards become a 2x2 grid. The search input goes full width with the two
filter dropdowns side by side in a row below it.

Replace the table with a vertical list of cards. Each card shows: a circular avatar with
initials and the full name in medium weight on the first line, the email in smaller muted
text below it, then a row containing the role badge and the status badge side by side,
then the created date in small muted text at the bottom. A three-dot menu icon sits in
the top right corner of each card. Cards have thin borders, 12px rounded corners, and
12px gaps between them.

The "+ Add User" button becomes a circular blue floating action button with a white plus
icon, fixed at the bottom right with a soft shadow.

Same light theme, same colors, same font as the desktop design.
```

---

## Tips for working with Stitch

| Do | Don't |
|---|---|
| Generate Prompt 1, then refine with short follow-ups ("make the badges smaller", "increase row height") | Paste all six prompts at once |
| Name exact hex codes for the accent and background | Say "modern colors" or "nice palette" |
| Ask for realistic sample names and dates | Leave data unspecified — you get "Lorem Ipsum" rows |
| Reference a known product for overall feel ("like Linear") | Reference one for every single element |
| Design light mode first, then ask for the dark variant | Ask for both themes in one prompt |

When a screen looks right, export to Figma from Stitch and hand the Figma link to Claude
Code in Phase 4 — it can read the design directly through the Figma MCP tools and match
spacing, colors, and type against your actual implementation.
