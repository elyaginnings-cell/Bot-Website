import { requireAnySession } from "../lib/requireAuth.js";
import { listAuditLogs, getAuditLog } from "../lib/auditLogs.js";

export default async function handler(req, res) {
  try {
    requireAnySession(req);

    const guildId = req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const view = String(req.query.view || "list");

    if (view === "detail") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const row = await getAuditLog(guildId, id);
      if (!row) return res.status(404).json({ error: "Not found" });

      const contentExpired =
        !row.content &&
        !row.before_content &&
        !row.after_content &&
        !!row.message_id;

      return res.status(200).json({
        log: row,
        contentExpired,
        contentAvailable: !!(row.content || row.before_content || row.after_content),
      });
    }

    if (view === "user") {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const result = await listAuditLogs(guildId, {
        actorId: userId,
        limit: req.query.limit,
        offset: req.query.offset,
        category: req.query.category,
      });
      return res.status(200).json(result);
    }

    // list
    const result = await listAuditLogs(guildId, {
      category: req.query.category,
      eventType: req.query.eventType,
      actorId: req.query.userId,
      q: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.status(200).json(result);
  } catch (err) {
    console.error("logs API:", err);
    return res.status(err.status || 500).json({
      error: err.message || "Internal error",
    });
  }
}
