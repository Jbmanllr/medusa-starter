import { Router } from "express"
import { RentalType } from "../../../../models"
import { PaginatedResponse } from "@medusajs/medusa/dist/types/common"
import middlewares, { transformQuery } from "@medusajs/medusa/dist/api/middlewares"
import "reflect-metadata"
import { AdminGetRentalTypesParams } from "./list-rental-types"

const route = Router()

export default (app) => {
  app.use("/rental-types", route)

  route.get(
    "/",
    transformQuery(AdminGetRentalTypesParams, {
      defaultFields: defaultAdminRentalTypeFields,
      defaultRelations: defaultAdminRentalTypeRelations,
      isList: true,
    }),
    middlewares.wrap(require("./list-rental-types").default)
  )

  return app
}

export const defaultAdminRentalTypeFields = [
  "id",
  "value",
  "created_at",
  "updated_at",
]
export const defaultAdminRentalTypeRelations = []

export type AdminRentalTypesListRes = PaginatedResponse & {
  rental_types: RentalType[]
}

export type AdminRentalTypesRes = {
  rental_type: RentalType
}

export * from "./list-rental-types"
