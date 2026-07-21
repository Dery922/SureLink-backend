import { successResponse } from "../../services/apiResponse.js";
import * as transactionService from "../services/transactionService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const data = await transactionService.listTransactions({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Transactions retrieved", data }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const transaction = await transactionService.getTransaction(req.params.id);
    return res.json(successResponse({ message: "Transaction retrieved", data: { transaction } }));
  } catch (err) { return next(err); }
}

export async function refund(req, res, next) {
  try {
    const transaction = await transactionService.refundTransaction(req.params.id, req.admin._id, req.body?.reason);
    return res.json(successResponse({ message: "Transaction refunded", data: { transaction } }));
  } catch (err) { return next(err); }
}

export async function dispute(req, res, next) {
  try {
    const transaction = await transactionService.disputeTransaction(req.params.id, req.admin._id, req.body?.reason);
    return res.json(successResponse({ message: "Transaction disputed", data: { transaction } }));
  } catch (err) { return next(err); }
}

export async function resolveDispute(req, res, next) {
  try {
    const transaction = await transactionService.resolveDispute(req.params.id, req.admin._id, req.body?.note);
    return res.json(successResponse({ message: "Dispute resolved", data: { transaction } }));
  } catch (err) { return next(err); }
}
