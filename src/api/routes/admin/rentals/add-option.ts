import RentalService from "../../../../services/rental"
import { PricingService } from "@medusajs/medusa/dist/services"
import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."

import { IsString } from "class-validator"
import { validator } from "@medusajs/medusa/dist/utils/validator"
import { EntityManager } from "typeorm"

/**
 * @oas [post] /rentals/{id}/options
 * operationId: "PostRentalsRentalOptions"
 * summary: "Add an Option"
 * x-authenticated: true
 * description: "Adds a Rental Option to a Rental"
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsRentalOptionsReq"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.addOption(rental_id, {
 *         title: 'Size'
 *       })
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals/{id}/options' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "title": "Size"
 *       }'
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
  const { id } = req.params

  const validated = await validator(
    AdminPostRentalsRentalOptionsReq,
    req.body
  )

  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await rentalService
      .withTransaction(transactionManager)
      .addOption(id, validated.title)
  })

  const rawRental = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  const [rental] = await pricingService.setProductPrices([rawRental])

  res.json({ rental })
}

/**
 * @schema AdminPostRentalsRentalOptionsReq
 * type: object
 * required:
 *   - title
 * properties:
 *   title:
 *     description: "The title the Rental Option will be identified by i.e. \"Size\""
 *     type: string
 */
export class AdminPostRentalsRentalOptionsReq {
  @IsString()
  title: string
}
