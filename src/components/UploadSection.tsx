import React, { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, Sparkles, Loader2, Play } from "lucide-react";
import { Transaction } from "../types";

interface UploadSectionProps {
  onTransactionsExtracted: (transactions: Transaction[]) => void;
  setError: (msg: string | null) => void;
  error: string | null;
}

export default function UploadSection({ onTransactionsExtracted, setError, error }: UploadSectionProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stages = [
    "Uploading target bank statement safely...",
    "Scanning pages with Gemini 3.5 Flash...",
    "Reconstructing credit and debit transaction rows...",
    "Extracting Safaricom M-Pesa Paybill codes...",
    "Isolating client reference Account numbers...",
    "Configuring confidence metrics and parsing JSON..."
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        processFile(file);
      } else {
        setError("Unsupported file format. Please upload a standard PDF bank statement.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setCurrentStage(0);

    // Progressive loading simulator for intermediate stages
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 4000);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-statement", {
        method: "POST",
        body: formData,
      });

      clearInterval(stageTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status code: ${response.status}`);
      }

      const result = await response.json();
      if (!result.transactions || !Array.isArray(result.transactions)) {
        throw new Error("No transactions list parsed. Verify your bank statement contains readable tabular data.");
      }

      // Add frontend custom client fields
      const formatted: Transaction[] = result.transactions.map((tx: any, idx: number) => ({
        id: `tx-${Date.now()}-${idx}`,
        date: tx.date || "",
        amount: Number(tx.amount) || 0,
        direction: tx.direction === "debit" ? "debit" : "credit",
        raw_description: tx.raw_description || "",
        paybill_number: tx.paybill_number || null,
        account_number: tx.account_number || null,
        mpesa_transaction_code: tx.mpesa_transaction_code || null,
        confidence: tx.confidence === "low" ? "low" : "high",
        is_mpesa: typeof tx.is_mpesa === "boolean" ? tx.is_mpesa : true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: !tx.is_mpesa, // Exclude naturally if not an M-Pesa transactional payment
      }));

      onTransactionsExtracted(formatted);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while communicating with the document parser.");
    } finally {
      clearInterval(stageTimer);
      setUploading(false);
    }
  };

  const handleLoadDemo = () => {
    setError(null);
    const demoTransactions: Transaction[] = [
      {
        id: "tx-demo-1",
        date: "2026-06-15",
        amount: 15400,
        direction: "credit",
        raw_description: "MPESA INCOMING | FROM JOHN DOE REF: ACCT-101 VIA PAYBILL 247247 CODE: SJS7T9V8ED",
        paybill_number: "247247",
        account_number: "ACCT-101",
        mpesa_transaction_code: "SJS7T9V8ED",
        confidence: "high",
        is_mpesa: true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: false
      },
      {
        id: "tx-demo-2",
        date: "2026-06-15",
        amount: 8500,
        direction: "credit",
        raw_description: "MPESA PORTAL DEP | MOBILE REF: CLIENT-B BUSINESS: 522522 TX: SHS1A2B3C4",
        paybill_number: "522522",
        account_number: "CLIENT-B",
        mpesa_transaction_code: "SHS1A2B3C4",
        confidence: "high",
        is_mpesa: true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: false
      },
      {
        id: "tx-demo-3",
        date: "2026-06-16",
        amount: 250,
        direction: "debit",
        raw_description: "BANK TRANSFER FEE TO SAF TELCO INTERNAL CHARGES",
        paybill_number: null,
        account_number: null,
        mpesa_transaction_code: null,
        confidence: "high",
        is_mpesa: false,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: true
      },
      {
        id: "tx-demo-4",
        date: "2026-06-16",
        amount: 45000,
        direction: "credit",
        raw_description: "M-PESA DEPOSIT REVENUE FROM COOPERATIVE BANK | CODE: SKS8N5M2DF ACCOUNT: UNKNOWN",
        paybill_number: "400222",
        account_number: "UNKNOWN",
        mpesa_transaction_code: "SKS8N5M2DF",
        confidence: "low",
        is_mpesa: true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: false
      },
      {
        id: "tx-demo-5",
        date: "2026-06-17",
        amount: 12000,
        direction: "credit",
        raw_description: "FT2617300091 - CORR DEP VIA PAYBILL 247247 / SVR-5",
        paybill_number: "247247",
        account_number: "SVR-5",
        mpesa_transaction_code: null,
        confidence: "high",
        is_mpesa: true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: false
      },
      {
        id: "tx-demo-6",
        date: "2026-06-18",
        amount: 3200,
        direction: "debit",
        raw_description: "MPESA PAYBILL EXPENSE FROM OFFICE PETTY TO TILL 581920",
        paybill_number: "581920",
        account_number: "PETTY-CASH",
        mpesa_transaction_code: "SLS2K1J9DF",
        confidence: "low",
        is_mpesa: true,
        project: "Unmapped",
        synced: false,
        syncStatus: "pending",
        excluded: true
      }
    ];

    onTransactionsExtracted(demoTransactions);
  };

  return (
    <div className="bg-[#161618] border border-[#2D2D30] rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#EDEDED]">
            Upload Bank Statement
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Supported format: PDF statements (Equity, Co-op, KCB, Standard Chartered etc.)
          </p>
        </div>

        <button
          onClick={handleLoadDemo}
          disabled={uploading}
          className="inline-flex items-center space-x-1 bg-[#0A0A0B] border border-[#2D2D30] hover:bg-zinc-900 disabled:opacity-50 text-[#EDEDED] text-xs px-3 py-1.5 rounded font-medium transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 text-[#3B82F6] fill-[#3B82F6]" />
          <span>Load mock Demo Data</span>
        </button>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? "border-blue-500 bg-blue-950/10"
            : uploading
            ? "border-[#2D2D30] bg-[#0A0A0B]/40 pointer-events-none"
            : "border-[#2D2D30] hover:border-zinc-500 hover:bg-white/[0.02]"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-8 h-8 text-[#94A3B8] animate-spin mb-3.5" />
            <span className="text-xs font-semibold text-[#EDEDED] mb-1 animate-pulse">
              {stages[currentStage]}
            </span>
            <span className="text-[10px] text-[#94A3B8] italic">
              Extracting tables using Gemini. This page takes 15-20 seconds.
            </span>
            
            {/* Elegant visual indicator bar */}
            <div className="w-48 bg-[#0A0A0B] h-1 rounded-full overflow-hidden mt-4">
              <div 
                className="bg-[#3B82F6] h-full transition-all duration-[4000ms] ease-out rounded-full"
                style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-950/25 rounded-full flex items-center justify-center mb-3 border border-[#2D2D30]">
              <Upload className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-xs font-medium text-[#EDEDED]">
              Drag and drop your bank statement PDF here, or <span className="text-[#3B82F6] font-semibold underline decoration-2 underline-offset-2">browse files</span>
            </p>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Gemini handles multiple layouts including scanned pages naturally
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-rose-950/20 border border-rose-900/30 rounded-md p-3.5 flex items-start space-x-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-rose-250">Extraction Failed</h4>
            <p className="text-[11px] text-rose-350 mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
