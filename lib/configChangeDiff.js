const OMIT = /(?:token|secret|password|authorization|api.?key|message.?content|raw.?content)/i;

function display(value) {
  if (value === undefined) return "(not set)";
  if (value === null || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (Array.isArray(value)) return value.length ? value.map(x => x && typeof x === "object" ? (x.name || x.label || x.id || JSON.stringify(x)) : String(x)).join(", ").slice(0, 280) : "(none)";
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 280);
  return String(value).slice(0, 280);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.keys(value).sort().reduce((out, key) => {
    if (!OMIT.test(key)) out[key] = stable(value[key]);
    return out;
  }, {});
  return value;
}

export function diffConfig(before, after, max = 40) {
  const changes = [];
  const walk = (a, b, path) => {
    if (changes.length >= max || JSON.stringify(stable(a)) === JSON.stringify(stable(b))) return;
    const ao = a && typeof a === "object" && !Array.isArray(a);
    const bo = b && typeof b === "object" && !Array.isArray(b);
    if (ao && bo) {
      for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
        if (OMIT.test(key) || key.startsWith("_")) continue;
        walk(a[key], b[key], path ? path + "." + key : key);
        if (changes.length >= max) break;
      }
      return;
    }
    if (!path || OMIT.test(path)) return;
    changes.push({ path, before: display(a), after: display(b) });
  };
  walk(before || {}, after || {}, "");
  return changes;
}
