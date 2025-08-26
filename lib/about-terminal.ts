// lib/about-terminal.ts — pure command model for the About terminal.
// No React, DOM, store or fetch imports: About.tsx builds the data snapshot,
// this module turns a command into terminal lines + link/effect descriptors,
// and AboutTerminal.tsx applies the effects against the zustand store.
import { parseAbout, type AboutContent, type AboutNow } from "./about";
import { resumeSetting } from "./resume";
import type {
  Experience,
  ProfileContent,
  Project,
  ProjectGroup,
} from "./store";

export type AboutTerminalTone =
  | "default"
  | "name"
  | "dim"
  | "success"
  | "warning"
  | "error"
  | "accent";

export type AboutTerminalLine = {
  text: string;
  tone?: AboutTerminalTone;
};

export type AboutTerminalAction =
  | { kind: "page"; label: string; path: string }
  | { kind: "explorer"; label: string; path: string }
  | {
      kind: "href";
      label: string;
      href: string;
      external?: boolean;
      download?: boolean;
    };

export type AboutTerminalEffect =
  | { kind: "page"; path: string }
  | { kind: "explorer"; path: string };

export type AboutTerminalResult = {
  lines: AboutTerminalLine[];
  actions: AboutTerminalAction[];
  effect?: AboutTerminalEffect;
  clear?: boolean;
};

export type AboutTerminalEntry = {
  id: string;
  command: string;
  lines: AboutTerminalLine[];
  actions: AboutTerminalAction[];
};

export type AboutTerminalEducation = {
  degree: string;
  field: string | null;
  institution: string;
  location: string | null;
  period: string;
  score: string | null;
  summary: string | null;
};

export type AboutTerminalExperience = {
  company: string;
  role: string;
  period: string;
  summary: string | null;
  highlights: string[];
  tags: string[];
  kind: "work" | "hackathon";
  location: string | null;
};

export type AboutTerminalProject = {
  id: string;
  title: string;
  description: string | null;
  highlights: string[];
  tags: string[];
  featured: boolean;
  groupSlug: string | null;
  path: string;
};

export type AboutTerminalProjectGroup = {
  slug: string;
  title: string;
  description: string | null;
  highlights: string[];
  featured: boolean;
  path: string;
  repoCount: number;
};

export type AboutTerminalData = {
  name: string;
  role: string;
  summary: string;
  bio: string;
  location: string;
  availability: string;
  hireable: boolean;
  email: string;
  phone: string;
  focus: string;
  about: AboutContent;
  education: AboutTerminalEducation[];
  experiences: AboutTerminalExperience[];
  skills: { category: string; items: string[] }[];
  socials: { label: string; url: string }[];
  projects: AboutTerminalProject[];
  projectGroups: AboutTerminalProjectGroup[];
  resumeHref: string | null;
  resumeLabel: string;
};

// The command strip is deliberately short; `help` reveals the rest.
export const ABOUT_TERMINAL_HINTS = [
  "about",
  "experience",
  "projects",
  "skills",
  "contact",
  "resume",
  "help",
] as const;

export const ABOUT_COMMAND_NAMES = [
  "help",
  "whoami",
  "about",
  "story",
  "now",
  "principles",
  "beyond",
  "experience",
  "education",
  "projects",
  "skills",
  "contact",
  "resume",
  "open",
  "clear",
] as const;

const HELP_GROUPS = [
  {
    label: "PROFILE",
    commands: [
      ["whoami", "name, role, availability + links"],
      ["about", "the short version"],
      ["story", "the longer version + quote"],
      ["now", "what I'm doing right now"],
      ["principles", "how I work"],
      ["beyond", "outside the editor"],
    ],
  },
  {
    label: "WORK",
    commands: [
      ["experience", "roles + open experience"],
      ["education", "degree + open education"],
      ["projects", "selected work + open projects"],
      ["skills", "stack + open skills"],
    ],
  },
  {
    label: "CONNECT",
    commands: [
      ["contact", "email, phone, location + socials"],
      ["resume", "download the PDF"],
    ],
  },
  {
    label: "TERMINAL",
    commands: [
      ["open <page>", "open a portfolio page"],
      ["help", "this list"],
      ["clear", "clear the transcript"],
    ],
  },
] as const;

const OPEN_PAGES: {
  slug: string;
  label: string;
  aliases: readonly string[];
}[] = [
  {
    slug: "experience",
    label: "Experience",
    aliases: ["experience", "work"],
  },
  {
    slug: "education",
    label: "Education",
    aliases: ["education", "edu"],
  },
  {
    slug: "skills",
    label: "Skills",
    aliases: ["skills", "stack"],
  },
  {
    slug: "hackathons",
    label: "Hackathons",
    aliases: ["hackathons", "hacks"],
  },
  {
    slug: "contact",
    label: "Contact",
    aliases: ["contact", "email"],
  },
  {
    slug: "resume",
    label: "Resume",
    aliases: ["resume", "cv"],
  },
  {
    slug: "certificates",
    label: "Certificates",
    aliases: ["certificates", "certs"],
  },
  {
    slug: "about",
    label: "About",
    aliases: ["about", "home"],
  },
];

const OPEN_PROJECT_ALIASES: readonly string[] = [
  "projects",
  "repos",
  "repositories",
];

// ---------------------------------------------------------------------------
// Data snapshot
// ---------------------------------------------------------------------------
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clip(value: string | null | undefined, max = 180): string {
  const line = oneLine(value);
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const safe = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${safe.trimEnd()}…`;
}

function joined(values: Array<string | null | undefined>, sep = " · "): string {
  return values.map(oneLine).filter(Boolean).join(sep);
}

function isWork(experience: AboutTerminalExperience): boolean {
  return experience.kind === "work";
}

function isHackathon(experience: AboutTerminalExperience): boolean {
  return experience.kind === "hackathon";
}

function educationTitle(education: AboutTerminalEducation): string {
  return joined([education.degree, education.field], ", ");
}

export function buildAboutTerminalData(
  content: ProfileContent | null,
  projects: Project[],
  projectGroups: ProjectGroup[],
  resumeHref: string | null,
): AboutTerminalData | null {
  if (!content) return null;

  const profile = content.profile;
  const data = profile?.data ?? {};
  const resume = resumeSetting(content.settings?.resume);

  return {
    name: profile?.name ?? "Your name",
    role: text(data.role) || "Developer",
    summary: text(data.summary),
    bio: oneLine(profile?.bio),
    location: oneLine(profile?.location),
    availability: text(data.availability),
    hireable: data.hireable !== false,
    email: text(data.email),
    phone: text(data.phone),
    focus: text(data.focus),
    about: parseAbout(profile?.about),
    education: content.education.map((entry) => ({
      degree: entry.degree,
      field: entry.field,
      institution: entry.institution,
      location: entry.location,
      period: entry.period,
      score: entry.score,
      summary: entry.summary,
    })),
    experiences: content.experiences.map((entry: Experience) => ({
      company: entry.company,
      role: entry.role,
      period: entry.period,
      summary: entry.summary,
      highlights: entry.highlights,
      tags: entry.tags,
      kind: entry.kind,
      location: entry.location,
    })),
    skills: content.skills.map((group) => ({
      category: group.category,
      items: group.items,
    })),
    socials: content.socials.map((social) => ({
      label: social.label,
      url: social.url,
    })),
    projects: projects.map((project) => ({
      id: project.id,
      title: project.title_override ?? project.repo_name,
      // /api/projects has already resolved description_override → README →
      // GitHub description; the terminal must not re-implement that order.
      description: project.description,
      highlights: project.highlights,
      tags: project.tags,
      featured: project.featured,
      groupSlug: project.group_slug,
      path: `Projects/${project.repo_owner}/${project.repo_name}`,
    })),
    projectGroups: projectGroups.map((group) => ({
      slug: group.slug,
      title: group.title,
      description: group.description,
      highlights: group.highlights,
      featured: group.featured,
      path: `Projects/${group.slug}`,
      repoCount: projects.filter(
        (project) => project.group_slug === group.slug,
      ).length,
    })),
    resumeHref,
    resumeLabel: oneLine(resume?.label) || "Resume (PDF)",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function terminalUser(name: string): string {
  return (name.trim().split(/\s+/)[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

function availabilityLabel(data: AboutTerminalData): string {
  return data.hireable
    ? data.availability || "Open to work"
    : "Not looking right now";
}

function pageAction(
  label: string,
  path: string,
): AboutTerminalAction {
  return { kind: "page", label, path };
}

function explorerAction(
  label: string,
  path: string,
): AboutTerminalAction {
  return { kind: "explorer", label, path };
}

function hrefAction(
  label: string,
  href: string,
  options: { external?: boolean; download?: boolean } = {},
): AboutTerminalAction {
  return { kind: "href", label, href, ...options };
}

function storyParagraphs(data: AboutTerminalData): string[] {
  if (data.about.story.length) return data.about.story;
  return [data.bio, data.focus].map(oneLine).filter(Boolean);
}

function fallbackNow(data: AboutTerminalData): AboutNow[] {
  const education = data.education[0];
  return [
    data.focus
      ? { label: "Focus", value: data.focus, detail: null }
      : null,
    education
      ? {
          label: "Studying",
          value: educationTitle(education),
          detail: education.institution,
        }
      : null,
    data.availability
      ? { label: "Looking for", value: data.availability, detail: null }
      : null,
  ].filter((item): item is AboutNow => item !== null);
}

function nowItems(data: AboutTerminalData): AboutNow[] {
  return data.about.now.length ? data.about.now : fallbackNow(data);
}

function workExperiences(data: AboutTerminalData): AboutTerminalExperience[] {
  return data.experiences.filter(isWork);
}

function hackathonExperiences(data: AboutTerminalData): AboutTerminalExperience[] {
  return data.experiences.filter(isHackathon);
}

function selectedProjects(data: AboutTerminalData): AboutTerminalProject[] {
  return data.projects
    .filter((project) => project.featured && project.highlights.length > 0)
    .slice(0, 2);
}

function featuredGroup(data: AboutTerminalData): AboutTerminalProjectGroup | null {
  return data.projectGroups.find((group) => group.featured) ?? null;
}

function blank(): AboutTerminalLine {
  return { text: "" };
}

function withTrailingBlank(lines: AboutTerminalLine[]): AboutTerminalLine[] {
  return lines.length && lines[lines.length - 1].text !== ""
    ? [...lines, blank()]
    : lines;
}

function trimTrailingBlank(lines: AboutTerminalLine[]): AboutTerminalLine[] {
  const next = [...lines];
  while (next.length && next[next.length - 1].text === "") next.pop();
  return next;
}

function actionKey(action: AboutTerminalAction): string {
  return action.kind === "href"
    ? `${action.kind}:${action.href}`
    : `${action.kind}:${action.path}`;
}

function uniqueActions(actions: AboutTerminalAction[]): AboutTerminalAction[] {
  const seen = new Set<string>();
  const out: AboutTerminalAction[] = [];
  for (const action of actions) {
    const key = actionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

function openPage(slug: string): AboutTerminalEffect {
  return { kind: "page", path: slug };
}

function openExplorer(path: string): AboutTerminalEffect {
  return { kind: "explorer", path };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function helpCommand(): AboutTerminalResult {
  const lines: AboutTerminalLine[] = [];
  HELP_GROUPS.forEach((group, groupIndex) => {
    if (groupIndex > 0) lines.push(blank());
    lines.push({ text: group.label, tone: "accent" });
    for (const [name, description] of group.commands) {
      lines.push({
        text: `  ${name.padEnd(14)}${description}`,
        tone: "dim",
      });
    }
  });
  lines.push(blank());
  lines.push({
    text: "↑↓ history  ·  Tab complete  ·  Ctrl+L clear",
    tone: "dim",
  });
  return { lines, actions: [] };
}

function whoamiCommand(data: AboutTerminalData): AboutTerminalResult {
  const lines: AboutTerminalLine[] = [
    { text: data.name, tone: "name" },
    {
      text: joined([data.role, data.location]),
    },
  ];
  const headline = data.about.headline || data.summary;
  if (headline) lines.push({ text: headline, tone: "dim" });
  lines.push({
    text: `${data.hireable ? "●" : "○"} ${availabilityLabel(data)}`,
    tone: data.hireable ? "success" : "dim",
  });

  return {
    lines,
    actions: [
      pageAction("open experience", "experience"),
      explorerAction("open projects", "projects"),
      pageAction("open contact", "contact"),
    ],
  };
}

function aboutCommand(data: AboutTerminalData): AboutTerminalResult {
  const headline = data.about.headline || data.summary || data.role;
  const intro = storyParagraphs(data)[0] || data.summary;
  return {
    lines: trimTrailingBlank([
      { text: headline, tone: "name" },
      ...(intro && intro !== headline ? [{ text: intro }] : []),
    ]),
    actions: [
      pageAction("open experience", "experience"),
      explorerAction("open projects", "projects"),
      pageAction("open contact", "contact"),
    ],
  };
}

function storyCommand(data: AboutTerminalData): AboutTerminalResult {
  const paragraphs = storyParagraphs(data);
  if (!paragraphs.length) {
    return { lines: [{ text: "No story added yet.", tone: "dim" }], actions: [] };
  }
  const lines: AboutTerminalLine[] = [];
  paragraphs.forEach((paragraph, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: paragraph });
  });
  if (data.about.quote) {
    lines.push(blank());
    lines.push({ text: `“${data.about.quote}”`, tone: "dim" });
  }
  return {
    lines,
    actions: [
      pageAction("open experience", "experience"),
      explorerAction("open projects", "projects"),
    ],
  };
}

function nowCommand(data: AboutTerminalData): AboutTerminalResult {
  const items = nowItems(data);
  if (!items.length) {
    return {
      lines: [{ text: "Nothing listed under Now yet.", tone: "dim" }],
      actions: [],
    };
  }
  const lines: AboutTerminalLine[] = [];
  items.forEach((item, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: item.label, tone: "dim" });
    lines.push({ text: item.value });
    if (item.detail) lines.push({ text: item.detail, tone: "dim" });
  });
  return { lines, actions: [] };
}

function principlesCommand(data: AboutTerminalData): AboutTerminalResult {
  const principles = data.about.principles;
  if (!principles.length) {
    return {
      lines: [{ text: "No principles added yet.", tone: "dim" }],
      actions: [],
    };
  }
  const lines: AboutTerminalLine[] = [];
  principles.forEach((principle, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: `${index + 1}. ${principle.title}`, tone: "name" });
    lines.push({ text: principle.body });
    if (principle.note) {
      lines.push({ text: principle.note, tone: "dim" });
    }
  });
  return { lines, actions: [] };
}

function beyondCommand(data: AboutTerminalData): AboutTerminalResult {
  const beyond = data.about.beyond;
  if (!beyond.length) {
    return {
      lines: [{ text: "Nothing beyond the editor yet.", tone: "dim" }],
      actions: [],
    };
  }
  const lines: AboutTerminalLine[] = [];
  beyond.forEach((item, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: item.title, tone: "name" });
    lines.push({ text: item.body, tone: "dim" });
  });
  return { lines, actions: [] };
}

function experienceCommand(data: AboutTerminalData): AboutTerminalResult {
  const work = workExperiences(data);
  const hackathons = hackathonExperiences(data);
  if (!work.length && !hackathons.length) {
    return {
      lines: [{ text: "No roles listed yet.", tone: "dim" }],
      actions: [pageAction("open experience", "experience")],
    };
  }

  const lines: AboutTerminalLine[] = [];
  work.forEach((job, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: job.role, tone: "name" });
    lines.push({
      text: joined([job.company, job.period, job.location]),
      tone: "dim",
    });
    if (job.summary) lines.push({ text: job.summary });
    if (job.tags.length) {
      lines.push({ text: job.tags.join(" · "), tone: "dim" });
    }
  });

  if (hackathons.length) {
    if (lines.length) lines.push(blank());
    lines.push({
      text: `${hackathons.length} hackathon build${hackathons.length === 1 ? "" : "s"} · open hackathons`,
      tone: "dim",
    });
  }

  return {
    lines,
    actions: uniqueActions([
      pageAction("open experience", "experience"),
      ...(hackathons.length
        ? [pageAction("open hackathons", "hackathons")]
        : []),
    ]),
  };
}

function educationCommand(data: AboutTerminalData): AboutTerminalResult {
  if (!data.education.length) {
    return {
      lines: [{ text: "No education rows yet.", tone: "dim" }],
      actions: [pageAction("open education", "education")],
    };
  }
  const lines: AboutTerminalLine[] = [];
  data.education.forEach((education, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: educationTitle(education), tone: "name" });
    lines.push({
      text: joined([education.institution, education.period]),
      tone: "dim",
    });
    const meta = joined([education.score, education.location]);
    if (meta) lines.push({ text: meta, tone: "dim" });
    if (education.summary) lines.push({ text: education.summary });
  });
  return {
    lines,
    actions: [pageAction("open education", "education")],
  };
}

function projectsCommand(data: AboutTerminalData): AboutTerminalResult {
  const group = featuredGroup(data);
  const selected = selectedProjects(data);
  if (!group && !selected.length && !data.projects.length) {
    return {
      lines: [{ text: "No projects synced yet.", tone: "dim" }],
      actions: [],
    };
  }

  const lines: AboutTerminalLine[] = [];
  const actions: AboutTerminalAction[] = [];

  if (group) {
    lines.push({ text: group.title, tone: "name" });
    lines.push({
      text: `${group.repoCount} repositor${group.repoCount === 1 ? "y" : "ies"} in this group`,
      tone: "dim",
    });
    if (group.description) {
      lines.push({ text: clip(group.description) });
    }
    group.highlights.slice(0, 2).forEach((highlight) => {
      lines.push({ text: `· ${clip(highlight, 150)}`, tone: "dim" });
    });
    actions.push(explorerAction("open featured work", group.path));
  }

  if (selected.length) {
    if (lines.length) lines.push(blank());
    selected.forEach((project, index) => {
      if (index > 0) lines.push(blank());
      lines.push({ text: project.title, tone: "name" });
      if (project.description) {
        lines.push({ text: clip(project.description) });
      }
      if (project.tags.length) {
        lines.push({ text: project.tags.slice(0, 4).join(" · "), tone: "dim" });
      }
      actions.push(
        explorerAction(`open ${project.title.toLowerCase()}`, project.path),
      );
    });
  }

  lines.push(blank());
  lines.push({
    text:
      data.projects.length === 0
        ? "No repositories synced yet."
        : `${data.projects.length} repositories · open the tree to browse everything`,
    tone: "dim",
  });
  actions.push(explorerAction("open projects", "projects"));

  return { lines, actions: uniqueActions(actions) };
}

function skillsCommand(data: AboutTerminalData): AboutTerminalResult {
  if (!data.skills.length) {
    return {
      lines: [{ text: "No skills listed yet.", tone: "dim" }],
      actions: [pageAction("open skills", "skills")],
    };
  }
  const lines: AboutTerminalLine[] = [];
  data.skills.forEach((group, index) => {
    if (index > 0) lines.push(blank());
    lines.push({ text: group.category, tone: "name" });
    const items = group.items.slice(0, 7);
    const extra = group.items.length - items.length;
    lines.push({
      text: `${items.join(" · ")}${extra > 0 ? ` · +${extra}` : ""}`,
      tone: "dim",
    });
  });
  return {
    lines,
    actions: [pageAction("open skills", "skills")],
  };
}

function contactCommand(data: AboutTerminalData): AboutTerminalResult {
  const lines: AboutTerminalLine[] = [];
  if (data.email) lines.push({ text: `email     ${data.email}` });
  if (data.phone) lines.push({ text: `phone     ${data.phone}` });
  if (data.location) lines.push({ text: `location  ${data.location}` });
  if (data.availability || !data.hireable) {
    lines.push({
      text: `${data.hireable ? "●" : "○"} ${availabilityLabel(data)}`,
      tone: data.hireable ? "success" : "dim",
    });
  }
  if (data.socials.length) {
    lines.push({
      text: `socials   ${data.socials.map((social) => social.label).join(", ")}`,
      tone: "dim",
    });
  }
  if (!lines.length) lines.push({ text: "No contact details listed yet.", tone: "dim" });

  const actions: AboutTerminalAction[] = [];
  if (data.email) {
    actions.push(hrefAction("email me", `mailto:${data.email}`));
  }
  if (data.phone) {
    actions.push(
      hrefAction("call", `tel:${data.phone.replace(/[^\d+]/g, "")}`),
    );
  }
  for (const social of data.socials) {
    actions.push(hrefAction(social.label.toLowerCase(), social.url, { external: true }));
  }

  return { lines, actions: uniqueActions(actions) };
}

function resumeCommand(data: AboutTerminalData): AboutTerminalResult {
  if (data.resumeHref) {
    return {
      lines: [
        { text: data.resumeLabel, tone: "name" },
        { text: "PDF · download only", tone: "dim" },
      ],
      actions: [
        hrefAction("download resume", data.resumeHref, { download: true }),
        pageAction("open resume page", "resume"),
      ],
    };
  }
  return {
    lines: [
      { text: "The resume PDF isn't uploaded yet.", tone: "dim" },
      { text: "The Resume page has the upload command.", tone: "dim" },
    ],
    actions: [pageAction("open resume page", "resume")],
  };
}

function openCommand(argument: string): AboutTerminalResult {
  const value = argument.trim().toLowerCase();
  if (!value) {
    return {
      lines: [
        { text: "usage: open <page>", tone: "warning" },
        {
          text: "pages: about, experience, education, skills, hackathons, contact, resume, certificates",
          tone: "dim",
        },
        { text: "also: open projects", tone: "dim" },
      ],
      actions: [],
    };
  }

  if (OPEN_PROJECT_ALIASES.includes(value)) {
    return {
      lines: [{ text: "Revealing Projects in the Explorer…", tone: "dim" }],
      actions: [],
      effect: openExplorer("projects"),
    };
  }

  const page = OPEN_PAGES.find((entry) => entry.aliases.includes(value));
  if (!page) {
    return {
      lines: [
        { text: `open: unknown page '${value}'`, tone: "error" },
        {
          text: "pages: experience, education, skills, hackathons, contact, resume, certificates, about",
          tone: "dim",
        },
      ],
      actions: [],
    };
  }
  if (page.slug === "about") {
    return {
      lines: [{ text: "You're already in About. Try `help`.", tone: "dim" }],
      actions: [],
    };
  }

  return {
    lines: [{ text: `Opening ${page.label}…`, tone: "dim" }],
    actions: [],
    effect: openPage(page.slug),
  };
}

function findCommand(input: string): string {
  return input.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function runAboutCommand(
  input: string,
  data: AboutTerminalData,
): AboutTerminalResult {
  const raw = input.trim();
  const command = findCommand(raw);
  if (!command) return { lines: [], actions: [] };

  switch (command) {
    case "help":
    case "?":
    case "commands":
      return helpCommand();
    case "whoami":
    case "profile":
      return whoamiCommand(data);
    case "about":
      return aboutCommand(data);
    case "story":
      return storyCommand(data);
    case "now":
      return nowCommand(data);
    case "principles":
      return principlesCommand(data);
    case "beyond":
      return beyondCommand(data);
    case "experience":
    case "work":
      return experienceCommand(data);
    case "education":
    case "edu":
      return educationCommand(data);
    case "projects":
      return projectsCommand(data);
    case "skills":
    case "stack":
      return skillsCommand(data);
    case "contact":
      return contactCommand(data);
    case "resume":
    case "cv":
      return resumeCommand(data);
    case "open":
    case "goto":
      return openCommand(raw.replace(/^(?:open|goto)\s*/i, ""));
    case "clear":
    case "cls":
      return { lines: [], actions: [], clear: true };
    default:
      return {
        lines: [
          {
            text: `command not found: ${command} — type 'help'`,
            tone: "error",
          },
        ],
        actions: [],
      };
  }
}

// ---------------------------------------------------------------------------
// Tab completion
// ---------------------------------------------------------------------------
function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (prefix && !value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function completeToken(prefix: string, candidates: string[]): string {
  const matches = candidates.filter((candidate) =>
    candidate.startsWith(prefix.toLowerCase()),
  );
  if (matches.length === 1) return matches[0];
  return commonPrefix(matches);
}

export function completeAboutInput(input: string): string {
  const leading = input.match(/^\s*/)?.[0] ?? "";
  const value = input.slice(leading.length);
  if (!value) return input;

  if (/^open\s/i.test(value)) {
    const prefix = value.replace(/^open\s/i, "");
    const candidates = [
      ...OPEN_PAGES.flatMap((page) => [...page.aliases]),
      ...OPEN_PROJECT_ALIASES,
    ];
    const completed = completeToken(prefix, candidates);
    if (!completed) return input;
    return `${leading}open ${completed}`;
  }

  if (/\s/.test(value)) return input;

  const completed = completeToken(value, [...ABOUT_COMMAND_NAMES]);
  if (!completed) return input;
  return `${leading}${completed}${completed === "open" ? " " : ""}`;
}
