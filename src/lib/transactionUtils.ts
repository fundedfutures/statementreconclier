import { Transaction, Mapping } from "../types";

/**
 * Checks if two transaction codes refer to the same payment.
 * Compares only the last 9 characters, ignoring case and punctuation/spaces.
 */
export function areMpesaCodesDuplicate(code1: string | null | undefined, code2: string | null | undefined): boolean {
  if (!code1 || !code2) return false;
  
  const clean = (c: string) => c.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const c1 = clean(code1);
  const c2 = clean(code2);
  
  if (c1.length === 0 || c2.length === 0) return false;
  
  const suffix1 = c1.slice(-9);
  const suffix2 = c2.slice(-9);
  
  return suffix1 === suffix2;
}

/**
 * Resolves the designated project for a given transaction.
 * Integrates Funded Futures special patterns with custom user mappings.
 */
export function getProjectForTransaction(tx: Transaction | { paybill_number: string | null; account_number: string | null; raw_description: string }, mappingsList: Mapping[]): string {
  const norm = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const accountNum = tx.account_number || "";
  const rawDesc = tx.raw_description || "";
  
  // 1. Paybill check (303030 is Funded Futures paybill number)
  const isPaybillMatch = tx.paybill_number === "303030";
  
  // 2. Account number prefix check (UGC9# prefix confirms Funded Futures)
  const isAccountPrefixMatch = accountNum.toUpperCase().startsWith("UGC9#");
  
  // 3. Content matching check ("funded futures" in any spelling or "ffd", case-insensitive, ignoring spacing/punctuation)
  const combinedText = norm(accountNum + " " + rawDesc);
  const isPhraseMatch = combinedText.includes("fundedfutures") || combinedText.includes("ffd");
  
  if (isPaybillMatch || isAccountPrefixMatch || isPhraseMatch) {
    return "Funded Futures";
  }
  
  if (!tx.account_number) {
    return "Unmapped";
  }
  
  const matched = mappingsList.find(
    (m) => m.accountNumber.trim().toUpperCase() === tx.account_number!.trim().toUpperCase()
  );
  
  return matched ? matched.projectName : "Unmapped";
}
