import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."

import { IsString } from "class-validator"
import { validator } from "@medusajs/medusa/dist/utils/validator"
import { EntityManager } from "typeorm"

/**
 * @oas [post] /rentals/{id}/metadata
 * operationId: "PostRentalsRentalMetadata"
 * summary: "Set Rental Metadata"
 * description: "Set metadata key/value pair for Rental"
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsRentalMetadataReq"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.setMetadata(rental_id, {
 *       key: 'test',
 *         value: 'true'
 *       })
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals/{id}/metadata' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "key": "test",
 *           "value": "true"
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
    AdminPostRentalsRentalMetadataReq,
    req.body
  )

  const rentalService = req.scope.resolve("rentalService")
  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await rentalService.withTransaction(transactionManager).update(id, {
      metadata: { [validated.key]: validated.value },
    })
  })

  const rental = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  res.status(200).json({ rental })
}

/**
 * @schema AdminPostRentalsRentalMetadataReq
 * type: object
 * required:
 *   - key
 *   - value
 * properties:
 *   key:
 *     description: The metadata key
 *     type: string
 *   value:
 *     description: The metadata value
 *     type: string
 */
export class AdminPostRentalsRentalMetadataReq {
  @IsString()
  key: string

  @IsString()
  value: string
}
