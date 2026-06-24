import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Make sure we can parse JSON bodies
  app.use(express.json());

  // Setup multer memory storage (saves uploaded files directly into buffer)
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Parse bank statement endpoint using Server-side Gemini API
  app.post("/api/parse-statement", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY environment variable is not configured. Please locate the secrets panel in the Google AI Studio settings and supply it there."
        });
      }

      // Initialize the recommended GoogleGenAI SDK
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Map file buffer into Gemini API inline part
      const pdfPart = {
        inlineData: {
          mimeType: "application/pdf",
          data: req.file.buffer.toString("base64"),
        },
      };

      const promptText = `
Parse the attached bank statement document. Extract all individual listed transactions.
For every transaction, compile structured JSON containing these specific fields:
1. date: The date of the transaction formatted as YYYY-MM-DD.
2. amount: The transaction amount. Always extract this as a positive decimal value, omitting commas or signs.
3. direction: The transaction flow. MUST be either "credit" (incoming cash, payments, deposits) or "debit" (outgoing fees, cash, charges, withdrawals).
4. raw_description: The complete, unmodified text line of the transaction description.
5. paybill_number: Extract the M-Pesa Paybill / Till or safaricom business portal code (usually 5 to 7 numeric digits, such as 247247, 522522, 123456, 303030, etc.) if it appears anywhere inside the description. If not present or not an M-Pesa transaction, return null or empty. Use paybill number 303030 as a strong anchor: if a line mentions this paybill, look closely at its account/reference field for "fundedfutures" or "ffd" even if surrounding text is garbled or partially cut off.
6. account_number: Look for the payer's custom billing/account reference (the "Account Number" the client entered at the prompt when submitting M-Pesa cash, such as an alphanumeric text, invoice ID, client name, custom short code, etc. / e.g. UGC9#fundedfutures).
   Ensure you handle two direct narration styles that may appear in the statement:
   - STYLE A (M-Pesa-side narration):
     Example: "FL2Y8Q5GW Confirmed. Ksh1.00 sent to Absa Bank Kenya PLC for account UGC9#fundedfutures on 21/6/26 at 4:23 PM..."
     * The transaction code is the short alphanumeric string at the very start (e.g. "FL2Y8Q5GW").
     * The text after "for account" is the payer-entered reference ("UGC9#fundedfutures") — use this as account_number for project matching.
   - STYLE B (Bank-side deposit narration):
     Example: "Dear MARGARET ANYANGO, You have deposited KES1.0 MPESA ref: UFL2Y8Q5GW to account XX3322 for MARGARET ANYANGO through Absa Bank Kenya PLC"
     * The transaction code follows "MPESA ref:" ("UFL2Y8Q5GW"). These share the same stable reference code other than potentially one extra leading character compared to the M-Pesa-side code.
     * "account XX3322" is the bank's own masked account number, NOT a project or billing reference. Do NOT use this as account_number. If no other payer-entered billing reference is visible elsewhere in the line, leave account_number blank (null or empty) rather than guessing, letting it fall into manual review.
7. mpesa_transaction_code: The alphanumeric transaction identification code as described in STYLE A and STYLE B. If not found, return null or empty.
8. confidence: String: either "high" or "low". Return "low" if this transaction is indeed an M-Pesa paybill payment but either paybill_number or account_number could not be confidently identified or mapped, otherwise "high".
9. is_mpesa: Boolean. MUST be set to true ONLY if this represents incoming M-Pesa paybill/till payment lines. If it is standard bank charge, transfer interest, check fees, ATM operations, etc., set is_mpesa to false.

Analyze the balance listings carefully to extract all itemized transactions. Do not miss any rows.
`;

      // Define standard structured response schema using Google GenAI types
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          transactions: {
            type: Type.ARRAY,
            description: "List of all extracted transactions from the bank statement.",
            items: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "Transaction date in standard format (YYYY-MM-DD)."
                },
                amount: {
                  type: Type.NUMBER,
                  description: "Transaction amount as a positive floating number value."
                },
                direction: {
                  type: Type.STRING,
                  description: "Either 'credit' or 'debit'."
                },
                raw_description: {
                  type: Type.STRING,
                  description: "Full original description from statement"
                },
                paybill_number: {
                  type: Type.STRING,
                  description: "Safaricom M-Pesa paybill number, or empty/null if none details exist."
                },
                account_number: {
                  type: Type.STRING,
                  description: "Client-entered account referencing value or name, or empty/null."
                },
                mpesa_transaction_code: {
                  type: Type.STRING,
                  description: "M-Pesa alphanumeric transaction identification code."
                },
                confidence: {
                  type: Type.STRING,
                  description: "Either 'high' or 'low' depending on quality of extraction."
                },
                is_mpesa: {
                  type: Type.BOOLEAN,
                  description: "True if it is an M-Pesa paybill payment, false otherwise."
                }
              },
              required: ["date", "amount", "direction", "raw_description", "confidence", "is_mpesa"]
            }
          }
        },
        required: ["transactions"]
      };

      // Query Gemini model
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          pdfPart,
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "Gemini server response is empty." });
      }

      const parsedJSON = JSON.parse(responseText.trim());
      return res.json(parsedJSON);

    } catch (err: any) {
      console.error("Statement parser error:", err);
      return res.status(500).json({
        error: err.message || "An unexpected error occurred while parsing the document with Gemini."
      });
    }
  });

  // Sync endpoint (bypasses CORS restrictions on static iframe UI)
  app.post("/api/sync-sheets", async (req, res) => {
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
          // Perform POST to individual spreadsheet sync URL
          const syncResponse = await fetch(webAppUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tx),
            redirect: "follow", // critical for GAS redirects
          });

          if (syncResponse.ok) {
            results.push({ id: tx.id, success: true });
          } else {
            const errText = await syncResponse.text();
            results.push({
              id: tx.id,
              success: false,
              error: `HTTP status ${syncResponse.status}: ${errText}`
            });
          }
        } catch (err: any) {
          results.push({
            id: tx.id,
            success: false,
            error: err.message || "Could not execute HTTP POST request to Gas WebApp."
          });
        }
      }

      return res.json({ results });
    } catch (err: any) {
      console.error("Sheets sync error:", err);
      return res.status(500).json({
        error: err.message || "Google Sheets synchronization failed."
      });
    }
  });

  // Bind static server or Vite dev server based on mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
