import { requireManagedGuild } from "../lib/customerAuth.js";
import { listAuditLogs, getAuditLog } from "../lib/auditLogs.js";
import { buildLogCsv } from "../lib/logExport.js";

export default async function handler(req, res) {
  try {
    const guildId = req.query?.guildId;
    if (!guildId) {
      return res.status(400).json({ error: "Missing guildId" });
    }
    await requireManagedGuild(req, guildId);

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const view = String(req.query.view || "list");

    if (view === "detail") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "Missing id" });
      const row = await getAuditLog(guildId, id);
      if (!row) return res.status(404).json({ error: "Not found" });

      const hasStoredAttachments = Array.isArray(row.attachments) && row.attachments.length > 0;
      const hasStoredEmbeds = Array.isArray(row.embeds_snapshot) && row.embeds_snapshot.length > 0;
      const contentExpired =
        !row.content &&
        !row.before_content &&
        !row.after_content &&
        !hasStoredAttachments &&
        !hasStoredEmbeds &&
        !!row.message_id;

      return res.status(200).json({
        log: row,
        contentExpired,
        contentAvailable: !!(
          row.content ||
          row.before_content ||
          row.after_content ||
          (Array.isArray(row.attachments) && row.attachments.length) ||
          (Array.isArray(row.embeds_snapshot) && row.embeds_snapshot.length)
        ),
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

    if (view === "export") {
      const filters = {
        category: req.query.category,
        eventType: req.query.eventType,
        actorId: req.query.userId,
        q: req.query.q,
      };
      const allRows = [];
      let offset = 0;
      let total = 0;
      do {
        const page = await listAuditLogs(guildId, { ...filters, limit: 100, offset });
        total = page.total || 0;
        const pageRows = page.rows || [];
        if (!pageRows.length) break;
        allRows.push(...pageRows);
        offset += pageRows.length;
      } while (offset < total && offset < 10000);

      const csv = buildLogCsv(allRows);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="coffee-shop-logs.csv"');
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(200).send(csv);
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
