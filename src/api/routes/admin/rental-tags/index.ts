import { Router } from "express"
import { RentalTag } from "../../../../models"
import { PaginatedResponse } from "@medusajs/medusa/dist/types/common"
import middlewares, { transformQuery } from "@medusajs/medusa/dist/api/middlewares"
import "reflect-metadata"
import { AdminGetRentalTagsParams } from "./list-rental-tags"

const route = Router()

export default (app) => {
  app.use("/rental-tags", route)

  route.get(
    "/",
    transformQuery(AdminGetRentalTagsParams, {
      defaultFields: defaultAdminRentalTagsFields,
      defaultRelations: defaultAdminRentalTagsRelations,
      isList: true,
    }),
    middlewares.wrap(require("./list-rental-tags").default)
  )

  return app
}

export const defaultAdminRentalTagsFields = [
  "id",
  "value",
  "created_at",
  "updated_at",
]
export const defaultAdminRentalTagsRelations = []

export type AdminRentalTagsListRes = PaginatedResponse & {
  rental_tags: RentalTag[]
}

export type AdminRentalTagsRes = {
  rental_tag: RentalTag
}

export * from "./list-rental-tags"
