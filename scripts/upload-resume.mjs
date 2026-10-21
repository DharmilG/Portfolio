// scripts/upload-resume.mjs — upload the resume PDF to the public `resumes`
// bucket and point site_settings.resume at it. The PDF never lives in git
// (private/ is ignored): this script is the only path from disk to the web.
//
// Usage: node scripts/upload-resume.mjs
// Reads .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
// Works against the local stack and, by swapping the env values, against the
// cloud project — the same public URL shape in both.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readEnv() {
  const file = path.join(ROOT, ".env.local");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
}

const file =
  process.env.RESUME_FILE ??
  path.join(ROOT, "private", "Dharmil_Gajjar_Resume_Latest.pdf");
const objectName =
  process.env.RESUME_OBJECT ?? "Dharmil_Gajjar_Resume.pdf";
const label =
  process.env.RESUME_LABEL ?? "Dharmil_Gajjar_Resume.pdf";

if (!fs.existsSync(file)) {
  throw new Error(`Resume PDF not found: ${file}`);
}

const bytes = fs.readFileSync(file);
console.log(`uploading ${path.basename(file)} (${bytes.length} bytes) -> ${objectName}`);

const upload = await fetch(`${url}/storage/v1/object/resumes/${encodeURIComponent(objectName)}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/pdf",
    "x-upsert": "true",
    "cache-control": "3600",
  },
  body: bytes,
});

if (!upload.ok) {
  throw new Error(`upload failed ${upload.status}: ${await upload.text()}`);
}

const publicUrl = `${url}/storage/v1/object/public/resumes/${encodeURIComponent(objectName)}`;
const downloadUrl = `${publicUrl}?download=${encodeURIComponent(label)}`;
const value = {
  path: objectName,
  label,
  updated_at: new Date().toISOString().slice(0, 10),
};

const save = await fetch(`${url}/rest/v1/site_settings?key=eq.resume`, {
  method: "PATCH",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({ value }),
});

if (!save.ok) {
  throw new Error(`site_settings update failed ${save.status}: ${await save.text()}`);
}

console.log(`public:   ${publicUrl}`);
console.log(`download: ${downloadUrl}`);
console.log(`setting:  ${JSON.stringify(value)}`);
