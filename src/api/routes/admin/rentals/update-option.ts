import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."

import { IsString } from "class-validator"
import RentalService from "../../../../services/rental"
import { validator } from "@medusajs/medusa/dist/utils/validator"
import { EntityManager } from "typeorm"

/**
 * @oas [post] /rentals/{id}/options/{option_id}
 * operationId: "PostRentalsRentalOptionsOption"
 * summary: "Update a Rental Option"
 * description: "Updates a Rental Option"
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 *   - (path) option_id=* {string} The ID of the Rental Option.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsRentalOptionsOption"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.updateOption(rental_id, option_id, {
 *         title: 'Size'
 *       })
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals/{id}/options/{option_id}' \
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
  const { id, option_id } = req.params

  const validated = await validator(
    AdminPostRentalsRentalOptionsOption,
    req.body
  )

  const rentalService: RentalService = req.scope.resolve("rentalService")

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await rentalService
      .withTransaction(transactionManager)
      .updateOption(id, option_id, validated)
  })

  const rental = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  res.json({ rental })
}

/**
 * @schema AdminPostRentalsRentalOptionsOption
 * type: object
 * required:
 *   - title
 * properties:
 *   title:
 *     description: "The title of the Rental Option"
 *     type: string
 */
export class AdminPostRentalsRentalOptionsOption {
  @IsString()
  title: string
}
