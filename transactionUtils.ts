import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, Tag } from "lucide-react";
import { Mapping } from "../types";

interface MappingTableProps {
  mappings: Mapping[];
  onAddMapping: (accountNumber: string, projectName: string) => void;
  onEditMapping: (id: string, accountNumber: string, projectName: string) => void;
  onDeleteMapping: (id: string) => void;
}

export default function MappingTable({
  mappings,
  onAddMapping,
  onEditMapping,
  onDeleteMapping,
}: MappingTableProps) {
  const [newAccount, setNewAccount] = useState("");
  const [newProject, setNewProject] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState("");
  const [editingProject, setEditingProject] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.trim() || !newProject.trim()) return;
    onAddMapping(newAccount.trim(), newProject.trim());
    setNewAccount("");
    setNewProject("");
  };

  const startEdit = (map: Mapping) => {
    setEditingId(map.id);
    setEditingAccount(map.accountNumber);
    setEditingProject(map.projectName);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editingAccount.trim() || !editingProject.trim()) return;
    onEditMapping(id, editingAccount.trim(), editingProject.trim());
    setEditingId(null);
  };

  return (
    <div className="bg-[#161618] border border-[#2D2D30] rounded-lg shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-[#2D2D30] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Tag className="w-4.5 h-4.5 text-[#94A3B8]" />
          <h2 className="text-sm font-semibold text-[#EDEDED]">
            Account Mappings Table
          </h2>
        </div>
        <span className="text-[10px] font-mono text-[#3B82F6] font-semibold bg-blue-950/20 px-2 py-0.5 rounded-full border border-blue-900/30">
          {mappings.length} Defined
        </span>
      </div>

      {/* Speed Add Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-[#0A0A0B]/30 border-b border-[#2D2D30]">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8] mb-1">
              Account Code
            </label>
            <input
              type="text"
              value={newAccount}
              onChange={(e) => setNewAccount(e.target.value)}
              placeholder="e.g. ACCT-101"
              id="newAccountCode"
              className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] placeholder-[#94A3B8] focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8] mb-1">
              Project / Client
            </label>
            <input
              type="text"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              placeholder="e.g. Website Overhaul"
              id="newProjectClientName"
              className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-2.5 py-1.5 text-xs text-[#EDEDED] placeholder-[#94A3B8] focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
        <button
          type="submit"
          id="addMappingButton"
          disabled={!newAccount.trim() || !newProject.trim()}
          className="w-full inline-flex items-center justify-center space-x-1.5 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-[#3B82F6] text-white text-xs font-semibold py-1.5 px-3 rounded shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Custom Client Mapping</span>
        </button>
      </form>

      {/* Mappings Listing */}
      <div className="max-h-[300px] overflow-y-auto">
        {mappings.length === 0 ? (
          <div className="p-6 text-center text-[#94A3B8] text-xs">
            No custom client mappings registered. Complete the inline parsing or append mappings above.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0B]/40 border-b border-[#2D2D30]">
                <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8] w-1/2">
                  Account Number
                </th>
                <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider font-semibold text-[#94A3B8] w-1/2">
                  Target Project Name
                </th>
                <th className="py-2.5 px-4 w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D30]">
              {mappings.map((map) => {
                const isEditing = editingId === map.id;
                return (
                  <tr key={map.id} className="hover:bg-white/[0.01] text-xs text-[#EDEDED]">
                    <td className="py-2.5 px-4 font-mono select-all">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingAccount}
                          onChange={(e) => setEditingAccount(e.target.value)}
                          className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-zinc-500 font-mono text-white"
                        />
                      ) : (
                        <span className="bg-[#0A0A0B] text-[#EDEDED] px-1.5 py-0.5 rounded text-[11px] font-semibold border border-[#2D2D30]">
                          {map.accountNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingProject}
                          onChange={(e) => setEditingProject(e.target.value)}
                          className="w-full bg-[#0A0A0B] border border-[#2D2D30] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-zinc-500 text-white"
                        />
                      ) : (
                        <span className="font-medium text-[#EDEDED]">{map.projectName}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveEdit(map.id)}
                              className="text-emerald-400 hover:bg-emerald-950/30 p-1 rounded transition-colors"
                              title="Save Changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="text-[#94A3B8] hover:bg-zinc-800 p-1 rounded transition-colors"
                              title="Cancel Edit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(map)}
                              className="text-[#94A3B8] hover:text-[#EDEDED] hover:bg-zinc-800 p-1 rounded transition-colors"
                              title="Edit Row"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMapping(map.id)}
                              className="text-rose-450 hover:text-rose-400 hover:bg-rose-950/20 p-1 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
