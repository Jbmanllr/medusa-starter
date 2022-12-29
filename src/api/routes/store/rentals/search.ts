import { IsNumber, IsOptional, IsString } from "class-validator"

import RentalService from "../../../../services/rental"
import { SearchService } from "@medusajs/medusa"
import { Type } from "class-transformer"
import { validator } from "@medusajs/medusa/dist/utils/validator"

/**
 * @oas [post] /rentals/search
 * operationId: PostRentalsSearch
 * summary: Search Rentals
 * description: "Run a search query on rentals using the search engine installed on Medusa"
 * parameters:
 *   - (query) q=* {string} The query to run the search with.
 *   - (query) offset {integer} How many rentals to skip in the result.
 *   - (query) limit {integer} Limit the number of rentals returned.
 *   - (query) filter {} Filter based on the search engine.
 * x-codeSamples:
 *   - lang: JavaScript
 *     label: JS Client
 *     source: |
 *       import Medusa from "@medusajs/medusa-js"
 *       const medusa = new Medusa({ baseUrl: MEDUSA_BACKEND_URL, maxRetries: 3 })
 *       medusa.rentals.search({
 *         q: 'Shirt'
 *       })
 *       .then(({ hits }) => {
 *         console.log(hits.length);
 *       });
 *   - lang: Shell
 *     label: cURL
 *     source: |
 *       curl --rental --request POST 'https://medusa-url.com/store/rentals/search?q=Shirt'
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
 *             hits:
 *               type: array
 *               description: Array of results. The format of the items depends on the search engine installed on the server.
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
  // As we want to allow wildcards, we pass a config allowing this
  const validated = await validator(StorePostSearchReq, req.body, {
    whitelist: false,
    forbidNonWhitelisted: false,
  })

  const { q, offset, limit, filter, ...options } = validated

  const paginationOptions = { offset, limit }

  const searchService: SearchService = req.scope.resolve("searchService")

  const results = await searchService.search(RentalService.IndexName, q, {
    paginationOptions,
    filter,
    additionalOptions: options,
  })

  res.status(200).send(results)
}

export class StorePostSearchReq {
  @IsOptional()
  @IsString()
  q?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number

  @IsOptional()
  filter?: unknown
}
