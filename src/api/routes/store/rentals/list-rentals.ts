import { Transform, Type } from "class-transformer"
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"
import RentalService from "../../../../services/rental"
import {
  CartService,
  RegionService,
} from "@medusajs/medusa"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import { PricingService } from "@medusajs/medusa/dist/services"
import { DateComparisonOperator } from "@medusajs/medusa/dist/types/common"
import { PriceSelectionParams } from "@medusajs/medusa/dist/types/price-selection"
import { FeatureFlagDecorators } from "@medusajs/medusa/dist/utils/feature-flag-decorators"
import { optionalBooleanMapper } from "@medusajs/medusa/dist/utils/validators/is-boolean"
import { IsType } from "@medusajs/medusa/dist/utils/validators/is-type"
import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router"
import PublishableAPIKeysFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/publishable-api-keys"

/**
 * @oas [get] /rentals
 * operationId: GetRentals
 * summary: List Rentals
 * description: "Retrieves a list of Rentals."
 * parameters:
 *   - (query) q {string} Query used for searching rentals by title, description, variant's title, variant's sku, and collection's title
 *   - in: query
 *     name: id
 *     style: form
 *     explode: false
 *     description: rental IDs to search for.
 *     schema:
 *       oneOf:
 *         - type: string
 *         - type: array
 *           items:
 *             type: string
 *   - in: query
 *     name: sales_channel_id
 *     style: form
 *     explode: false
 *     description: an array of sales channel IDs to filter the retrieved rentals by.
 *     schema:
 *       type: array
 *       items:
 *         type: string
 *   - in: query
 *     name: collection_id
 *     style: form
 *     explode: false
 *     description: Collection IDs to search for
 *     schema:
 *       type: array
 *       items:
 *         type: string
 *   - in: query
 *     name: type_id
 *     style: form
 *     explode: false
 *     description: Type IDs to search for
 *     schema:
 *       type: array
 *       items:
 *         type: string
 *   - in: query
 *     name: tags
 *     style: form
 *     explode: false
 *     description: Tag IDs to search for
 *     schema:
 *       type: array
 *       items:
 *         type: string
 *   - (query) title {string} title to search for.
 *   - (query) description {string} description to search for.
 *   - (query) handle {string} handle to search for.
 *   - (query) is_giftcard {boolean} Search for giftcards using is_giftcard=true.
 *   - in: query
 *     name: created_at
 *     description: Date comparison for when resulting rentals were created.
 *     schema:
 *       type: object
 *       properties:
 *         lt:
 *            type: string
 *            description: filter by dates less than this date
 *            format: date
 *         gt:
 *            type: string
 *            description: filter by dates greater than this date
 *            format: date
 *         lte:
 *            type: string
 *            description: filter by dates less than or equal to this date
 *            format: date
 *         gte:
 *            type: string
 *            description: filter by dates greater than or equal to this date
 *            format: date
 *   - in: query
 *     name: updated_at
 *     description: Date comparison for when resulting rentals were updated.
 *     schema:
 *       type: object
 *       properties:
 *         lt:
 *            type: string
 *            description: filter by dates less than this date
 *            format: date
 *         gt:
 *            type: string
 *            description: filter by dates greater than this date
 *            format: date
 *         lte:
 *            type: string
 *            description: filter by dates less than or equal to this date
 *            format: date
 *         gte:
 *            type: string
 *            description: filter by dates greater than or equal to this date
 *            format: date
 *   - (query) offset=0 {integer} How many rentals to skip in the result.
 *   - (query) limit=100 {integer} Limit the number of rentals returned.
 *   - (query) expand {string} (Comma separated) Which fields should be expanded in each order of the result.
 *   - (query) fields {string} (Comma separated) Which fields should be included in each order of the result.
 *   - (query) order {string} the field used to order the rentals.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       medusa.rentals.list()
 *       .then(({ rentals, limit, offset, count }) => {
 *         console.log(rentals.length);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --rental --request GET 'https://medusa-url.com/store/rentals'
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
 *             rentals:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: "#/components/schemas/Rental"
 *                   - type: object
 *                     properties:
 *                       variants:
 *                         type: array
 *                         items:
 *                           allOf:
 *                             - $ref: "#/components/schemas/RentalVariant"
 *                             - $ref: "#/components/schemas/RentalVariantPricesFields"
 *             count:
 *               type: integer
 *               description: The total number of items available
 *             offset:
 *               type: integer
 *               description: The number of items skipped before these items
 *             limit:
 *               type: integer
 *               description: The number of items per page
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
  const rentalService: RentalService = req.scope.resolve("rentalService")
  const pricingService: PricingService = req.scope.resolve("pricingService")
  const cartService: CartService = req.scope.resolve("cartService")
  const regionService: RegionService = req.scope.resolve("regionService")

  const validated = req.validatedQuery as StoreGetRentalsParams
  let {
    cart_id,
    region_id: regionId,
    currency_code: currencyCode,
    ...filterableFields
  } = req.filterableFields
  const listConfig = req.listConfig

  // get only published rentals for store endpoint
  filterableFields["status"] = ["published"]

  const featureFlagRouter: FlagRouter = req.scope.resolve("featureFlagRouter")
  if (featureFlagRouter.isFeatureEnabled(PublishableAPIKeysFeatureFlag.key)) {
    if (req.publishableApiKeyScopes?.sales_channel_id.length) {
      filterableFields.sales_channel_id =
        filterableFields.sales_channel_id ||
        req.publishableApiKeyScopes.sales_channel_id

      listConfig.relations.push("sales_channels")
    }
  }

  const [rawRentals, count] = await rentalService.listAndCount(
    filterableFields,
    listConfig
  )

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

  const rentals = await pricingService.setProductPrices(rawRentals, {
    cart_id: cart_id,
    region_id: regionId,
    currency_code: currencyCode,
    customer_id: req.user?.customer_id,
    include_discount_prices: true,
  })

  res.json({
    rentals,
    count,
    offset: validated.offset,
    limit: validated.limit,
  })
}

export class StoreGetRentalsPaginationParams extends PriceSelectionParams {
  @IsString()
  @IsOptional()
  fields?: string

  @IsString()
  @IsOptional()
  expand?: string

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 100

  @IsString()
  @IsOptional()
  order?: string
}

export class StoreGetRentalsParams extends StoreGetRentalsPaginationParams {
  @IsOptional()
  @IsType([String, [String]])
  id?: string | string[]

  @IsString()
  @IsOptional()
  q?: string

  @IsArray()
  @IsOptional()
  collection_id?: string[]

  @IsArray()
  @IsOptional()
  tags?: string[]

  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  handle?: string

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => optionalBooleanMapper.get(value.toLowerCase()))
  is_giftcard?: boolean

  @IsArray()
  @IsOptional()
  type_id?: string[]

  @FeatureFlagDecorators(SalesChannelFeatureFlag.key, [IsOptional(), IsArray()])
  sales_channel_id?: string[]

  @IsOptional()
  @ValidateNested()
  @Type(() => DateComparisonOperator)
  created_at?: DateComparisonOperator

  @IsOptional()
  @ValidateNested()
  @Type(() => DateComparisonOperator)
  updated_at?: DateComparisonOperator
}
