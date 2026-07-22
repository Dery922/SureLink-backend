import { successResponse } from "../../utils/apiResponse.js";
import * as customerService from "../services/customerViewService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await customerService.listCustomers({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Customers retrieved", data: result }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const result = await customerService.getCustomer(req.params.id);
    return res.json(successResponse({ message: "Customer retrieved", data: result }));
  } catch (err) { return next(err); }
}
