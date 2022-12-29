import { IsNumber, IsOptional, IsString } from "class-validator"
import { Request, Response } from "express"

import { RentalVariant } from "../../../../models"
import RentalVariantService from "../../../../services/rental-variant"
import { Type } from "class-transformer"
import { defaultAdminGetRentalsVariantsFields } from "./index"
import { getRetrieveConfig } from "@medusajs/medusa/dist/utils/get-query-config"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [get] /rentals/{id}/variants
 * operationId: "GetRentalsRentalVariants"
 * summary: "List a Rental's Variants"
 * description: "Retrieves a list of the Rental Variants associated with a Rental."
 * x-authenticated: true
 * parameters:
 *   - (path) id=* {string} ID of the rental to search for the variants.
 *   - (query) fields {string} Comma separated string of the column to select.
 *   - (query) expand {string} Comma separated string of the relations to include.
 *   - (query) offset=0 {integer} How many items to skip before the results.
 *   - (query) limit=100 {integer} Limit the number of items returned.
 * x-codeSamples:
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --location --request GET 'https://medusa-url.com/admin/rentals/{id}/variants' \
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
 *             variants:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/RentalVariant"
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
export default async (req: Request, res: Response) => {
  const { id } = req.params

  const { expand, fields, limit, offset } = await validator(
    AdminGetRentalsVariantsParams,
    req.query
  )

  const queryConfig = getRetrieveConfig<RentalVariant>(
    defaultAdminGetRentalsVariantsFields as (keyof RentalVariant)[],
    [],
    [
      ...new Set([
        ...defaultAdminGetRentalsVariantsFields,
        ...(fields?.split(",") ?? []),
      ]),
    ] as (keyof RentalVariant)[],
    expand ? expand?.split(",") : undefined
  )

  const rentalVariantService: RentalVariantService = req.scope.resolve(
    "rentalVariantService"
  )
  const [variants, count] = await rentalVariantService.listAndCount(
    {
      rental_id: id,
    },
    {
      ...queryConfig,
      skip: offset,
      take: limit,
    }
  )

  res.json({
    count,
    variants,
    offset,
    limit,
  })
}

export class AdminGetRentalsVariantsParams {
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
}
