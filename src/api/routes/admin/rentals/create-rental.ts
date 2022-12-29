import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"
import { defaultAdminRentalFields, defaultAdminRentalRelations } from "."
import RentalVariantService from "../../../../services/rental-variant"
import RentalService from "../../../../services/rental"
import { PricingService, ShippingProfileService } from "@medusajs/medusa/dist/services"
import {
  RentalSalesChannelReq,
  RentalTagReq,
  RentalTypeReq,
} from "../../../../types/rental"
import {
  CreateRentalVariantInput,
  RentalVariantPricesCreateReq,
} from "../../../../types/rental-variant"

import { Type } from "class-transformer"
import { EntityManager } from "typeorm"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import { RentalStatus } from "../../../../models"
import { FeatureFlagDecorators } from "@medusajs/medusa/dist/utils/feature-flag-decorators"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [post] /rentals
 * operationId: "PostRentals"
 * summary: "Create a Rental"
 * x-authenticated: true
 * description: "Creates a Rental"
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminPostRentalsReq"
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       // must be previously logged in or use api token
 *       medusa.admin.rentals.create({
 *         title: 'Shirt',
 *         is_giftcard: false,
 *         discountable: true
 *       })
 *       .then(({ rental }) => {
 *         console.log(rental.id);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request POST 'https://medusa-url.com/admin/rentals' \
 *       --header 'Authorization: Bearer {api_token}' \
 *       --header 'Content-Type: application/json' \
 *       --data-raw '{
 *           "title": "Shirt"
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
  const validated = await validator(AdminPostRentalsReq, req.body)

  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")
  const rentalVariantService: RentalVariantService = req.scope.resolve(
    "rentalVariantService"
  )
  const shippingProfileService: ShippingProfileService = req.scope.resolve(
    "shippingProfileService"
  )

  const entityManager: EntityManager = req.scope.resolve("manager")

  const newRental = await entityManager.transaction(async (manager) => {
    const { variants } = validated
    delete validated.variants

    if (!validated.thumbnail && validated.images && validated.images.length) {
      validated.thumbnail = validated.images[0]
    }

    let shippingProfile
    // Get default shipping profile
    if (validated.is_giftcard) {
      shippingProfile = await shippingProfileService
        .withTransaction(manager)
        .retrieveGiftCardDefault()
    } else {
      shippingProfile = await shippingProfileService
        .withTransaction(manager)
        .retrieveDefault()
    }

    const newRental = await rentalService
      .withTransaction(manager)
      .create({ ...validated, profile_id: shippingProfile.id })

    if (variants) {
      for (const [i, variant] of variants.entries()) {
        variant["variant_rank"] = i
      }

      const optionIds =
        validated?.options?.map(
          (o) => newRental.options.find((newO) => newO.title === o.title)?.id
        ) || []

      await Promise.all(
        variants.map(async (v) => {
          const variant = {
            ...v,
            options:
              v?.options?.map((o, index) => ({
                ...o,
                option_id: optionIds[index],
              })) || [],
          }

          await rentalVariantService
            .withTransaction(manager)
            .create(newRental.id, variant as CreateRentalVariantInput)
        })
      )
    }

    return newRental
  })

  const rawRental = await rentalService.retrieve(newRental.id, {
    select: defaultAdminRentalFields,
    relations: defaultAdminRentalRelations,
  })

  const [rental] = await pricingService.setProductPrices([rawRental])

  res.json({ rental })
}

class RentalVariantOptionReq {
  @IsString()
  value: string
}

class RentalOptionReq {
  @IsString()
  title: string
}

class RentalVariantReq {
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

/**
 * @schema AdminPostRentalsReq
 * type: object
 * required:
 *   - title
 * properties:
 *   title:
 *     description: "The title of the Rental"
 *     type: string
 *   subtitle:
 *     description: "The subtitle of the Rental"
 *     type: string
 *   description:
 *     description: "A description of the Rental."
 *     type: string
 *   is_giftcard:
 *     description: A flag to indicate if the Rental represents a Gift Card. Purchasing Rentals with this flag set to `true` will result in a Gift Card being created.
 *     type: boolean
 *     default: false
 *   discountable:
 *     description: A flag to indicate if discounts can be applied to the LineItems generated from this Rental
 *     type: boolean
 *     default: true
 *   images:
 *     description: Images of the Rental.
 *     type: array
 *     items:
 *       type: string
 *   thumbnail:
 *     description: The thumbnail to use for the Rental.
 *     type: string
 *   handle:
 *     description: A unique handle to identify the Rental by.
 *     type: string
 *   status:
 *     description: The status of the rental.
 *     type: string
 *     enum: [draft, proposed, published, rejected]
 *     default: draft
 *   type:
 *     description: The Rental Type to associate the Rental with.
 *     type: object
 *     required:
 *       - value
 *     properties:
 *       id:
 *         description: The ID of the Rental Type.
 *         type: string
 *       value:
 *         description: The value of the Rental Type.
 *         type: string
 *   collection_id:
 *     description: The ID of the Collection the Rental should belong to.
 *     type: string
 *   tags:
 *     description: Tags to associate the Rental with.
 *     type: array
 *     items:
 *       required:
 *         - value
 *       properties:
 *         id:
 *           description: The ID of an existing Tag.
 *           type: string
 *         value:
 *           description: The value of the Tag, these will be upserted.
 *           type: string
 *   sales_channels:
 *     description: "[EXPERIMENTAL] Sales channels to associate the Rental with."
 *     type: array
 *     items:
 *       required:
 *         - id
 *       properties:
 *         id:
 *           description: The ID of an existing Sales channel.
 *           type: string
 *   options:
 *     description: The Options that the Rental should have. These define on which properties the Rental's Rental Variants will differ.
 *     type: array
 *     items:
 *       required:
 *         - title
 *       properties:
 *         title:
 *           description: The title to identify the Rental Option by.
 *           type: string
 *   variants:
 *     description: A list of Rental Variants to create with the Rental.
 *     type: array
 *     items:
 *       required:
 *         - title
 *       properties:
 *         title:
 *           description: The title to identify the Rental Variant by.
 *           type: string
 *         sku:
 *           description: The unique SKU for the Rental Variant.
 *           type: string
 *         ean:
 *           description: The EAN number of the item.
 *           type: string
 *         upc:
 *           description: The UPC number of the item.
 *           type: string
 *         barcode:
 *           description: A generic GTIN field for the Rental Variant.
 *           type: string
 *         hs_code:
 *           description: The Harmonized System code for the Rental Variant.
 *           type: string
 *         inventory_quantity:
 *           description: The amount of stock kept for the Rental Variant.
 *           type: integer
 *           default: 0
 *         allow_backorder:
 *           description: Whether the Rental Variant can be purchased when out of stock.
 *           type: boolean
 *         manage_inventory:
 *           description: Whether Medusa should keep track of the inventory for this Rental Variant.
 *           type: boolean
 *         weight:
 *           description: The wieght of the Rental Variant.
 *           type: number
 *         length:
 *           description: The length of the Rental Variant.
 *           type: number
 *         height:
 *           description: The height of the Rental Variant.
 *           type: number
 *         width:
 *           description: The width of the Rental Variant.
 *           type: number
 *         origin_country:
 *           description: The country of origin of the Rental Variant.
 *           type: string
 *         mid_code:
 *           description: The Manufacturer Identification code for the Rental Variant.
 *           type: string
 *         material:
 *           description: The material composition of the Rental Variant.
 *           type: string
 *         metadata:
 *           description: An optional set of key-value pairs with additional information.
 *           type: object
 *         prices:
 *           type: array
 *           items:
 *             required:
 *               - amount
 *             properties:
 *               region_id:
 *                 description: The ID of the Region for which the price is used. Only required if currency_code is not provided.
 *                 type: string
 *               currency_code:
 *                 description: The 3 character ISO currency code for which the price will be used. Only required if region_id is not provided.
 *                 type: string
 *                 externalDocs:
 *                   url: https://en.wikipedia.org/wiki/ISO_4217#Active_codes
 *                   description: See a list of codes.
 *               amount:
 *                 description: The amount to charge for the Rental Variant.
 *                 type: integer
 *               min_quantity:
 *                 description: The minimum quantity for which the price will be used.
 *                 type: integer
 *               max_quantity:
 *                 description: The maximum quantity for which the price will be used.
 *                 type: integer
 *         options:
 *           type: array
 *           items:
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 description: The value to give for the Rental Option at the same index in the Rental's `options` field.
 *                 type: string
 *   weight:
 *     description: The weight of the Rental.
 *     type: number
 *   length:
 *     description: The length of the Rental.
 *     type: number
 *   height:
 *     description: The height of the Rental.
 *     type: number
 *   width:
 *     description: The width of the Rental.
 *     type: number
 *   hs_code:
 *     description: The Harmonized System code for the Rental Variant.
 *     type: string
 *   origin_country:
 *     description: The country of origin of the Rental.
 *     type: string
 *   mid_code:
 *     description: The Manufacturer Identification code for the Rental.
 *     type: string
 *   material:
 *     description: The material composition of the Rental.
 *     type: string
 *   metadata:
 *     description: An optional set of key-value pairs with additional information.
 *     type: object
 */
export class AdminPostRentalsReq {
  @IsString()
  title: string

  @IsString()
  @IsOptional()
  subtitle?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  is_giftcard = false

  @IsBoolean()
  discountable = true

  @IsArray()
  @IsOptional()
  images?: string[]

  @IsString()
  @IsOptional()
  thumbnail?: string

  @IsString()
  @IsOptional()
  handle?: string

  @IsOptional()
  @IsEnum(RentalStatus)
  status?: RentalStatus = RentalStatus.DRAFT

  @IsOptional()
  @Type(() => RentalTypeReq)
  @ValidateNested()
  type?: RentalTypeReq

  @IsOptional()
  @IsString()
  collection_id?: string

  @IsOptional()
  @Type(() => RentalTagReq)
  @ValidateNested({ each: true })
  @IsArray()
  tags?: RentalTagReq[]

  @FeatureFlagDecorators(SalesChannelFeatureFlag.key, [
    IsOptional(),
    Type(() => RentalSalesChannelReq),
    ValidateNested({ each: true }),
    IsArray(),
  ])
  sales_channels?: RentalSalesChannelReq[]

  @IsOptional()
  @Type(() => RentalOptionReq)
  @ValidateNested({ each: true })
  @IsArray()
  options?: RentalOptionReq[]

  @IsOptional()
  @Type(() => RentalVariantReq)
  @ValidateNested({ each: true })
  @IsArray()
  variants?: RentalVariantReq[]

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
  hs_code?: string

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
}
