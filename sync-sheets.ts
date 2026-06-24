import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Required — we handle multipart form data manually
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not configured. Add it as an environment variable in your Vercel project settings.",
      });
    }

    // Parse the multipart form upload
    const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
    const [, files] = await form.parse(req);

    const fileField = files["file"];
    const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const base64Data = fileBuffer.toString("base64");

    // Clean up temp file
    fs.unlinkSync(uploadedFile.filepath);

    const ai = new GoogleGenAI({ apiKey });

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64Data,
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

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        transactions: {
          type: Type.ARRAY,
          description: "List of all extracted transactions from the bank statement.",
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "Transaction date in standard format (YYYY-MM-DD)." },
              amount: { type: Type.NUMBER, description: "Transaction amount as a positive floating number value." },
              direction: { type: Type.STRING, description: "Either 'credit' or 'debit'." },
              raw_description: { type: Type.STRING, description: "Full original description from statement" },
              paybill_number: { type: Type.STRING, description: "Safaricom M-Pesa paybill number, or empty/null if none." },
              account_number: { type: Type.STRING, description: "Client-entered account referencing value or name, or empty/null." },
              mpesa_transaction_code: { type: Type.STRING, description: "M-Pesa alphanumeric transaction identification code." },
              confidence: { type: Type.STRING, description: "Either 'high' or 'low' depending on quality of extraction." },
              is_mpesa: { type: Type.BOOLEAN, description: "True if it is an M-Pesa paybill payment, false otherwise." },
            },
            required: ["date", "amount", "direction", "raw_description", "confidence", "is_mpesa"],
          },
        },
      },
      required: ["transactions"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [pdfPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: "Gemini returned an empty response." });
    }

    const parsedJSON = JSON.parse(responseText.trim());
    return res.json(parsedJSON);
  } catch (err: any) {
    console.error("Statement parser error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred while parsing the document with Gemini.",
    });
  }
}
