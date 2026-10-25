# BridgeKit

**Practice BRIDGEGOOD’s philosophy. Pass the learning on.**

BridgeKit is a workshop workspace for facilitators to plan with their community, act on feedback, and share reusable kits. It makes the reasoning behind **Design for Social Good** visible alongside the activities.

[![Build and tests](https://github.com/KuanL1u/bridgekit/actions/workflows/ci.yml/badge.svg)](https://github.com/KuanL1u/bridgekit/actions/workflows/ci.yml)

[The challenge](#the-hackathon-challenge) · [Features](#features) · [Setup](#setup) · [Demo](#try-the-demo)

![BridgeKit workshop dashboard](docs/images/bridgekit-desktop.jpg)

*Screenshots, sample workshops, and included feedback use synthetic demo data.*

<details>
<summary>See the mobile workspace</summary>

<img src="docs/images/bridgekit-mobile.jpg" alt="BridgeKit dashboard on a mobile screen" width="390">

</details>

## The hackathon challenge

The [BRIDGEGOOD challenge brief](https://hackforsocialimpact.notion.site/Scale-BRIDGEGOOD-s-Design-for-Social-Good-philosophy-and-mindset-3f62cb772f1e80f5aed7e0b2626e8bb5) asks how its community can understand, practice, teach, improve, and carry forward Design for Social Good as the organization grows beyond any one person.

BRIDGEGOOD connects design with confidence, access, community, and economic mobility. Its mindset travels through mentorship, relationships, and direct program participation. Scaling it requires preserving community voice, local context, human judgment, and BRIDGEGOOD’s authorship.

BridgeKit offers a **repeatable cycle**: make a plan, listen, explain a decision, and pass the resulting kit to another facilitator. Students, alumni, mentors, volunteers, and community partners can use that kit as a starting point for their own group.

### How BridgeKit addresses the challenge

| Challenge need | Implemented response |
| --- | --- |
| **Explain the philosophy and its reasoning** | A short philosophy guide and source-linked activity explanations make the “why” available with the instructions. |
| **Put the mindset into practice** | Editable activities invite listening, participant-defined success, missing perspectives, and shared decisions. |
| **Respond to community experience** | Optional feedback leads to a facilitator’s choice to change or keep an activity, with a required reason. |
| **Adapt responsibly across communities** | Group context shapes the starter agenda. Activities offer paper, spoken, quiet, and flexible participation options. |
| **Carry knowledge beyond the core team** | Printable guides and importable JSON kits preserve the plan, decisions, and earlier versions for another facilitator. |
| **Keep BRIDGEGOOD connected to the work** | Source references and attribution remain attached to activities and exported kits. |

**Example:** The sample workshop uses a digital idea board. Feedback raises a phone-data barrier. The facilitator can replace it with **Paper-first idea studio**, explain the choice, and share a kit containing both the original and revised plan.

Planning uses deterministic rules. Facilitators make the decisions and record their reasons; personal conversations and relationships remain part of the workshop.

## Features

| Step | What you can do |
| --- | --- |
| **1. Community** | Set the group, goal, duration, materials, languages, and participation needs. |
| **2. Plan** | Create a timed agenda; add, edit, reorder, or remove activities from eight draft templates. Explore instructions, questions, reasoning, sources, and participation alternatives. |
| **3. Listen** | Record barriers, what worked, or new ideas. Respond by adapting an activity or explaining why it should stay. |
| **4. Share** | Review changes and version history, write a handoff note, download a JSON kit, or print a facilitator guide to PDF. |

The workspace also provides:

- **Planning for the group:** paper activities when devices or internet are limited, optional quiet reflection, and time for transitions.
- **Workshop management:** search, status filters, duplication, browser autosave, validated imports, and recovery handling for damaged saved data.
- **Readable layouts:** desktop and mobile views, expandable details, labelled inputs, keyboard focus, and focus-managed dialogs.

## Setup

**Requirements:** Node.js **24**, npm, and a modern browser. The project includes an `.nvmrc`; if you use nvm, run `nvm install` and `nvm use` inside the cloned directory before installing dependencies.

```sh
git clone https://github.com/KuanL1u/bridgekit.git
cd bridgekit
npm ci
npm run dev
```

Open the address printed by Vite, usually `http://127.0.0.1:5173`. It selects another port if that one is busy. To choose a port explicitly:

```sh
npm run dev -- --port 5174
```

The app runs in the browser. Setup requires no API keys, database, or account configuration.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Check TypeScript and build the app into `dist/`. |
| `npm run preview` | Preview an existing production build locally. |
| `npm test` | Run the automated tests once. |
| `npm run test:watch` | Rerun tests while developing. |

For a production preview, run `npm run build`, then `npm run preview`. Both local servers bind to `127.0.0.1`.

Deploy the contents of `dist/` to an HTTPS static host. Hash-based navigation works without application-specific route rewrites.

## Try the demo

1. Open **A more welcoming campus**, included in a new workspace.
2. In **Plan**, expand an activity to explore its instructions and reasoning.
3. In **Listen**, respond to the demo feedback about internet access.
4. Choose **Change activity** and **Paper-first idea studio**. Explain the choice and save.
5. In **Share**, open the before/after instructions and **Version history**.
6. **Download kit**, then **Import kit** to continue it as a new workshop. Use **Print / PDF** for a facilitator guide.

For a completed example, import [`examples/campus-workshop.bridgekit.json`](examples/campus-workshop.bridgekit.json). It includes an original plan, a feedback-led revision, and source attribution. Raw feedback records are excluded.

## Data and privacy

| Location | Contents |
| --- | --- |
| **Browser workspace** | Context, activities, raw feedback, decisions, version history, and handoff notes. |
| **JSON kit** | Context, activities, decisions, history, and attribution. Raw feedback records are excluded. |
| **Printed / PDF kit** | Agenda, instructions, questions, participation alternatives, reasoning, changes, and source references. Raw feedback records are excluded. |

- Handoff notes are excluded from exports by default; the facilitator can choose to include one.
- Decision reasons and edited activity text are shared. Review that wording and leave out names or identifying details.
- Data lives in `localStorage`, scoped to the browser and site address, including the port. Clearing site storage removes the workspace; download a kit to preserve a plan.
- Imports create a new workshop. Raw feedback stays in the originating browser.
- Google Fonts and external source links are used; workshop and feedback records are not uploaded by the app.

Use synthetic, anonymized, or appropriately consented information, as required by the challenge brief.

## Development

**React · TypeScript · Vite · Lucide icons · Vitest**

Typed domain functions handle planning, decisions, snapshots, validation, and exports separately from the UI. Saved versions preserve the agenda and community context at each checkpoint.

```text
src/
  content.ts          Draft activities, principles, and source references
  types.ts            Workshop, feedback, revision, and version models
  workshops.ts        Planning, decisions, versions, import/export, recovery
  workshops.test.ts   Domain and data-handling tests
  App.tsx             State, autosave, navigation, and workshop dashboard
  *Screen.tsx         Community, plan, feedback, and kit views
  ResourceScreens.tsx Activity library and philosophy guide
  ui.tsx              Shared components and focus management
  styles.css          Responsive interface and print layout
examples/             A portable demo kit
```

The **15 automated tests** cover timing, participation adaptations, independent activity copies, preserved versions, facilitator decisions, export exclusions, JSON round trips, invalid imports, and storage recovery.

Browser verification has covered workshop creation, adaptation, export/import, reload persistence, desktop/mobile layouts, keyboard focus, and printing. GitHub Actions runs `npm ci`, tests, and the production build on pushes and pull requests.

## MVP scope and next steps

The current MVP supports one facilitator in one browser. Feedback is entered locally; shared participant sessions, accounts, and cloud synchronization are future work. Starter content is in English. Language settings provide preparation guidance; facilitators arrange translations with their group.

Next priorities:

1. Review the draft activities and interpretations with BRIDGEGOOD.
2. Pilot a workshop and handoff with facilitators and consenting participants.
3. Add community-reviewed translations and participation formats.
4. Explore shared sessions with deliberate control over what gets passed on.

A pilot should test whether another facilitator can explain the reasoning and use a kit independently, whether feedback leads to useful decisions, and whether participants can choose how to take part. Community outcomes have not yet been measured.

## Sources and attribution

BridgeKit draws from the [challenge brief](https://hackforsocialimpact.notion.site/Scale-BRIDGEGOOD-s-Design-for-Social-Good-philosophy-and-mindset-3f62cb772f1e80f5aed7e0b2626e8bb5) and [BRIDGEGOOD Hack Pack](https://docs.google.com/document/d/1RK9JY_EJEvHTPLNIVF1-QuuEcHhxa3cfWzgVimuUcnA/edit), especially guidance on community feedback, confidence and individual definitions of success, understanding people, accessibility, and consent.

Activities are **draft hackathon adaptations**, not official BRIDGEGOOD program materials. Keep [BRIDGEGOOD’s](https://bridgegood.com/about) authorship, source references, and the reasoning behind local changes connected to each kit as it travels.
