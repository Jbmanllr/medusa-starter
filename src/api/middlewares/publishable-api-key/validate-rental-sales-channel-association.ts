import { NextFunction, Request, Response } from "express"

import PublishableApiKeyService from "@medusajs/medusa/dist/services/publishable-api-key"
import RentalService from "../../../services/rental"

/**
 * The middleware check if requested rental is assigned to a SC associated with PK in the header.
 *
 * @param req - request object
 * @param res - response object
 * @param next - next middleware call
 */
async function validateRentalSalesChannelAssociation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const pubKey = req.get("x-publishable-api-key")

  if (pubKey) {
    const rentalService: RentalService = req.scope.resolve("rentalService")
    const publishableKeyService: PublishableApiKeyService = req.scope.resolve(
      "publishableApiKeyService"
    )

    const { sales_channel_id: salesChannelIds } =
      await publishableKeyService.getResourceScopes(pubKey)

    if (
      salesChannelIds.length &&
      !(await rentalService.isRentalInSalesChannels(
        req.params.id,
        salesChannelIds
      ))
    ) {
      req.errors = req.errors ?? []
      req.errors.push(
        `Rental with id: ${req.params.id} is not associated with sales channels defined by the Publishable API Key passed in the header of the request.`
      )
    }
  }

  next()
}

export { validateRentalSalesChannelAssociation }
