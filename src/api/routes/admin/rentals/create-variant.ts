import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"
import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."
import RentalService from "../../../../services/rental"
import RentalVariantService from "../../../../services/rental-variant"

import { Type } from "class-transformer"
import { EntityManager } from "typeorm"
import {
  CreateRentalVariantInput,
  RentalVariantPricesCreateReq,
} from "../../../../types/rental-variant"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [post] /rentals/{id}/variants
 * operationId: "PostRentalsRentalVariants"
 * summary: "Create a Rental Variant"
 * description: "Creates a Rental Variant. Each Rental Variant must have a unique combination of Rental Option Values."
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsRentalVariantsReq"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.createVariant(rental_id, {
 *         title: 'Color',
 *         prices: [
 *           {
 *             amount: 1000,
 *             currency_code: "eur"
 *           }
 *         ],
 *         options: [
 *           {
 *             option_id,
 *             value: 'S'
 *           }
 *         ],
 *         inventory_quantity: 100
 *       })
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals/{id}/variants' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "title": "Color",
 *           "prices": [
 *             {
 *               "amount": 1000,
 *               "currency_code": "eur"
 *             }
 *           ],
 *           "options": [
 *             {
 *               "option_id": "asdasf",
 *               "value": "S"
 *             }
 *           ]
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
    AdminPostRentalsRentalVariantsReq,
    req.body
  )

  const rentalVariantService: RentalVariantService = req.scope.resolve(
    "rentalVariantService"
  )
  const rentalService: RentalService = req.scope.resolve("rentalService")

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    return await rentalVariantService
      .withTransaction(transactionManager)
      .create(id, validated as CreateRentalVariantInput)
  })

  const rental = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  res.json({ rental })
}

class RentalVariantOptionReq {
  @IsString()
  value: string

  @IsString()
  option_id: string
}

/**
 * @schema AdminPostRentalsRentalVariantsReq
 * type: object
 * required:
 *   - title
 *   - prices
 *   - options
 * properties:
 *   title:
 *     description: The title to identify the Rental Variant by.
 *     type: string
 *   sku:
 *     description: The unique SKU for the Rental Variant.
 *     type: string
 *   ean:
 *     description: The EAN number of the item.
 *     type: string
 *   upc:
 *     description: The UPC number of the item.
 *     type: string
 *   barcode:
 *     description: A generic GTIN field for the Rental Variant.
 *     type: string
 *   hs_code:
 *     description: The Harmonized System code for the Rental Variant.
 *     type: string
 *   inventory_quantity:
 *     description: The amount of stock kept for the Rental Variant.
 *     type: integer
 *     default: 0
 *   allow_backorder:
 *     description: Whether the Rental Variant can be purchased when out of stock.
 *     type: boolean
 *   manage_inventory:
 *     description: Whether Medusa should keep track of the inventory for this Rental Variant.
 *     type: boolean
 *   weight:
 *     description: The wieght of the Rental Variant.
 *     type: number
 *   length:
 *     description: The length of the Rental Variant.
 *     type: number
 *   height:
 *     description: The height of the Rental Variant.
 *     type: number
 *   width:
 *     description: The width of the Rental Variant.
 *     type: number
 *   origin_country:
 *     description: The country of origin of the Rental Variant.
 *     type: string
 *   mid_code:
 *     description: The Manufacturer Identification code for the Rental Variant.
 *     type: string
 *   material:
 *     description: The material composition of the Rental Variant.
 *     type: string
 *   metadata:
 *     description: An optional set of key-value pairs with additional information.
 *     type: object
 *   prices:
 *     type: array
 *     items:
 *       required:
 *         - amount
 *       properties:
 *         id:
 *           description: The ID of the price.
 *           type: string
 *         region_id:
 *           description: The ID of the Region for which the price is used. Only required if currency_code is not provided.
 *           type: string
 *         currency_code:
 *           description: The 3 character ISO currency code for which the price will be used. Only required if region_id is not provided.
 *           type: string
 *           externalDocs:
 *             url: https://en.wikipedia.org/wiki/ISO_4217#Active_codes
 *             description: See a list of codes.
 *         amount:
 *           description: The amount to charge for the Rental Variant.
 *           type: integer
 *         min_quantity:
 *          description: The minimum quantity for which the price will be used.
 *          type: integer
 *         max_quantity:
 *           description: The maximum quantity for which the price will be used.
 *           type: integer
 *   options:
 *     type: array
 *     items:
 *       required:
 *         - option_id
 *         - value
 *       properties:
 *         option_id:
 *           description: The ID of the Rental Option to set the value for.
 *           type: string
 *         value:
 *           description: The value to give for the Rental Option.
 *           type: string
 */
export class AdminPostRentalsRentalVariantsReq {
  @IsString()
  title: string

  @IsString()
  @IsOptional()
  sku?: string

  @IsString()
  @IsOptional()
  ean?: string

  @IsString()
  @IsOptional()
  upc?: string

  @IsString()
  @IsOptional()
  barcode?: string

  @IsString()
  @IsOptional()
  hs_code?: string

  @IsNumber()
  @IsOptional()
  inventory_quantity?: number = 0

  @IsBoolean()
  @IsOptional()
  allow_backorder?: boolean

  @IsBoolean()
  @IsOptional()
  manage_inventory?: boolean

  @IsNumber()
  @IsOptional()
  weight?: number

  @IsNumber()
  @IsOptional()
  length?: number

  @IsNumber()
  @IsOptional()
  height?: number

  @IsNumber()
  @IsOptional()
  width?: number

  @IsString()
  @IsOptional()
  origin_country?: string

  @IsString()
  @IsOptional()
  mid_code?: string

  @IsString()
  @IsOptional()
  material?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RentalVariantPricesCreateReq)
  prices: RentalVariantPricesCreateReq[]

  @IsOptional()
  @Type(() => RentalVariantOptionReq)
  @ValidateNested({ each: true })
  @IsArray()
  options?: RentalVariantOptionReq[] = []
}
