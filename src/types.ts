export interface Transaction {
  id: string;
  date: string;
  amount: number;
  direction: "credit" | "debit";
  raw_description: string;
  paybill_number: string | null;
  account_number: string | null;
  mpesa_transaction_code: string | null;
  confidence: "high" | "low";
  is_mpesa: boolean;
  project: string; // The mapped project name
  synced: boolean;
  syncStatus: "pending" | "syncing" | "success" | "error";
  syncError?: string | null;
  excluded: boolean;
}

export interface Mapping {
  id: string;
  accountNumber: string;
  projectName: string;
}
