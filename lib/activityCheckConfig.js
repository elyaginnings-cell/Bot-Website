/** Normalize Activity Check settings from website dashboard → bot */

export function defaultActivityCheckConfig() {
  return {
    enabled: true,
    staffRoleIds: [],
    managerRoleId: null,
    channelId: null,
    durationMinutes: 15,
    showConfirmedInLive: true,
  };
}

export function normalizeActivityCheck(patch, current) {
  const cur = current && typeof current === "object" ? current : {};
  const p = patch && typeof patch === "object" ? patch : {};
  const out = { ...defaultActivityCheckConfig(), ...cur };

  if (p.enabled !== undefined) out.enabled = !!p.enabled;
  if (p.showConfirmedInLive !== undefined) out.showConfirmedInLive = !!p.showConfirmedInLive;

  if (p.managerRoleId !== undefined) out.managerRoleId = p.managerRoleId || null;
  if (p.channelId !== undefined) out.channelId = p.channelId || null;

  if (p.durationMinutes !== undefined) {
    const d = Number(p.durationMinutes);
    const allowed = [5, 10, 15, 30, 60];
    out.durationMinutes = allowed.includes(d) ? d : Math.max(1, Math.min(180, Math.floor(d) || 15));
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
