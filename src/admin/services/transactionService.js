import { AppError } from "../../services/errors.js";
import { transactionRepository } from "../repositories/transactionRepository.js";
import { TRANSACTION_STATUSES } from "../models/Transaction.js";
import { publishEvent } from "../../services/eventBus.js";

export async function listTransactions({ status, search, page, limit }) {
  const [result, stats] = await Promise.all([
    transactionRepository.findAll({ status, search, page, limit }),
    transactionRepository.countByStatus(),
  ]);
  return { ...result, stats };
}

export async function getTransaction(id) {
  const transaction = await transactionRepository.findById(id);
  if (!transaction) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  return transaction;
}

// Refund only a paid transaction; records reason on the audit trail.
export async function refundTransaction(id, adminId, reason) {
  const transaction = await transactionRepository.findById(id);
  if (!transaction) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (transaction.status !== TRANSACTION_STATUSES.PAID) {
    throw new AppError("Only paid transactions can be refunded", 409, "TRANSACTION_NOT_REFUNDABLE");
  }

  const updated = await transactionRepository.updateWithAudit(
    id,
    { status: TRANSACTION_STATUSES.REFUNDED, "refund.state": "completed", "refund.reason": reason || null },
    { status: TRANSACTION_STATUSES.REFUNDED, actor: String(adminId), note: reason || "Refund issued" },
  );
  publishEvent("admin.transaction.refunded", { transaction_id: id, admin_id: String(adminId) });
  return updated;
}

// Flag a transaction as disputed.
export async function disputeTransaction(id, adminId, reason) {
  const transaction = await transactionRepository.findById(id);
  if (!transaction) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (transaction.status === TRANSACTION_STATUSES.DISPUTED) {
    throw new AppError("Transaction is already disputed", 409, "TRANSACTION_ALREADY_DISPUTED");
  }

  const updated = await transactionRepository.updateWithAudit(
    id,
    { status: TRANSACTION_STATUSES.DISPUTED, "dispute.state": "open", "dispute.reason": reason || null },
    { status: TRANSACTION_STATUSES.DISPUTED, actor: String(adminId), note: reason || "Dispute opened" },
  );
  publishEvent("admin.transaction.disputed", { transaction_id: id, admin_id: String(adminId) });
  return updated;
}

// Resolve an open dispute — reverts the transaction to paid.
export async function resolveDispute(id, adminId, note) {
  const transaction = await transactionRepository.findById(id);
  if (!transaction) throw new AppError("Transaction not found", 404, "TRANSACTION_NOT_FOUND");
  if (transaction.dispute?.state !== "open") {
    throw new AppError("Transaction has no open dispute", 409, "TRANSACTION_NO_OPEN_DISPUTE");
  }

  const updated = await transactionRepository.updateWithAudit(
    id,
    { status: TRANSACTION_STATUSES.PAID, "dispute.state": "resolved" },
    { status: TRANSACTION_STATUSES.PAID, actor: String(adminId), note: note || "Dispute resolved" },
  );
  publishEvent("admin.transaction.dispute_resolved", { transaction_id: id, admin_id: String(adminId) });
  return updated;
}
