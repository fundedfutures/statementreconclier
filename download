import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { webAppUrl, transactions } = req.body;

    if (!webAppUrl) {
      return res.status(400).json({ error: "Google Apps Script Web App URL is required." });
    }
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "Please provide a list of transactions to synchronize." });
    }

    const results = [];

    for (const tx of transactions) {
      try {
        const syncResponse = await fetch(webAppUrl, {
          method: "POST",
          headers: {
            // Must be text/plain to avoid CORS preflight issues with Google Apps Script
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(tx),
          redirect: "follow", // Critical for GAS redirects
        });

        if (syncResponse.ok) {
          results.push({ id: tx.id, success: true });
        } else {
          const errText = await syncResponse.text();
          results.push({
            id: tx.id,
            success: false,
            error: `HTTP status ${syncResponse.status}: ${errText}`,
          });
        }
      } catch (err: any) {
        results.push({
          id: tx.id,
          success: false,
          error: err.message || "Could not reach the Google Apps Script endpoint.",
        });
      }
    }

    return res.json({ results });
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return res.status(500).json({
      error: err.message || "Google Sheets synchronization failed.",
    });
  }
}
