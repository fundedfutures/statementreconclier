import React, { useState } from "react";
import { Settings, Check, Copy, HelpCircle, Eye, EyeOff, ShieldCheck, FileSpreadsheet } from "lucide-react";

interface SettingsPanelProps {
  webAppUrl: string;
  setWebAppUrl: (url: string) => void;
}

export default function SettingsPanel({ webAppUrl, setWebAppUrl }: SettingsPanelProps) {
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const scriptTemplate = `/**
 * Google Apps Script Web App Template
 * Deploy this code as a "Web App" inside your Google Sheet
 * and set Access to "Anyone" (even anonymous).
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    
    // Choose active sheet or find sheet named "Transactions"
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = activeSpreadsheet.getSheetByName("Transactions") || activeSpreadsheet.getActiveSheet();
    
    // If sheet is empty, optionally add a header row
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Sync Timestamp",
        "Date", 
        "Amount", 
        "Direction", 
        "Paybill Number", 
        "Account Number", 
        "Project/Client", 
        "M-Pesa Code", 
        "Raw Description"
      ]);
    }
    
    // Append the reconciled payment row
    sheet.appendRow([
      new Date(),
      data.date || "",
      Number(data.amount) || 0,
      data.direction || "",
      data.paybill_number || "",
      data.account_number || "",
      data.project || "",
      data.mpesa_transaction_code || "",
      data.raw_description || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*");
  }
}

// Support pre-flight request if browser performs direct fetch
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .addHeader("Access-Control-Allow-Origin", "*");
}
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-5 shadow-sm mb-6 transition-all duration-200">
      <div className="flex items-center justify-between border-b border-[#2D2D30] pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-[#94A3B8]" />
          <h2 className="text-sm font-semibold tracking-tight text-[#EDEDED]">
            Sync Destinations settings
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-[#3B82F6] bg-blue-950/20 px-2 py-1 rounded-full font-medium border border-blue-900/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local Store</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#94A3B8] mb-1.5" htmlFor="webAppUrl">
            Google Sheet Link
          </label>
          <div className="relative flex rounded-md shadow-sm">
            <input
              type={showUrl ? "text" : "password"}
              value={webAppUrl}
              onChange={(e) => setWebAppUrl(e.target.value)}
              placeholder="Paste your safe Google Sheet link here..."
              id="webAppUrl"
              className="block w-full rounded-md border border-[#2D2D30] px-3 py-2 text-xs font-mono text-[#EDEDED] bg-[#0A0A0B] focus:border-zinc-500 focus:outline-none transition-colors duration-200"
            />
            <button
              type="button"
              id="toggleUrlView"
              onClick={() => setShowUrl(!showUrl)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#EDEDED] p-1"
            >
              {showUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-[#94A3B8] leading-normal">
            Used to safely save reconciled payments directly into your spreadsheet. This link is stored securely on your own computer.
          </p>
        </div>

        <div>
          <button
            type="button"
            id="toggleShowScript"
            onClick={() => setShowScript(!showScript)}
            className="inline-flex items-center text-xs text-[#94A3B8] hover:text-[#EDEDED] font-medium space-x-1 transition-colors duration-150"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>{showScript ? "Hide Google Sheets Setup Guide" : "View Google Sheets Setup Guide"}</span>
          </button>

          {showScript && (
            <div className="mt-3 bg-[#0A0A0B] border border-[#2D2D30] rounded-md p-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-[#EDEDED] mb-2 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                <span>How to deploy your sync script</span>
              </h3>
              <ol className="list-decimal list-inside text-[11px] text-[#94A3B8] space-y-1 pb-3 mb-3 border-b border-[#2D2D30] leading-relaxed">
                <li>Create a new <strong className="text-white">Google Sheet</strong>.</li>
                <li>Go to <strong className="text-white">Extensions &gt; Apps Script</strong>.</li>
                <li>Erase existing code, and paste the template script below.</li>
                <li>Click <strong className="text-white">Deploy &gt; New Deployment</strong>.</li>
                <li>Select type: <strong className="text-white">Web App</strong>.</li>
                <li>Set Web App to execute as <strong className="text-white">Me</strong> and Access to <strong className="text-white">Anyone</strong>.</li>
                <li>Deploy, copy the URL, and paste it into the settings field above.</li>
              </ol>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-[#94A3B8]">code template (copy click)</span>
                <button
                  type="button"
                  id="copyScriptText"
                  onClick={handleCopy}
                  className="inline-flex items-center space-x-1 bg-[#161618] hover:bg-zinc-850 border border-[#2D2D30] text-[#EDEDED] text-[10px] px-2 py-1 rounded shadow-2xs font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-[#10B981]" />
                      <span className="text-[#10B981] font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#3B82F6]" />
                      <span>Copy Template</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="text-[10px] text-[#94A3B8] font-mono bg-[#161618]/90 p-2.5 rounded overflow-x-auto max-h-56 leading-relaxed border border-[#2D2D30]">
                {scriptTemplate}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
