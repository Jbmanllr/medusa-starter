import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { MoneyAmount } from "@medusajs/medusa/dist/models/money-amount"
import { Rental } from "././rental"
import { RentalOptionValue } from "././rental-option-value"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalVariant extends SoftDeletableEntity {
  @Column()
  title: string

  @Index()
  @Column()
  rental_id: string

  @ManyToOne(() => Rental, (rental) => rental.variants, { eager: true })
  @JoinColumn({ name: "rental_id" })
  rental: Rental

  @OneToMany(() => MoneyAmount, (ma) => ma.variant, {
    cascade: true,
    onDelete: "CASCADE",
  })
  prices: MoneyAmount[]

  @Column({ nullable: true })
  @Index({ unique: true, where: "deleted_at IS NULL" })
  sku: string

  @Column({ nullable: true })
  @Index({ unique: true, where: "deleted_at IS NULL" })
  barcode: string

  @Column({ nullable: true })
  @Index({ unique: true, where: "deleted_at IS NULL" })
  ean: string

  @Column({ nullable: true })
  @Index({ unique: true, where: "deleted_at IS NULL" })
  upc: string

  @Column({ nullable: true, default: 0, select: false })
  variant_rank: number

  @Column({ type: "int" })
  inventory_quantity: number

  @Column({ default: false })
  allow_backorder: boolean

  @Column({ default: true })
  manage_inventory: boolean

  @Column({ nullable: true })
  hs_code: string

  @Column({ nullable: true })
  origin_country: string

  @Column({ nullable: true })
  mid_code: string

  @Column({ nullable: true })
  material: string

  @Column({ type: "int", nullable: true })
  weight: number

  @Column({ type: "int", nullable: true })
  length: number

  @Column({ type: "int", nullable: true })
  height: number

  @Column({ type: "int", nullable: true })
  width: number

  @OneToMany(() => RentalOptionValue, (optionValue) => optionValue.variant, {
    cascade: true,
  })
  options: RentalOptionValue[]

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "variant")
  }
}

/**
 * @schema RentalVariant
 * title: "Rental Variant"
 * description: "Rental Variants represent a Rental with a specific set of Rental Option configurations. The maximum number of Rental Variants that a Rental can have is given by the number of available Rental Option combinations."
 * type: object
 * required:
 *   - title
 *   - rental_id
 *   - inventory_quantity
 * properties:
 *   id:
 *     type: string
 *     description: The rental variant's ID
 *     example: variant_01G1G5V2MRX2V3PVSR2WXYPFB6
 *   title:
 *     description: "A title that can be displayed for easy identification of the Rental Variant."
 *     type: string
 *     example: Small
 *   rental_id:
 *     description: "The ID of the Rental that the Rental Variant belongs to."
 *     type: string
 *     example: prod_01G1G5V2MBA328390B5AXJ610F
 *   rental:
 *     description: A rental object. Available if the relation `rental` is expanded.
 *     type: object
 *   prices:
 *     description: The Money Amounts defined for the Rental Variant. Each Money Amount represents a price in a given currency or a price in a specific Region. Available if the relation `prices` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/MoneyAmount"
 *   sku:
 *     description: "The unique stock keeping unit used to identify the Rental Variant. This will usually be a unqiue identifer for the item that is to be shipped, and can be referenced across multiple systems."
 *     type: string
 *     example: shirt-123
 *   barcode:
 *     description: "A generic field for a GTIN number that can be used to identify the Rental Variant."
 *     type: string
 *     example: null
 *   ean:
 *     description: "An EAN barcode number that can be used to identify the Rental Variant."
 *     type: string
 *     example: null
 *   upc:
 *     description: "A UPC barcode number that can be used to identify the Rental Variant."
 *     type: string
 *     example: null
 *   variant_rank:
 *     description: The ranking of this variant
 *     type: number
 *     default: 0
 *   inventory_quantity:
 *     description: "The current quantity of the item that is stocked."
 *     type: integer
 *     example: 100
 *   allow_backorder:
 *     description: "Whether the Rental Variant should be purchasable when `inventory_quantity` is 0."
 *     type: boolean
 *     default: false
 *   manage_inventory:
 *     description: "Whether Medusa should manage inventory for the Rental Variant."
 *     type: boolean
 *     default: true
 *   hs_code:
 *     description: "The Harmonized System code of the Rental Variant. May be used by Fulfillment Providers to pass customs information to shipping carriers."
 *     type: string
 *     example: null
 *   origin_country:
 *     description: "The country in which the Rental Variant was produced. May be used by Fulfillment Providers to pass customs information to shipping carriers."
 *     type: string
 *     example: null
 *   mid_code:
 *     description: "The Manufacturers Identification code that identifies the manufacturer of the Rental Variant. May be used by Fulfillment Providers to pass customs information to shipping carriers."
 *     type: string
 *     example: null
 *   material:
 *     description: "The material and composition that the Rental Variant is made of, May be used by Fulfillment Providers to pass customs information to shipping carriers."
 *     type: string
 *     example: null
 *   weight:
 *     description: "The weight of the Rental Variant. May be used in shipping rate calculations."
 *     type: number
 *     example: null
 *   height:
 *     description: "The height of the Rental Variant. May be used in shipping rate calculations."
 *     type: number
 *     example: null
 *   width:
 *     description: "The width of the Rental Variant. May be used in shipping rate calculations."
 *     type: number
 *     example: null
 *   length:
 *     description: "The length of the Rental Variant. May be used in shipping rate calculations."
 *     type: number
 *     example: null
 *   options:
 *     description: The Rental Option Values specified for the Rental Variant. Available if the relation `options` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/RentalOptionValue"
 *   created_at:
 *     type: string
 *     description: "The date with timezone at which the resource was created."
 *     format: date-time
 *   updated_at:
 *     type: string
 *     description: "The date with timezone at which the resource was updated."
 *     format: date-time
 *   deleted_at:
 *     type: string
 *     description: "The date with timezone at which the resource was deleted."
 *     format: date-time
 *   metadata:
 *     type: object
 *     description: An optional key-value map with additional details
 *     example: {car: "white"}
 */

/**
 * @schema RentalVariantPricesFields
 * title: "Rental Variant Prices Fields"
 * description: "Rental Variants Prices Fields that are only available in some requests."
 * type: object
 * properties:
 *   original_price:
 *     type: number
 *     description: The original price of the variant without any discounted prices applied.
 *   calculated_price:
 *     type: number
 *     description: The calculated price of the variant. Can be a discounted price.
 *   original_price_incl_tax:
 *     type: number
 *     description: The original price of the variant including taxes.
 *   calculated_price_incl_tax:
 *     type: number
 *     description: The calculated price of the variant including taxes.
 *   original_tax:
 *     type: number
 *     description: The taxes applied on the original price.
 *   calculated_tax:
 *     type: number
 *     description: The taxes applied on the calculated price.
 *   tax_rates:
 *     type: array
 *     description: An array of applied tax rates
 *     items:
 *       type: object
 *       properties:
 *         rate:
 *           type: number
 *           description: The tax rate value
 *         name:
 *           type: string
 *           description: The name of the tax rate
 *         code:
 *           type: string
 *           description: The code of the tax rate
 */
