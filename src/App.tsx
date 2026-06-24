import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  HelpCircle, 
  AlertCircle, 
  FileText, 
  CheckCircle,
  X,
  Sparkles,
  Upload,
  Settings,
  Play,
  CheckSquare,
  Check,
  BookmarkCheck,
  Info,
  Clock,
  HeartHandshake
} from "lucide-react";
import { Transaction, Mapping } from "./types";
import { areMpesaCodesDuplicate, getProjectForTransaction } from "./lib/transactionUtils";
import UploadSection from "./components/UploadSection";
import MappingTable from "./components/MappingTable";
import ReviewTable from "./components/ReviewTable";
import SettingsPanel from "./components/SettingsPanel";

interface SyncSummary {
  totalAttempted: number;
  successCount: number;
  failedCount: number;
  projectBreakdown: { projectName: string; count: number; totalAmount: number }[];
  failures: { date: string; amount: number; error: string }[];
}

export default function App() {
  // Save/load mappings from local browser storage
  const [mappings, setMappings] = useState<Mapping[]>(() => {
    const saved = localStorage.getItem("statement_reconciler_mappings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed loading saved mappings", err);
      }
    }
    // Return sample starter mappings if empty
    return [
      { id: "map-1", accountNumber: "ACCT-101", projectName: "Website Maintenance Dev" },
      { id: "map-2", accountNumber: "CLIENT-B", projectName: "ERP App Development" },
      { id: "map-3", accountNumber: "SVR-5", projectName: "Cloud Servers Hosting" }
    ];
  });

  // Save/load gas script url from local storage
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem("statement_reconciler_webapp_url") || "";
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // States for dynamic guide walkthrough and synchronization summary
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  // Check first-time load for showWelcomeModal walkthrough
  useEffect(() => {
    const hideWelcome = localStorage.getItem("statement_reconciler_hide_welcome");
    if (hideWelcome !== "true") {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleCloseWelcomeModal = () => {
    if (dontShowAgain) {
      localStorage.setItem("statement_reconciler_hide_welcome", "true");
    }
    setShowWelcomeModal(false);
  };

  // Synchronize mappings to localstorage whenever mutated
  useEffect(() => {
    localStorage.setItem("statement_reconciler_mappings", JSON.stringify(mappings));
  }, [mappings]);

  // Synchronize Google Sheets webapp URL whenever updated
  useEffect(() => {
    localStorage.setItem("statement_reconciler_webapp_url", webAppUrl);
  }, [webAppUrl]);

  // Apply project auto-mappings to transactions whenever transaction list or mappings mutate
  useEffect(() => {
    if (transactions.length === 0) return;

    setTransactions((prev) =>
      prev.map((tx) => {
        const proj = getProjectForTransaction(tx, mappings);
        return {
          ...tx,
          project: proj
        };
      })
    );
  }, [mappings]);

  // When new transactions are parsed, map them instantly using existing mappings
  const handleTransactionsExtracted = (newTxs: Transaction[]) => {
    const mapped = newTxs.map((tx) => {
      const proj = getProjectForTransaction(tx, mappings);
      return {
        ...tx,
        project: proj
      };
    });

    // Deduplicate against existing transactions using the last-9-characters rule
    setTransactions((prev) => {
      const filteredNew = mapped.filter((newTx) => {
        if (!newTx.mpesa_transaction_code) return true;
        return !prev.some((existingTx) =>
          areMpesaCodesDuplicate(existingTx.mpesa_transaction_code, newTx.mpesa_transaction_code)
        );
      });
      return [...prev, ...filteredNew];
    });

    setGlobalSuccess("Statement parsed successfully using Gemini native document intelligence!");
    setTimeout(() => setGlobalSuccess(null), 5000);
  };

  // Add a new account code-to-project map
  const handleAddMapping = (accountNumber: string, projectName: string) => {
    const uppercaseAccount = accountNumber.trim().toUpperCase();
    
    // Check if mapping already exists
    if (mappings.some((m) => m.accountNumber.toUpperCase() === uppercaseAccount)) {
      setMappings((prev) =>
        prev.map((m) =>
          m.accountNumber.toUpperCase() === uppercaseAccount
            ? { ...m, projectName: projectName.trim() }
            : m
        )
      );
      return;
    }

    const newMap: Mapping = {
      id: `map-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      accountNumber: accountNumber.trim(),
      projectName: projectName.trim()
    };
    setMappings((prev) => [...prev, newMap]);
  };

  const handleEditMapping = (id: string, accountNumber: string, projectName: string) => {
    setMappings((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, accountNumber: accountNumber.trim(), projectName: projectName.trim() }
          : m
      )
    );
  };

  const handleDeleteMapping = (id: string) => {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateTransaction = (id: string, updatedFields: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updatedFields } : tx))
    );
  };

  // Synchronise rows directly with destination Google Apps Script endpoint via backend proxy
  const handleSyncRows = async (ids: string[]) => {
    if (!webAppUrl.trim()) {
      setError("Please save your Google Sheet link in the Settings panel before attempting synchronization.");
      return;
    }

    setError(null);
    setSyncInProgress(true);

    // Filter out transactions that we want to sync
    const targetTxs = transactions.filter((tx) => ids.includes(tx.id) && !tx.excluded && tx.syncStatus !== "success");

    if (targetTxs.length === 0) {
      setSyncInProgress(false);
      return;
    }

    // Mark states as "syncing"
    setTransactions((prev) =>
      prev.map((tx) => (ids.includes(tx.id) ? { ...tx, syncStatus: "syncing", syncError: null } : tx))
    );

    try {
      // Prepare pay bills data payloads
      const payload = targetTxs.map((tx) => ({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        direction: tx.direction,
        paybill_number: tx.paybill_number,
        account_number: tx.account_number,
        project: tx.project,
        mpesa_transaction_code: tx.mpesa_transaction_code,
        raw_description: tx.raw_description
      }));

      const response = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webAppUrl: webAppUrl.trim(),
          transactions: payload
        })
      });

      if (!response.ok) {
        throw new Error(`Sync connection failed: Code ${response.status}`);
      }

      const reply = await response.json();
      const resultsMap: { [id: string]: { success: boolean; error?: string } } = {};
      
      if (reply.results && Array.isArray(reply.results)) {
        reply.results.forEach((item: any) => {
          resultsMap[item.id] = { success: item.success, error: item.error };
        });
      }

      // Update final transaction objects synced state in browser
      setTransactions((prev) =>
        prev.map((tx) => {
          if (ids.includes(tx.id)) {
            const syncReply = resultsMap[tx.id];
            if (syncReply) {
              return {
                ...tx,
                synced: syncReply.success,
                syncStatus: syncReply.success ? "success" : "error",
                syncError: syncReply.error || null
              };
            }
          }
          return tx;
        })
      );

      const successes: Transaction[] = [];
      const failures: { date: string; amount: number; error: string }[] = [];

      targetTxs.forEach((tx) => {
        const result = resultsMap[tx.id];
        if (result && result.success) {
          successes.push(tx);
        } else {
          failures.push({
            date: tx.date || "Unknown date",
            amount: tx.amount,
            error: result?.error || "Spreadsheet transfer was interrupted"
          });
        }
      });

      // Group successes by project
      const breakdownMap: { [projectName: string]: { count: number; totalAmount: number } } = {};
      successes.forEach((tx) => {
        const proj = tx.project || "Unmapped";
        if (!breakdownMap[proj]) {
          breakdownMap[proj] = { count: 0, totalAmount: 0 };
        }
        breakdownMap[proj].count += 1;
        breakdownMap[proj].totalAmount += tx.amount;
      });

      const projectBreakdown = Object.entries(breakdownMap).map(([projectName, data]) => ({
        projectName,
        count: data.count,
        totalAmount: data.totalAmount
      })).sort((a, b) => b.totalAmount - a.totalAmount);

      setSyncSummary({
        totalAttempted: targetTxs.length,
        successCount: successes.length,
        failedCount: failures.length,
        projectBreakdown,
        failures
      });

    } catch (err: any) {
      console.error("Sync error:", err);
      // Revert status to error
      setTransactions((prev) =>
        prev.map((tx) =>
          ids.includes(tx.id) && tx.syncStatus === "syncing"
            ? { ...tx, syncStatus: "error", syncError: err.message || "Failed posting data" }
            : tx
        )
      );

      const failures = targetTxs.map(tx => ({
        date: tx.date || "Unknown date",
        amount: tx.amount,
        error: "Spreadsheet connection was interrupted. Please check your tracking link."
      }));

      setSyncSummary({
        totalAttempted: targetTxs.length,
        successCount: 0,
        failedCount: targetTxs.length,
        projectBreakdown: [],
        failures
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#EDEDED] antialiased font-sans flex flex-col">
      {/* Top Navigation / App Banner */}
      <header className="bg-[#161618] border-b border-[#2D2D30] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-xs border border-[#2D2D30]">
              <FileSpreadsheet className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#EDEDED] flex items-center">
                <span>STATEMENT</span>
                <span className="font-serif italic font-normal text-[#94A3B8] ml-1.5 text-sm">
                  Reconciler
                </span>
              </h1>
              <p className="text-xs text-[#94A3B8]">
                Automatic client-reconciliation and sheet logging leveraging server-side models
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-[#94A3B8]">
            <button
              onClick={() => {
                setShowWelcomeModal(true);
              }}
              className="inline-flex items-center space-x-1.5 font-semibold text-[#3B82F6] hover:text-blue-400 bg-blue-950/25 hover:bg-blue-950/40 px-2.5 py-1.5 rounded border border-blue-900/30 transition-all cursor-pointer"
              title="Open step-by-step user guide"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How it works</span>
            </button>

            <span className="w-px h-5 bg-[#2D2D30] hidden sm:block" />

            <div className="flex items-center space-x-1.5">
              <span>Server:</span>
              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-550/20">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-pulse" />
                <span>Connected</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Banner Success notifications */}
        {globalSuccess && (
          <div className="mb-6 bg-emerald-950/20 border border-emerald-800/40 rounded-lg p-3.5 flex items-start space-x-2.5 animate-fadeIn">
            <CheckCircle className="w-4.5 h-4.5 text-[#10B981] shrink-0 mt-0.5" />
            <h4 className="text-xs font-semibold text-emerald-250 leading-normal">
              {globalSuccess}
            </h4>
          </div>
        )}

        {/* Global level errors warning */}
        {error && (
          <div className="mb-6 bg-rose-955/20 border border-rose-800/30 rounded-lg p-3.5 flex items-start space-x-2.5">
            <AlertCircle className="w-4.5 h-4.5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-250">Operational Notice</h4>
              <p className="text-[11px] text-rose-350 mt-0.5 leading-relaxed">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-250 font-semibold text-[10px] uppercase tracking-wider"
            >
              Clear
            </button>
          </div>
        )}

        {/* Premium KPI Metrics Cards Dashboard (Sophisticated Dark layout) */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-4 shadow-xs">
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Total Extracted</div>
              <div className="text-2xl font-bold font-mono text-[#EDEDED]">{transactions.length}</div>
            </div>
            <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-4 shadow-xs">
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Pending Sync</div>
              <div className="text-2xl font-bold font-mono text-[#3B82F6]">
                {transactions.filter(t => !t.excluded && t.syncStatus !== "success").length}
              </div>
            </div>
            <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-4 shadow-xs">
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Total Reconciled</div>
              <div className="text-2xl font-bold font-serif italic text-[#10B981]">
                KES {transactions
                  .filter(t => !t.excluded && t.direction === "credit")
                  .reduce((acc, t) => acc + t.amount, 0)
                  .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-4 shadow-xs">
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider font-semibold mb-1">Unmapped Issues</div>
              <div className="text-2xl font-bold font-mono text-[#F59E0B]">
                {transactions.filter(t => !t.excluded && t.project === "Unmapped").length}
              </div>
            </div>
          </div>
        )}

        {/* Two Columns Dashboard Setup */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Reconciliation Left Column (Grid width = 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Area */}
            <UploadSection 
              onTransactionsExtracted={handleTransactionsExtracted}
              setError={setError}
              error={null} // Controlled locally inside UploadSection
            />

            {/* Review and group listing board */}
            <ReviewTable 
              transactions={transactions}
              mappings={mappings}
              onUpdateTransaction={handleUpdateTransaction}
              onAddMapping={handleAddMapping}
              onSyncRows={handleSyncRows}
              syncInProgress={syncInProgress}
            />

          </div>

          {/* Secondary Control Right Column (Grid width = 1/3) */}
          <div className="space-y-6">
            
            {/* Sync Destination Settings Panel */}
            <SettingsPanel 
              webAppUrl={webAppUrl}
              setWebAppUrl={setWebAppUrl}
            />

            {/* Account Mapping Rules Table */}
            <MappingTable 
              mappings={mappings}
              onAddMapping={handleAddMapping}
              onEditMapping={handleEditMapping}
              onDeleteMapping={handleDeleteMapping}
            />

          </div>

        </div>

      </main>

      {/* Footer Section */}
      <footer className="bg-[#161618] border-t border-[#2D2D30] mt-auto py-5 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between text-[11px] text-[#94A3B8] gap-2">
          <div>
            &copy; 2026 Statement Reconciler Applet. Secured leveraging Gemini 3.5 Flash server-side models.
          </div>
          <div className="flex items-center space-x-3.5">
            <span>Browser Sandbox environment</span>
            <span className="w-1 h-1 bg-[#2D2D30] rounded-full" />
            <span>M-Pesa Paybill reconciler</span>
          </div>
        </div>
      </footer>

      {/* 2. WALKTHROUGH GUIDE PASSPORT */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-[#161618] border border-[#2D2D30] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#2D2D30] flex items-center justify-between bg-[#19191B]">
              <div className="flex items-center space-x-2.5">
                <BookmarkCheck className="w-5 h-5 text-[#3B82F6]" />
                <h2 className="text-base font-bold text-[#EDEDED] tracking-tight">
                  How to Use Statement Reconciler
                </h2>
              </div>
              <button
                onClick={handleCloseWelcomeModal}
                className="text-[#94A3B8] hover:text-[#EDEDED] p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide Steps Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Welcome! This tool reads transactions from your bank statement PDFs and saves them directly to your tracking Google Sheet. Complete your reconciliation in 5 simple steps:
              </p>

              <div className="space-y-4 pt-1">
                {/* Step 1 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-950/40 border border-blue-900/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                    <Upload className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#EDEDED]">Step 1: Upload your statement</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      Drop your bank statement PDF (from Equity, KCB, Standard Chartered, or Co-op Bank) into the Upload section at the top of the dashboard.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#EDEDED]">Step 2: Wait for extraction</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      Our secure assistant reads the document details. Within 15–20 seconds, it extracts and displays all transactions.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-950/40 border border-amber-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#EDEDED]">Step 3: Review and map projects</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      Check your transactions. Click any date, amount, or name to correct it. If an account is marked <strong className="text-amber-400">"Unmapped"</strong>, assign it a project to save it for future automatic identification.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-lg bg-[#2D2D30]/60 border border-[#3E3E42] flex items-center justify-center shrink-0 mt-0.5">
                    <Settings className="w-4 h-4 text-[#94A3B8]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#EDEDED]">Step 4: Save your destination sheet link</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      Make sure your Google Sheet link is pasted into the "Google Sheet Link" settings box on the right. You only have to do this once!
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-7 h-7 rounded-lg bg-pink-950/40 border border-pink-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Play className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#EDEDED]">Step 5: Sync directly to Google Sheets</h4>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
                      Click the "Sync Selected to Sheets" button to save all mapped, reviewed lines safely into your tracker.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#2D2D30] bg-[#19191B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <label className="inline-flex items-center space-x-2 text-[#94A3B8] hover:text-[#EDEDED] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-[#2D2D30] text-[#3B82F6] bg-[#0A0A0B] focus:ring-[#3B82F6] w-3.5 h-3.5 cursor-pointer"
                />
                <span>Don't show this walkthrough automatically on start</span>
              </label>
              
              <button
                onClick={handleCloseWelcomeModal}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer text-center"
              >
                Let's Start!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. SECURE SYNCHRONIZATION SUMMARY POPUP */}
      {syncSummary && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn font-sans">
          <div className="bg-[#161618] border border-[#2D2D30] rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#2D2D30] flex items-center justify-between bg-[#19191B]">
              <div className="flex items-center space-x-2.5">
                <CheckCircle className="w-5 h-5 text-[#10B981]" />
                <h2 className="text-base font-bold text-[#EDEDED] tracking-tight">
                  Spreadsheet Saved
                </h2>
              </div>
              <button
                onClick={() => setSyncSummary(null)}
                className="text-[#94A3B8] hover:text-[#EDEDED] p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5">
              {/* Main Greeting */}
              <div className="text-center py-2">
                <div id="sync-summary-title" className="text-2xl font-black text-[#EDEDED] tracking-tight mb-2">
                  Done! {syncSummary.successCount} transaction{syncSummary.successCount !== 1 ? "s" : ""} logged.
                </div>
              </div>

              {/* Friendly breakdown layout */}
              <div className="space-y-3 text-left text-sm text-[#EDEDED] bg-[#0A0A0B] border border-[#2D2D30] rounded-lg p-5">
                {(() => {
                  const ff = syncSummary.projectBreakdown.find(p => p.projectName === "Funded Futures");
                  const ffCount = ff ? ff.count : 0;
                  const ffTotal = ff ? ff.totalAmount : 0;
                  return (
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] shrink-0" />
                      <p className="leading-relaxed">
                        <strong className="text-base text-blue-400 font-mono font-bold">{ffCount}</strong> {ffCount === 1 ? "was" : "were"} tagged as <strong className="text-blue-400 font-semibold">Funded Futures</strong>, totaling <strong className="text-emerald-400 font-mono font-semibold">KES {ffTotal.toLocaleString()}</strong>.
                      </p>
                    </div>
                  );
                })()}

                {(() => {
                  const others = syncSummary.projectBreakdown.filter(p => p.projectName !== "Funded Futures");
                  const otherCount = others.reduce((sum, p) => sum + p.count, 0);
                  return (
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 shrink-0" />
                      <p className="leading-relaxed">
                        <strong className="text-base text-zinc-300 font-mono font-bold">{otherCount}</strong> other transaction{otherCount !== 1 ? "s were" : " was"} logged under their mapped projects.
                      </p>
                    </div>
                  );
                })()}

                <div className="flex items-center space-x-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${syncSummary.failedCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                  <p className="leading-relaxed">
                    <strong className={`text-base font-mono font-bold ${syncSummary.failedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {syncSummary.failedCount}
                    </strong> failed to sync.
                  </p>
                </div>
              </div>

              {/* Show plain failed rows plainly (date + amount) if any exist */}
              {syncSummary.failedCount > 0 && (
                <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-[#E2E8F0]">Rows that failed to save:</div>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {syncSummary.failures.map((f, i) => (
                      <div key={i} className="flex justify-between items-center text-xs font-mono bg-[#0A0A0B]/80 border border-rose-900/20 p-2 rounded text-zinc-300">
                        <span>{f.date}</span>
                        <span className="font-semibold text-rose-450">KES {f.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#2D2D30] bg-[#19191B] flex justify-end">
              <button
                onClick={() => setSyncSummary(null)}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
