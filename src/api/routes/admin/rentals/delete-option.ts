import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."

import { EntityManager } from "typeorm"
import RentalService from "../../../../services/rental"

/**
 * @oas [delete] /rentals/{id}/options/{option_id}
 * operationId: "DeleteRentalsRentalOptionsOption"
 * summary: "Delete a Rental Option"
 * description: "Deletes a Rental Option. Before a Rental Option can be deleted all Option Values for the Rental Option must be the same. You may, for example, have to delete some of your variants prior to deleting the Rental Option"
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 *   - (path) option_id=* {string} The ID of the Rental Option.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.deleteOption(rental_id, option_id)
 *       .then(({ option_id, object, delete, rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request DELETE 'https://medusa-url.com/admin/rentals/{id}/options/{option_id}' \
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
 *             option_id:
 *               type: string
 *               description: The ID of the deleted Rental Option
 *             object:
 *               type: string
 *               description: The type of the object that was deleted.
 *               default: option
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
  const { id, option_id } = req.params

  const rentalService: RentalService = req.scope.resolve("rentalService")

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await rentalService
      .withTransaction(transactionManager)
      .deleteOption(id, option_id)
  })

  const data = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  res.json({
    option_id,
    object: "option",
    deleted: true,
    rental: data,
  })
}
