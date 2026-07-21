import { successResponse } from "../../services/apiResponse.js";
import * as customerService from "../services/customerService.js";

export async function list(req, res, next) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const data = await customerService.listCustomers({ status, search, page: +page, limit: +limit });
    return res.json(successResponse({ message: "Customers retrieved", data }));
  } catch (err) { return next(err); }
}

export async function getOne(req, res, next) {
  try {
    const data = await customerService.getCustomer(req.params.id);
    return res.json(successResponse({ message: "Customer retrieved", data }));
  } catch (err) { return next(err); }
}
