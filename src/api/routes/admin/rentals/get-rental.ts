import RentalService from "../../../../services/rental"
import { PricingService } from "@medusajs/medusa/dist/services"

/**
 * @oas [get] /rentals/{id}
 * operationId: "GetRentalsRental"
 * summary: "Get a Rental"
 * description: "Retrieves a Rental."
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.retrieve(rental_id)
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request GET 'https://medusa-url.com/admin/rentals/{id}' \
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

  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")

  const rawRental = await rentalService.retrieve(id, req.retrieveConfig)

  const [rental] = await pricingService.setProductPrices([rawRental])

  res.json({ rental })
}
