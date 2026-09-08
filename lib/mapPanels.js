import crypto from "crypto";

export function mapSelfRolePanels(panels, patch = {}) {
  return (panels || [])
    .filter((panel) => panel && typeof panel === "object")
    .slice(0, 10)
    .map((panel) => {
      const categoryIds = Array.isArray(panel.categoryIds)
        ? panel.categoryIds.map((id) => String(id)).slice(0, 15)
        : [];
      let includes = [];
      if (Array.isArray(panel.includes) && panel.includes.length) {
        includes = panel.includes
          .filter((item) => item && typeof item === "object")
          .slice(0, 40)
          .map((item) =>
            item.type === "sub" || item.subId
              ? { type: "sub", catId: String(item.catId || ""), subId: String(item.subId || "") }
              : { type: "cat", id: String(item.id || item.catId || "") }
          )
          .filter((item) => (item.type === "cat" ? item.id : item.catId && item.subId));
      } else {
        includes = categoryIds.map((id) => ({ type: "cat", id }));
      }
      return {
        id: String(panel.id || crypto.randomBytes(4).toString("hex")),
        name: String(panel.name || "Panel").slice(0, 80),
        channelId: panel.channelId ? String(panel.channelId) : null,
        messageId: panel.messageId ? String(panel.messageId) : null,
        buttonLabel: String(panel.buttonLabel || patch.buttonLabel || "Add roles").slice(0, 80),
        removeButtonLabel: String(panel.removeButtonLabel || patch.removeButtonLabel || "Remove roles").slice(0, 80),
        embedTitle: String(panel.embedTitle || patch.embedTitle || panel.name || "Self Roles").slice(0, 256),
        embedDescription: String(panel.embedDescription || patch.embedDescription || "").slice(0, 2000),
        categoryIds,
        includes
      };
    });
}
