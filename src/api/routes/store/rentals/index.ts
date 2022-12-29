import { RequestHandler, Router } from "express"
import "reflect-metadata"

import { Rental } from "../../../../models"
import middlewares, { transformQuery } from "@medusajs/medusa/dist/api/middlewares"
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router"
import { PaginatedResponse } from "@medusajs/medusa/dist/types/common"
import { extendRequestParams } from "@medusajs/medusa/dist/api/middlewares/publishable-api-key/extend-request-params"
import PublishableAPIKeysFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/publishable-api-keys"
import { validateRentalSalesChannelAssociation } from "../../../middlewares/publishable-api-key/validate-rental-sales-channel-association"
import { validateSalesChannelParam } from "@medusajs/medusa/dist/api/middlewares/publishable-api-key/validate-sales-channel-param"
import { StoreGetRentalsParams } from "./list-rentals"

const route = Router()

export default (app, featureFlagRouter: FlagRouter) => {
  app.use("/rentals", route)

  if (featureFlagRouter.isFeatureEnabled(PublishableAPIKeysFeatureFlag.key)) {
    route.use(
      "/",
      extendRequestParams as unknown as RequestHandler,
      validateSalesChannelParam as unknown as RequestHandler
    )
    route.use("/:id", validateRentalSalesChannelAssociation)
  }

  route.get(
    "/",
    transformQuery(StoreGetRentalsParams, {
      defaultRelations: defaultStoreRentalsRelations,
      isList: true,
    }),
    middlewares.wrap(require("./list-rentals").default)
  )
  route.get("/:id", middlewares.wrap(require("./get-rental").default))
  route.post("/search", middlewares.wrap(require("./search").default))

  return app
}

export const defaultStoreRentalsRelations = [
  "variants",
  "variants.prices",
  "variants.options",
  "options",
  "options.values",
  "images",
  "tags",
  "collection",
  "type",
]

export * from "./list-rentals"
export * from "./search"

export type StoreRentalsRes = {
  rental: Rental
}

export type StorePostSearchRes = {
  hits: unknown[]
  [k: string]: unknown
}

export type StoreRentalsListRes = PaginatedResponse & {
  rentals: Rental[]
}
