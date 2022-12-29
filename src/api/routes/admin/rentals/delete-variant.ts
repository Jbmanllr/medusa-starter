import RentalService from "../../../../services/rental"
import RentalVariantService from "../../../../services/rental-variant"
import { PricingService } from "@medusajs/medusa/dist/services"
import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."

import { EntityManager } from "typeorm"

/**
 * @oas [delete] /rentals/{id}/variants/{variant_id}
 * operationId: "DeleteRentalsRentalVariantsVariant"
 * summary: "Delete a Rental Variant"
 * description: "Deletes a Rental Variant."
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 *   - (path) variant_id=* {string} The ID of the Rental Variant.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.deleteVariant(rental_id, variant_id)
 *       .then(({ variant_id, object, deleted, rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request DELETE 'https://medusa-url.com/admin/rentals/{id}/variants/{variant_id}' \
 *       --header 'Authorization: Bearer {api_token}'
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 * tags:
 *   - Rental
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             variant_id:
 *               type: string
 *               description: The ID of the deleted Rental Variant.
 *             object:
 *               type: string
 *               description: The type of the object that was deleted.
 *               default: variant
 *             deleted:
 *               type: boolean
 *               description: Whether or not the items were deleted.
 *               default: true
 *             rental:
 *               $ref: "#/components/schemas/Rental"
 *   "400":
 *     $ref: "#/components/responses/400_error"
 *   "401":
 *     $ref: "#/components/responses/unauthorized"
 *   "404":
 *     $ref: "#/components/responses/not_found_error"
 *   "409":
 *     $ref: "#/components/responses/invalid_state_error"
 *   "422":
 *     $ref: "#/components/responses/invalid_request_error"
 *   "500":
 *     $ref: "#/components/responses/500_error"
 */
export default async (req, res) => {
  const { id, variant_id } = req.params

  const rentalVariantService: RentalVariantService = req.scope.resolve(
    "rentalVariantService"
  )
  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    await rentalVariantService
      .withTransaction(transactionManager)
      .delete(variant_id)
  })

  const data = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  const [rental] = await pricingService.setRentalPrices([data])

  res.json({
    variant_id,
    object: "rental-variant",
    deleted: true,
    rental,
  })
}
