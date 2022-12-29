import { defaultStoreRentalsRelations } from "."
import {
  CartService,
  PricingService,
  RegionService,
} from "@medusajs/medusa/dist/services"
import RentalService from "../../../../services/rental"
import { PriceSelectionParams } from "@medusajs/medusa/dist/types/price-selection"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [get] /rentals/{id}
 * operationId: GetRentalsRental
 * summary: Get a Rental
 * description: "Retrieves a Rental."
 * parameters:
 *   - (path) id=* {string} The id of the Rental.
 *   - (query) cart_id {string} The ID of the customer's cart.
 *   - (query) region_id {string} The ID of the region the customer is using. This is helpful to ensure correct prices are retrieved for a region.
 *   - in: query
 *     name: currency_code
 *     style: form
 *     explode: false
 *     description: The 3 character ISO currency code to set prices based on. This is helpful to ensure correct prices are retrieved for a currency.
 *     schema:
 *       type: string
 *       externalDocs:
 *         url: https://en.wikipedia.org/wiki/ISO_4217#Active_codes
 *         description: See a list of codes.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       medusa.rentals.retrieve(rental_id)
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --rental --request GET 'https://medusa-url.com/store/rentals/{id}'
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
 *               allOf:
 *                 - $ref: "#/components/schemas/Rental"
 *                 - type: object
 *                   properties:
 *                     variants:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: "#/components/schemas/RentalVariant"
 *                           - $ref: "#/components/schemas/RentalVariantPricesFields"
 *   "400":
 *     $ref: "#/components/responses/400_error"
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

  const validated = await validator(PriceSelectionParams, req.query)

  const customer_id = req.user?.customer_id

  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")
  const cartService: CartService = req.scope.resolve("cartService")
  const regionService: RegionService = req.scope.resolve("regionService")
  const rawRental = await rentalService.retrieve(id, {
    relations: defaultStoreRentalsRelations,
  })

  let regionId = validated.region_id
  let currencyCode = validated.currency_code
  if (validated.cart_id) {
    const cart = await cartService.retrieve(validated.cart_id, {
      select: ["id", "region_id"],
    })
    const region = await regionService.retrieve(cart.region_id, {
      select: ["id", "currency_code"],
    })
    regionId = region.id
    currencyCode = region.currency_code
  }

  const [rental] = await pricingService.setProductPrices([rawRental], {
    cart_id: validated.cart_id,
    customer_id: customer_id,
    region_id: regionId,
    currency_code: currencyCode,
    include_discount_prices: true,
  })

  res.json({ rental })
}
