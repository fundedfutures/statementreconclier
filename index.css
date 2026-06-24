import React, { useState } from "react";
import { 
  Check, X, Edit2, AlertTriangle, Eye, RefreshCw, 
  Trash2, ShieldCheck, CheckCircle2, AlertCircle, Play 
} from "lucide-react";
import { Transaction, Mapping } from "../types";
import { areMpesaCodesDuplicate } from "../lib/transactionUtils";

interface ReviewTableProps {
  transactions: Transaction[];
  mappings: Mapping[];
  onUpdateTransaction: (id: string, updated: Partial<Transaction>) => void;
  onAddMapping: (accountNumber: string, projectName: string) => void;
  onSyncRows: (ids: string[]) => void;
  syncInProgress: boolean;
}

export default function ReviewTable({
  transactions,
  mappings,
  onUpdateTransaction,
  onAddMapping,
  onSyncRows,
  syncInProgress,
}: ReviewTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // States for row-level edits
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDirection, setEditDirection] = useState<"credit" | "debit">("credit");
  const [editPaybill, setEditPaybill] = useState("");
  const [editAccount, setEditAccount] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editMpesaCode, setEditMpesaCode] = useState("");
  const [editRawDescription, setEditRawDescription] = useState("");

  // States for adding instant mappings
  const [instantMapAcct, setInstantMapAcct] = useState<string | null>(null);
  const [instantMapProj, setInstantMapProj] = useState("");

  // Collect unique list of all project names currently in mappings
  const existingProjects = Array.from(
    new Set(mappings.map((m) => m.projectName).filter(Boolean))
  );

  const isMpesaCodeDuplicate = (txId: string, mpesaCode: string | null) => {
    if (!mpesaCode) return false;
    return transactions.some(
      (t) => t.id !== txId && areMpesaCodesDuplicate(t.mpesa_transaction_code, mpesaCode)
    );
  };

  const startEditRow = (tx: Transaction) => {
    setEditingRowId(tx.id);
    setEditDate(tx.date);
    setEditAmount(tx.amount);
    setEditDirection(tx.direction);
    setEditPaybill(tx.paybill_number || "");
    setEditAccount(tx.account_number || "");
    setEditProject(tx.project);
    setEditMpesaCode(tx.mpesa_transaction_code || "");
    setEditRawDescription(tx.raw_description);
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
  };

  const saveEditRow = (id: string) => {
    onUpdateTransaction(id, {
      date: editDate,
      amount: Number(editAmount) || 0,
      direction: editDirection,
      paybill_number: editPaybill.trim() || null,
      account_number: editAccount.trim() || null,
      project: editProject.trim(),
      mpesa_transaction_code: editMpesaCode.trim() || null,
      raw_description: editRawDescription,
    });
    setEditingRowId(null);
  };

  const toggleExclude = (tx: Transaction) => {
    onUpdateTransaction(tx.id, { excluded: !tx.excluded });
  };

  const handleApplyInstantMapping = (acctNumber: string) => {
    if (!instantMapProj.trim()) return;
    onAddMapping(acctNumber, instantMapProj.trim());
    setInstantMapAcct(null);
    setInstantMapProj("");
  };

  // Group transactions by their project
  const groupedTransactions: { [project: string]: Transaction[] } = {};
  transactions.forEach((tx) => {
    const proj = tx.project || "Unmapped";
    if (!groupedTransactions[proj]) {
      groupedTransactions[proj] = [];
    }
    groupedTransactions[proj].push(tx);
  });

  const projectGroups = Object.keys(groupedTransactions).sort((a, b) => {
    if (a === "Unmapped") return 1;
    if (b === "Unmapped") return -1;
    return a.localeCompare(b);
  });

  // Calculate stats
  const totalInScope = transactions.filter((t) => !t.excluded).length;
  const totalSynced = transactions.filter((t) => t.syncStatus === "success").length;
  const totalPending = transactions.filter((t) => !t.excluded && t.syncStatus !== "success").length;

  return (
    <div className="bg-[#161618] border border-[#2D2D30] rounded-lg shadow-sm overflow-hidden mb-8">
      {/* Header and Bulk Actions */}
      <div className="p-4 bg-[#0A0A0B]/40 border-b border-[#2D2D30] flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div>
          <h2 className="text-sm font-semibold text-[#EDEDED]">
            Reconciliation Review Dashboard
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Grouped by projects. Edit fields, toggle inclusions, and sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-3 text-xs text-[#94A3B8] mr-2 font-medium bg-[#0A0A0B] px-3 py-1 rounded border border-[#2D2D30]">
            <span>In Scope: <strong className="text-[#EDEDED]">{totalInScope}</strong></span>
            <span className="w-px h-3.5 bg-[#2D2D30]" />
            <span>Synced: <strong className="text-emerald-400">{totalSynced}</strong></span>
            <span className="w-px h-3.5 bg-[#2D2D30]" />
            <span>Ready: <strong className="text-[#3B82F6]">{totalPending}</strong></span>
          </div>

          <button
            onClick={() => {
              const pendingIds = transactions
                .filter((tx) => !tx.excluded && tx.syncStatus !== "success")
                .map((tx) => tx.id);
              if (pendingIds.length > 0) {
                onSyncRows(pendingIds);
              }
            }}
            disabled={syncInProgress || totalPending === 0}
            id="bulkSyncButton"
            className="inline-flex items-center space-x-1.5 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-45 text-white text-xs font-semibold py-1.5 px-3 rounded shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncInProgress ? "animate-spin" : ""}`} />
            <span>{syncInProgress ? "Syncing..." : `Sync ${totalPending} Selected to Sheets`}</span>
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-12 text-center text-[#94A3B8] text-xs">
          Upload a bank statement PDF or load demo dataset to initiate your reconciliation board.
        </div>
      ) : (
        <div className="divide-y divide-[#2D2D30]">
          {projectGroups.map((proj) => {
            const groupTx = groupedTransactions[proj];
            const isUnmapped = proj === "Unmapped";

            return (
              <div key={proj} className="p-4" id={`project-group-${proj.replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between mb-3.5 font-sans">
                  <div className="flex items-center space-x-2">
                    <span 
                      className={`w-2 h-2 rounded-full ${
                        isUnmapped ? "bg-[#F59E0B] animate-pulse" : "bg-[#3B82F6]"
                      }`} 
                    />
                    <h3 className="text-xs font-bold text-[#EDEDED]">
                      {isUnmapped ? "Unmapped Transactions" : `Project: ${proj}`}
                    </h3>
                    <span className="text-[10px] text-[#3B82F6] bg-blue-950/20 border border-blue-900/30 px-1.5 py-0.5 rounded font-mono">
                      {groupTx.length} lines
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#2D2D30] rounded">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-[#0A0A0B]/40 border-b border-[#2D2D30]">
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[50px] text-center tracking-wider">
                          Sync
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[95px] tracking-wider">
                          Date
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[90px] tracking-wider">
                          Amount
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[65px] tracking-wider">
                          Flow
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[85px] tracking-wider">
                          Paybill
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[110px] tracking-wider">
                          Account No
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[140px] tracking-wider">
                          Assigned Project
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[90px] text-center tracking-wider">
                          Confidence
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider">
                          Raw Description
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[80px] text-center tracking-wider">
                          Status
                        </th>
                        <th className="py-2.5 px-3 text-[10px] uppercase font-bold text-[#94A3B8] w-[95px] text-center tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2D30] text-[11px] text-[#EDEDED] font-sans">
                      {groupTx.map((tx) => {
                        const isEditing = editingRowId === tx.id;
                        const isLowConfidence = tx.confidence === "low" && tx.is_mpesa;
                        const isRowExcluded = tx.excluded;

                        return (
                          <tr 
                            key={tx.id} 
                            id={`row-${tx.id}`}
                            className={`transition-colors duration-150 ${
                              isRowExcluded 
                                ? "bg-[#0A0A0B]/70 opacity-55 text-[#94A3B8]" 
                                : isLowConfidence 
                                ? "bg-[#F59E0B]/5 hover:bg-[#F59E0B]/10" 
                                : "hover:bg-white/[0.01]"
                            }`}
                          >
                            {/* Inclusion Checkbox */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={!tx.excluded}
                                onChange={() => toggleExclude(tx)}
                                id={`checkbox-exclude-${tx.id}`}
                                className="rounded border-[#2D2D30] text-[#3B82F6] bg-[#0A0A0B] focus:ring-[#3B82F6] w-3.5 h-3.5 cursor-pointer"
                                title={tx.excluded ? "Include in synchronization" : "Exclude from sync"}
                              />
                            </td>

                            {/* Date Column */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs font-mono text-white"
                                />
                              ) : (
                                <span className="font-mono text-[#EDEDED]">{tx.date}</span>
                              )}
                            </td>

                            {/* Amount Column */}
                            <td className="py-2 px-3 whitespace-nowrap font-medium text-[#EDEDED]">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs text-white"
                                />
                              ) : (
                                <span className={tx.direction === "credit" ? "text-emerald-400 font-semibold" : "text-amber-500 font-semibold"}>
                                  KES {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            {/* Flow Column */}
                            <td className="py-2 px-3">
                              {isEditing ? (
                                <select
                                  value={editDirection}
                                  onChange={(e) => setEditDirection(e.target.value as "credit" | "debit")}
                                  className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1 py-0.5 text-xs text-white"
                                >
                                  <option value="credit">credit</option>
                                  <option value="debit">debit</option>
                                </select>
                              ) : (
                                <span 
                                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                    tx.direction === "credit" 
                                      ? "bg-emerald-950/25 text-[#10B981] border border-emerald-900/30" 
                                      : "bg-amber-950/25 text-[#F59E0B] border border-amber-900/30"
                                  }`}
                                >
                                  {tx.direction}
                                </span>
                              )}
                            </td>

                            {/* Paybill Column */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editPaybill}
                                  onChange={(e) => setEditPaybill(e.target.value)}
                                  className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs font-mono text-white"
                                />
                              ) : (
                                <span className="font-mono text-[#94A3B8]">{tx.paybill_number || "—"}</span>
                              )}
                            </td>

                            {/* Account Number Column */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {isEditing ? (
                                <div className="flex flex-col space-y-1 w-[120px]">
                                  <input
                                    type="text"
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs font-mono text-white"
                                    placeholder="Account"
                                  />
                                  <input
                                    type="text"
                                    value={editMpesaCode}
                                    onChange={(e) => setEditMpesaCode(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
                                    placeholder="Ref Code"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col space-y-1">
                                  <span className="font-mono bg-[#0A0A0B] border border-[#2D2D30] px-1.5 py-0.5 rounded text-[10px] text-[#EDEDED] inline-block w-fit">
                                    {tx.account_number || "—"}
                                  </span>
                                  {tx.mpesa_transaction_code && (
                                    <div className="flex flex-col space-y-0.5">
                                      <span className="text-[10px] text-[#94A3B8] font-mono">
                                        Ref: {tx.mpesa_transaction_code}
                                      </span>
                                      {isMpesaCodeDuplicate(tx.id, tx.mpesa_transaction_code) && (
                                        <span className="text-[9px] text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-1 py-0.5 rounded border border-[#F59E0B]/20 inline-block w-fit">
                                          ⚠️ Match Found
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Assigned Project Column */}
                            <td className="py-2 px-3 text-[#EDEDED]">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input
                                    type="text"
                                    value={editProject}
                                    onChange={(e) => setEditProject(e.target.value)}
                                    className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs text-white"
                                    placeholder="Enter project name..."
                                    list={`projects-list-${tx.id}`}
                                  />
                                  <datalist id={`projects-list-${tx.id}`}>
                                    {existingProjects.map((p) => (
                                      <option key={p} value={p} />
                                    ))}
                                  </datalist>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {tx.project === "Unmapped" ? (
                                    instantMapAcct === tx.account_number && tx.account_number ? (
                                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          placeholder="Type project..."
                                          value={instantMapProj}
                                          onChange={(e) => setInstantMapProj(e.target.value)}
                                          className="text-[10px] border border-[#2D2D30] rounded px-1 py-0.5 w-24 bg-[#0A0A0B] text-white"
                                        />
                                        <button
                                          onClick={() => handleApplyInstantMapping(tx.account_number!)}
                                          className="bg-emerald-650 hover:bg-emerald-600 text-white p-0.5 rounded cursor-pointer"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setInstantMapAcct(null)}
                                          className="bg-zinc-800 hover:bg-zinc-700 text-[#94A3B8] p-0.5 rounded cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-start space-y-1">
                                        <span className="text-[#F59E0B] font-bold bg-amber-950/25 border border-amber-900/30 px-1.5 py-0.5 rounded text-[10px]">
                                          Unmapped
                                        </span>
                                        {tx.account_number && (
                                          <button
                                            onClick={() => {
                                              setInstantMapAcct(tx.account_number);
                                              setInstantMapProj("");
                                            }}
                                            className="text-[9px] text-[#3B82F6] hover:underline font-semibold"
                                          >
                                            + Map Account
                                          </button>
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    <span className="font-semibold text-[#EDEDED]">{tx.project}</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Confidence Column */}
                            <td className="py-2 px-3 text-center">
                              {isRowExcluded ? (
                                <span className="text-[#94A3B8]">Excluded</span>
                              ) : isLowConfidence ? (
                                <div className="inline-flex items-center space-x-1 text-[#F59E0B] bg-amber-950/25 px-2 py-0.5 rounded border border-amber-900/30 font-sans" title="Low confidence: Please review description details carefully">
                                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] fill-transparent" />
                                  <span className="font-semibold text-[9px] uppercase tracking-wide">Low</span>
                                </div>
                              ) : (
                                <span className="text-[9px] uppercase tracking-wide text-[#3B82F6] bg-blue-950/20 font-semibold px-2 py-0.5 rounded border border-blue-900/30">
                                  High
                                </span>
                              )}
                            </td>

                            {/* Raw Description Column */}
                            <td className="py-2 px-3 text-[10px] font-mono text-[#94A3B8] leading-normal max-w-sm overflow-hidden text-ellipsis whitespace-nowrap hover:whitespace-normal hover:bg-[#0A0A0B] hover:text-[#EDEDED] border-l border-transparent hover:max-w-none transition-all duration-150">
                              {isEditing ? (
                                <textarea
                                  value={editRawDescription}
                                  onChange={(e) => setEditRawDescription(e.target.value)}
                                  rows={2}
                                  className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded p-1 text-[10px] font-mono whitespace-pre-wrap text-white"
                                />
                              ) : (
                                <span className={isLowConfidence ? "text-amber-300 bg-amber-950/10 px-1 rounded line-clamp-1 hover:line-clamp-none font-medium" : ""}>
                                  {tx.raw_description}
                                </span>
                              )}
                            </td>

                            {/* Sync Status Column */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              {tx.syncStatus === "success" ? (
                                <span className="inline-flex items-center space-x-1 bg-emerald-950/25 text-[#10B981] border border-emerald-900/30 px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase tracking-wider">
                                  <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                                  <span>Synced</span>
                                </span>
                              ) : tx.syncStatus === "syncing" ? (
                                <span className="inline-flex items-center space-x-1 bg-blue-950/20 text-[#3B82F6] border border-blue-900/30 px-2 py-0.5 rounded-full font-semibold text-[9px]">
                                  <RefreshCw className="w-3 h-3 animate-spin text-[#3B82F6]" />
                                  <span>Syncing</span>
                                </span>
                              ) : tx.syncStatus === "error" ? (
                                <span 
                                  className="inline-flex items-center space-x-0.5 bg-rose-955/20 text-[#EF4444] border border-rose-900/30 px-2 py-0.5 rounded-full font-semibold text-[9px] uppercase tracking-wider cursor-help"
                                  title={tx.syncError || "Unknown connection failure"}
                                >
                                  <AlertCircle className="w-3 h-3 text-[#EF4444]" />
                                  <span>Error</span>
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold tracking-wider text-[#94A3B8] bg-[#0A0A0B] border border-[#2D2D30] px-2 py-0.5 rounded-full">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* Actions Column */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1 font-semibold">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => saveEditRow(tx.id)}
                                      className="text-emerald-400 hover:bg-emerald-950/30 p-1.5 rounded transition-colors cursor-pointer"
                                      title="Save edited fields"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditRow}
                                      className="text-[#94A3B8] hover:bg-zinc-800 p-1.5 rounded transition-colors cursor-pointer"
                                      title="Cancel editing"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEditRow(tx)}
                                      className="text-[#94A3B8] hover:text-[#EDEDED] hover:bg-zinc-800 p-1.5 rounded transition-colors cursor-pointer"
                                      title="Edit details"
                                    >
                                      <Edit2 className="w-3 h-3 text-[#3B82F6]" />
                                    </button>
                                    
                                    {!isRowExcluded && tx.syncStatus !== "success" && (
                                      <button
                                        type="button"
                                        onClick={() => onSyncRows([tx.id])}
                                        disabled={syncInProgress}
                                        className="text-[#94A3B8] hover:text-emerald-400 hover:bg-emerald-950/30 p-1.5 rounded transition-colors disabled:opacity-40 cursor-pointer"
                                        title="Sync this row specifically"
                                      >
                                        <Play className="w-3 h-3 text-[#10B981] fill-[#10B981]" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
