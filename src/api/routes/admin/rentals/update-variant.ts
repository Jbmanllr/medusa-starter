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

import { PricingService } from "@medusajs/medusa/dist/services"

import { Type } from "class-transformer"
import { EntityManager } from "typeorm"
import { PriceSelectionParams } from "@medusajs/medusa/dist/types/price-selection"
import { RentalVariantPricesUpdateReq } from "../../../../types/rental-variant"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [post] /rentals/{id}/variants/{variant_id}
 * operationId: "PostRentalsRentalVariantsVariant"
 * summary: "Update a Rental Variant"
 * description: "Update a Rental Variant."
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} The ID of the Rental.
 *   - (path) variant_id=* {string} The ID of the Rental Variant.
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsRentalVariantsVariantReq"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.updateVariant(rental_id, variant_id, {
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
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals/asfsaf/variants/saaga' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "title": "Color",
 *           "prices": [
 *             {
 *               "amount": 1000,
 *               "currency_code": "eur"
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
  const { id, variant_id } = req.params

  const validated = await validator(
    AdminPostRentalsRentalVariantsVariantReq,
    req.body
  )

  const validatedQueryParams = await validator(PriceSelectionParams, req.query)

  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")
  const rentalVariantService: RentalVariantService = req.scope.resolve(
    "rentalVariantService"
  )

  const manager: EntityManager = req.scope.resolve("manager")
  await manager.transaction(async (transactionManager) => {
    await rentalVariantService
      .withTransaction(transactionManager)
      .update(variant_id, {
        rental_id: id,
        ...validated,
      })
  })

  const rawRental = await rentalService.retrieve(id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
    ...validatedQueryParams,
  })

  const [rental] = await pricingService.setProductPrices([rawRental])

  res.json({ rental })
}

class RentalVariantOptionReq {
  @IsString()
  value: string

  @IsString()
  option_id: string
}

/**
 * @schema AdminPostRentalsRentalVariantsVariantReq
 * type: object
 * required:
 *   - prices
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
 *   allow_backorder:
 *     description: Whether the Rental Variant can be purchased when out of stock.
 *     type: boolean
 *   manage_inventory:
 *     description: Whether Medusa should keep track of the inventory for this Rental Variant.
 *     type: boolean
 *   weight:
 *     description: The weight of the Rental Variant.
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
export class AdminPostRentalsRentalVariantsVariantReq {
  @IsString()
  @IsOptional()
  title?: string

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
  inventory_quantity?: number

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
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RentalVariantPricesUpdateReq)
  prices?: RentalVariantPricesUpdateReq[]

  @Type(() => RentalVariantOptionReq)
  @ValidateNested({ each: true })
  @IsOptional()
  @IsArray()
  options?: RentalVariantOptionReq[] = []
}
