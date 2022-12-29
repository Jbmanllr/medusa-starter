import { Router } from "express"
import "reflect-metadata"
import { Rental, RentalTag, RentalType } from "../../../../models"
import { FindParams, PaginatedResponse } from "@medusajs/medusa/dist/types/common"
import { PricedProduct } from "@medusajs/medusa/dist/types/pricing"
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router"
import middlewares, { transformQuery } from "@medusajs/medusa/dist/api/middlewares"
import { validateSalesChannelsExist } from "@medusajs/medusa/dist/api/middlewares/validators/sales-channel-existence"
import { AdminGetRentalsParams } from "./list-rentals"

const route = Router()

export default (app, featureFlagRouter: FlagRouter) => {
  app.use("/rentals", route)

  if (featureFlagRouter.isFeatureEnabled("sales_channels")) {
    defaultAdminRentalRelations.push("sales_channels")
  }

  route.post(
    "/",
    validateSalesChannelsExist((req) => req.body?.sales_channels),
    middlewares.wrap(require("./create-rental").default)
  )
  route.post(
    "/:id",
    validateSalesChannelsExist((req) => req.body?.sales_channels),
    middlewares.wrap(require("./update-rental").default)
  )
  route.get("/types", middlewares.wrap(require("./list-types").default))
  route.get(
    "/tag-usage",
    middlewares.wrap(require("./list-tag-usage-count").default)
  )

  route.get(
    "/:id/variants",
    middlewares.normalizeQuery(),
    middlewares.wrap(require("./list-variants").default)
  )
  route.post(
    "/:id/variants",
    middlewares.wrap(require("./create-variant").default)
  )

  route.post(
    "/:id/variants/:variant_id",
    middlewares.wrap(require("./update-variant").default)
  )

  route.post(
    "/:id/options/:option_id",
    middlewares.wrap(require("./update-option").default)
  )
  route.post("/:id/options", middlewares.wrap(require("./add-option").default))

  route.delete(
    "/:id/variants/:variant_id",
    middlewares.wrap(require("./delete-variant").default)
  )
  route.delete("/:id", middlewares.wrap(require("./delete-rental").default))
  route.delete(
    "/:id/options/:option_id",
    middlewares.wrap(require("./delete-option").default)
  )

  route.post(
    "/:id/metadata",
    middlewares.wrap(require("./set-metadata").default)
  )
  route.get(
    "/:id",
    transformQuery(FindParams, {
      defaultRelations: defaultAdminRentalRelations,
      defaultFields: defaultAdminRentalFields,
      isList: false,
    }),
    middlewares.wrap(require("./get-rental").default)
  )

  route.get(
    "/",
    transformQuery(AdminGetRentalsParams, {
      defaultRelations: defaultAdminRentalRelations,
      defaultFields: defaultAdminRentalFields,
      isList: true,
    }),
    middlewares.wrap(require("./list-rentals").default)
  )

  return app
}

export const defaultAdminRentalRelations = [
  "variants",
  "variants.prices",
  "variants.options",
  "images",
  "options",
  "tags",
  "type",
  "collection",
]

export const defaultAdminRentalFields: (keyof Rental)[] = [
  "id",
  "title",
  "subtitle",
  "status",
  "external_id",
  "description",
  "handle",
  "is_giftcard",
  "discountable",
  "thumbnail",
  "profile_id",
  "collection_id",
  "type_id",
  "weight",
  "length",
  "height",
  "width",
  "hs_code",
  "origin_country",
  "mid_code",
  "material",
  "created_at",
  "updated_at",
  "deleted_at",
  "metadata",
]

export const defaultAdminGetRentalsVariantsFields = ["id", "rental_id"]

export type AdminRentalsDeleteOptionRes = {
  option_id: string
  object: "option"
  deleted: boolean
  rental: Rental
}

export type AdminRentalsDeleteVariantRes = {
  variant_id: string
  object: "rental-variant"
  deleted: boolean
  rental: Rental
}

export type AdminRentalsDeleteRes = {
  id: string
  object: "rental"
  deleted: boolean
}

export type AdminRentalsListRes = PaginatedResponse & {
  rentals: (PricedProduct | Rental)[]
}

export type AdminRentalsListTypesRes = {
  types: RentalType[]
}

export type AdminRentalsListTagsRes = {
  tags: RentalTag[]
}

export type AdminRentalsRes = {
  rental: Rental
}

export * from "./add-option"
export * from "./create-rental"
export * from "./create-variant"
export * from "./delete-option"
export * from "./delete-rental"
export * from "./delete-variant"
export * from "./get-rental"
export * from "./list-rentals"
export * from "./list-tag-usage-count"
export * from "./list-types"
export * from "./list-variants"
export * from "./set-metadata"
export * from "./update-option"
export * from "./update-rental"
export * from "./update-variant"
