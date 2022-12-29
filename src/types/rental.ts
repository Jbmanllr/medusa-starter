import { Transform, Type } from "class-transformer"
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import {
  Rental,
  RentalOptionValue,
  RentalStatus
} from "../models"
import {
  PriceList,
  SalesChannel,
} from "@medusajs/medusa/dist/models"

import { FeatureFlagDecorators } from "@medusajs/medusa/dist/utils/feature-flag-decorators"
import { optionalBooleanMapper } from "@medusajs/medusa/dist/utils/validators/is-boolean"
import { IsType } from "@medusajs/medusa/dist/utils/validators/is-type"
import { DateComparisonOperator, FindConfig, Selector } from "@medusajs/medusa/dist/types/common"
import { PriceListLoadConfig } from "@medusajs/medusa/dist/types/price-list"
import { FindOperator } from "typeorm"

/**
 * API Level DTOs + Validation rules
 */
export class FilterableRentalProps {
  @IsOptional()
  @IsType([String, [String]])
  id?: string | string[]

  @IsString()
  @IsOptional()
  q?: string

  @IsOptional()
  @IsEnum(RentalStatus, { each: true })
  status?: RentalStatus[]

  @IsArray()
  @IsOptional()
  price_list_id?: string[]

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

  @IsString()
  @IsOptional()
  discount_condition_id?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => DateComparisonOperator)
  created_at?: DateComparisonOperator

  @IsOptional()
  @ValidateNested()
  @Type(() => DateComparisonOperator)
  updated_at?: DateComparisonOperator

  @ValidateNested()
  @IsOptional()
  @Type(() => DateComparisonOperator)
  deleted_at?: DateComparisonOperator
}

export type RentalSelector =
  | FilterableRentalProps
  | (Selector<Rental> & {
      q?: string
      discount_condition_id?: string
      price_list_id?: string[] | FindOperator<PriceList>
      sales_channel_id?: string[] | FindOperator<SalesChannel>
    })

/**
 * Service Level DTOs
 */

export type CreateRentalInput = {
  title: string
  subtitle?: string
  profile_id?: string
  description?: string
  is_giftcard?: boolean
  discountable?: boolean
  images?: string[]
  thumbnail?: string
  handle?: string
  status?: RentalStatus
  type?: CreateRentalRentalTypeInput
  collection_id?: string
  tags?: CreateRentalRentalTagInput[]
  options?: CreateRentalRentalOption[]
  variants?: CreateRentalRentalVariantInput[]
  sales_channels?: CreateRentalRentalSalesChannelInput[] | null
  weight?: number
  length?: number
  height?: number
  width?: number
  hs_code?: string
  origin_country?: string
  mid_code?: string
  material?: string
  metadata?: Record<string, unknown>
}

export type CreateRentalRentalTagInput = {
  id?: string
  value: string
}

export type CreateRentalRentalSalesChannelInput = {
  id: string
}

export type CreateRentalRentalTypeInput = {
  id?: string
  value: string
}

export type CreateRentalRentalVariantInput = {
  title: string
  sku?: string
  ean?: string
  upc?: string
  barcode?: string
  hs_code?: string
  inventory_quantity?: number
  allow_backorder?: boolean
  manage_inventory?: boolean
  weight?: number
  length?: number
  height?: number
  width?: number
  origin_country?: string
  mid_code?: string
  material?: string
  metadata?: Record<string, unknown>
  prices?: CreateRentalRentalVariantPriceInput[]
  options?: { value: string }[]
}

export type UpdateRentalRentalVariantDTO = {
  id?: string
  title?: string
  sku?: string
  ean?: string
  upc?: string
  barcode?: string
  hs_code?: string
  inventory_quantity?: number
  allow_backorder?: boolean
  manage_inventory?: boolean
  weight?: number
  length?: number
  height?: number
  width?: number
  origin_country?: string
  mid_code?: string
  material?: string
  metadata?: Record<string, unknown>
  prices?: CreateRentalRentalVariantPriceInput[]
  options?: { value: string; option_id: string }[]
}

export type CreateRentalRentalOption = {
  title: string
}

export type CreateRentalRentalVariantPriceInput = {
  region_id?: string
  currency_code?: string
  amount: number
  min_quantity?: number
  max_quantity?: number
}

export type UpdateRentalInput = Omit<
  Partial<CreateRentalInput>,
  "variants"
> & {
  variants?: UpdateRentalRentalVariantDTO[]
}

export type RentalOptionInput = {
  title: string
  values?: RentalOptionValue[]
}

export type FindRentalConfig = FindConfig<Rental> & PriceListLoadConfig

export class RentalSalesChannelReq {
  @IsString()
  id: string
}

export class RentalTagReq {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  value: string
}

export class RentalTypeReq {
  @IsString()
  @IsOptional()
  id?: string

  @IsString()
  value: string
}
