// scripts/upload-resume.mjs — upload the resume PDF to the public `resumes`
// bucket and point site_settings.resume at it using @supabase/supabase-js.
// The PDF never lives in git (private/ is ignored).
//
// Usage: node scripts/upload-resume.mjs
// Reads .env or .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function readEnv() {
  const env = { ...process.env };
  for (const name of [".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && m[2].trim()) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

const env = readEnv();
let url = env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  url = url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env or .env.local");
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

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const { data: uploadData, error: uploadError } = await supabase.storage
  .from("resumes")
  .upload(objectName, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });

if (uploadError) {
  throw new Error(`Upload failed: ${uploadError.message}`);
}

const { data: pubData } = supabase.storage
  .from("resumes")
  .getPublicUrl(objectName);

const publicUrl = pubData.publicUrl;
const downloadUrl = `${publicUrl}?download=${encodeURIComponent(label)}`;
const value = {
  path: objectName,
  label,
  updated_at: new Date().toISOString().slice(0, 10),
};

const { error: dbError } = await supabase
  .from("site_settings")
  .upsert({ key: "resume", value });

if (dbError) {
  throw new Error(`site_settings update failed: ${dbError.message}`);
}

console.log(`public:   ${publicUrl}`);
console.log(`download: ${downloadUrl}`);
console.log(`setting:  ${JSON.stringify(value)}`);
console.log("Resume uploaded successfully!");
