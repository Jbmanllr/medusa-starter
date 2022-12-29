import RentalService from "../../../../services/rental"

/**
 * @oas [get] /rentals/tag-usage
 * operationId: "GetRentalsTagUsage"
 * summary: "List Tags Usage Number"
 * description: "Retrieves a list of Rental Tags with how many times each is used."
 * x-authenticated: true
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.listTags()
 *       .then(({ tags }) => {
 *         console.log(tags.length);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request GET 'https://medusa-url.com/admin/rentals/tag-usage' \
 *       --header 'Authorization: Bearer {api_token}'
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 * tags:
 *   - Rental Tag
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             tags:
 *               type: array
 *               items:
 *                 properties:
 *                   id:
 *                     description: The ID of the tag.
 *                     type: string
 *                   usage_count:
 *                     description: The number of rentals that use this tag.
 *                     type: string
 *                   value:
 *                     description: The value of the tag.
 *                     type: string
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
  const rentalService: RentalService = req.scope.resolve("rentalService")

  const tags = await rentalService.listTagsByUsage()

  res.json({ tags })
}
