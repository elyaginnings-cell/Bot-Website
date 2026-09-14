/** Normalize Activity Check settings from website dashboard → bot */

export function defaultActivityCheckConfig() {
  return {
    enabled: true,
    staffRoleIds: [],
    managerRoleId: null,
    channelId: null,
    durationHours: 24,
    durationMinutes: 24 * 60,
    showConfirmedInLive: true,
  };
}

const ALLOWED_HOURS = [12, 18, 24, 36, 48];

export function normalizeActivityCheck(patch, current) {
  const cur = current && typeof current === "object" ? current : {};
  const p = patch && typeof patch === "object" ? patch : {};
  const out = { ...defaultActivityCheckConfig(), ...cur };

  if (p.enabled !== undefined) out.enabled = !!p.enabled;
  if (p.showConfirmedInLive !== undefined) out.showConfirmedInLive = !!p.showConfirmedInLive;

  if (p.managerRoleId !== undefined) out.managerRoleId = p.managerRoleId || null;
  if (p.channelId !== undefined) out.channelId = p.channelId || null;

  // Prefer durationHours (new). Fall back to durationMinutes for older saves.
  if (p.durationHours !== undefined) {
    const h = Number(p.durationHours);
    const hours = ALLOWED_HOURS.includes(h)
      ? h
      : Math.max(12, Math.min(48, Math.floor(h) || 24));
    out.durationHours = hours;
    out.durationMinutes = hours * 60;
  } else if (p.durationMinutes !== undefined) {
    const m = Number(p.durationMinutes);
    // If value looks like legacy short minutes (< 12h), treat as minutes and clamp to hours range
    if (Number.isFinite(m) && m > 0) {
      const asHours = m >= 12 * 60 ? Math.round(m / 60) : m; // already hours if small? no - legacy was 5-60 min
      let hours;
      if (m <= 180) {
        // legacy minute presets → map into hour range (default 24h)
        hours = 24;
      } else {
        hours = Math.max(12, Math.min(48, Math.round(m / 60)));
      }
      if (!ALLOWED_HOURS.includes(hours)) {
        hours = ALLOWED_HOURS.reduce((best, x) =>
          Math.abs(x - hours) < Math.abs(best - hours) ? x : best
        );
      }
      out.durationHours = hours;
      out.durationMinutes = hours * 60;
    }
  }

  // Always keep minutes in sync with hours
  if (out.durationHours != null) {
    out.durationMinutes = Number(out.durationHours) * 60;
  }

  if (Array.isArray(p.staffRoleIds)) {
    out.staffRoleIds = p.staffRoleIds.map(String).filter(Boolean).slice(0, 20);
  }
  if (p.staffRoleId !== undefined && p.staffRoleId) {
    const id = String(p.staffRoleId);
    if (!out.staffRoleIds.includes(id)) {
      out.staffRoleIds = [...out.staffRoleIds, id].slice(0, 20);
    }
  }
  if (p.clearStaffRoles) out.staffRoleIds = [];

  return out;
}
