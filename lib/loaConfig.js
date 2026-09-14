/** Normalize LOA settings from website dashboard → bot_runtime / guild_config */

export function defaultLoaConfig() {
  return {
    enabled: true,
    staffRoleIds: [],
    managerRoleIds: [],
    reviewChannelId: null,
    logChannelId: null,
    onLeaveRoleId: null,
    autoApproveHours: 24,
    emergencyEnabled: true,
    immediateThresholdMinutes: 15,
  };
}

export function normalizeLoa(patch, current) {
  const cur = current && typeof current === "object" ? current : {};
  const p = patch && typeof patch === "object" ? patch : {};
  const out = { ...defaultLoaConfig(), ...cur };

  if (p.enabled !== undefined) out.enabled = !!p.enabled;
  if (p.emergencyEnabled !== undefined) out.emergencyEnabled = !!p.emergencyEnabled;

  if (p.reviewChannelId !== undefined) out.reviewChannelId = p.reviewChannelId || null;
  if (p.logChannelId !== undefined) out.logChannelId = p.logChannelId || null;
  if (p.onLeaveRoleId !== undefined) out.onLeaveRoleId = p.onLeaveRoleId || null;

  if (p.autoApproveHours !== undefined) {
    const h = Number(p.autoApproveHours);
    out.autoApproveHours = Number.isFinite(h)
      ? Math.max(1, Math.min(168, Math.floor(h)))
      : 24;
  }
  if (p.immediateThresholdMinutes !== undefined) {
    const m = Number(p.immediateThresholdMinutes);
    out.immediateThresholdMinutes = Number.isFinite(m)
      ? Math.max(0, Math.min(120, Math.floor(m)))
      : 15;
  }

  if (Array.isArray(p.staffRoleIds)) {
    out.staffRoleIds = p.staffRoleIds.map(String).filter(Boolean).slice(0, 20);
  }
  if (Array.isArray(p.managerRoleIds)) {
    out.managerRoleIds = p.managerRoleIds.map(String).filter(Boolean).slice(0, 20);
  }
  // Convenience: single role fields from UI
  if (p.staffRoleId !== undefined && p.staffRoleId) {
    const id = String(p.staffRoleId);
    if (!out.staffRoleIds.includes(id)) out.staffRoleIds = [...out.staffRoleIds, id].slice(0, 20);
  }
  if (p.managerRoleId !== undefined && p.managerRoleId) {
    const id = String(p.managerRoleId);
    if (!out.managerRoleIds.includes(id)) out.managerRoleIds = [...out.managerRoleIds, id].slice(0, 20);
  }
  if (p.clearStaffRoles) out.staffRoleIds = [];
  if (p.clearManagerRoles) out.managerRoleIds = [];

  return out;
}
