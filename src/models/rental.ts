import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { FeatureFlagDecorators } from "@medusajs/medusa/dist/utils/feature-flag-decorators"
import { Image } from "@medusajs/medusa/dist/models/image"
import { RentalCollection } from "././rental-collection"
import { RentalOption } from "././rental-option"
import { RentalTag } from "././rental-tag"
import { RentalType } from "././rental-type"
import { RentalVariant } from "././rental-variant"
import { SalesChannel } from "@medusajs/medusa/dist/models/sales-channel"
//import { ShippingProfile } from "@medusajs/medusa/dist/models/shipping-profile"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { kebabCase } from "lodash"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

export enum RentalStatus {
  DRAFT = "draft",
  PROPOSED = "proposed",
  PUBLISHED = "published",
  REJECTED = "rejected",
}

@Entity()
export class Rental extends SoftDeletableEntity {
  @Column()
  title: string

  @Column({ type: "text", nullable: true })
  subtitle: string | null

  @Column({ type: "text", nullable: true })
  description: string | null

  @Index({ unique: true, where: "deleted_at IS NULL" })
  @Column({ type: "text", nullable: true })
  handle: string | null

  @Column({ default: false })
  is_giftcard: boolean

  @DbAwareColumn({ type: "enum", enum: RentalStatus, default: "draft" })
  status: RentalStatus

  @ManyToMany(() => Image, { cascade: ["insert"] })
  @JoinTable({
    name: "rental_images",
    joinColumn: {
      name: "rental_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "image_id",
      referencedColumnName: "id",
    },
  })
  images: Image[]

  @Column({ type: "text", nullable: true })
  thumbnail: string | null

  @OneToMany(() => RentalOption, (rentalOption) => rentalOption.rental)
  options: RentalOption[]

  @OneToMany(() => RentalVariant, (variant) => variant.rental, {
    cascade: true,
  })
  variants: RentalVariant[]

  @Index()
  @Column()
  profile_id: string

  //@ManyToOne(() => ShippingProfile)
  //@JoinColumn({ name: "profile_id" })
  //profile: ShippingProfile

  @Column({ type: "int", nullable: true })
  weight: number | null

  @Column({ type: "int", nullable: true })
  length: number | null

  @Column({ type: "int", nullable: true })
  height: number | null

  @Column({ type: "int", nullable: true })
  width: number | null

  @Column({ type: "text", nullable: true })
  hs_code: string | null

  @Column({ type: "text", nullable: true })
  origin_country: string | null

  @Column({ type: "text", nullable: true })
  mid_code: string | null

  @Column({ type: "text", nullable: true })
  material: string | null

  @Column({ type: "text", nullable: true })
  collection_id: string | null

  @ManyToOne(() => RentalCollection)
  @JoinColumn({ name: "collection_id" })
  collection: RentalCollection

  @Column({ type: "text", nullable: true })
  type_id: string | null

  @ManyToOne(() => RentalType)
  @JoinColumn({ name: "type_id" })
  type: RentalType

  @ManyToMany(() => RentalTag)
  @JoinTable({
    name: "rental_tags",
    joinColumn: {
      name: "rental_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "rental_tag_id",
      referencedColumnName: "id",
    },
  })
  tags: RentalTag[]

  @Column({ default: true })
  discountable: boolean

  @Column({ type: "text", nullable: true })
  external_id: string | null

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null

  @FeatureFlagDecorators("sales_channels", [
    ManyToMany(() => SalesChannel, { cascade: ["remove", "soft-remove"] }),
    JoinTable({
      name: "rental_sales_channel",
      joinColumn: {
        name: "rental_id",
        referencedColumnName: "id",
      },
      inverseJoinColumn: {
        name: "sales_channel_id",
        referencedColumnName: "id",
      },
    }),
  ])
  sales_channels: SalesChannel[]

  @BeforeInsert()
  private beforeInsert(): void {
    if (this.id) return

    this.id = generateEntityId(this.id, "rental")
    if (!this.handle) {
      this.handle = kebabCase(this.title)
    }
  }
}

/**
 * @schema Rental
 * title: "Rental"
 * description: "Rentals are a grouping of Rental Variants that have common properties such as images and descriptions. Rentals can have multiple options which define the properties that Rental Variants differ by."
 * type: object
 * required:
 *   - title
 *   - profile_id
 * properties:
 *   id:
 *     type: string
 *     description: The rental's ID
 *     example: prod_01G1G5V2MBA328390B5AXJ610F
 *   title:
 *     description: "A title that can be displayed for easy identification of the Rental."
 *     type: string
 *     example: Medusa Coffee Mug
 *   subtitle:
 *     description: "An optional subtitle that can be used to further specify the Rental."
 *     type: string
 *   description:
 *     description: "A short description of the Rental."
 *     type: string
 *     example: Every programmer's best friend.
 *   handle:
 *     description: "A unique identifier for the Rental (e.g. for slug structure)."
 *     type: string
 *     example: coffee-mug
 *   is_giftcard:
 *     description: "Whether the Rental represents a Gift Card. Rentals that represent Gift Cards will automatically generate a redeemable Gift Card code once they are purchased."
 *     type: boolean
 *     default: false
 *   status:
 *     description: The status of the rental
 *     type: string
 *     enum:
 *       - draft
 *       - proposed
 *       - published
 *       - rejected
 *     default: draft
 *   images:
 *     description: Images of the Rental. Available if the relation `images` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/Image"
 *   thumbnail:
 *     description: "A URL to an image file that can be used to identify the Rental."
 *     type: string
 *     format: uri
 *   options:
 *     description: The Rental Options that are defined for the Rental. Rental Variants of the Rental will have a unique combination of Rental Option Values. Available if the relation `options` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/RentalOption"
 *   variants:
 *     description: The Rental Variants that belong to the Rental. Each will have a unique combination of Rental Option Values. Available if the relation `variants` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/RentalVariant"
 *   profile_id:
 *     description: "The ID of the Shipping Profile that the Rental belongs to. Shipping Profiles have a set of defined Shipping Options that can be used to Fulfill a given set of Rentals."
 *     type: string
 *     example: sp_01G1G5V239ENSZ5MV4JAR737BM
 *   profile:
 *     description: Available if the relation `profile` is expanded.
 *     $ref: "#/components/schemas/ShippingProfile"
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
 *   collection_id:
 *     type: string
 *     description: The Rental Collection that the Rental belongs to
 *     example: pcol_01F0YESBFAZ0DV6V831JXWH0BG
 *   collection:
 *     description: A rental collection object. Available if the relation `collection` is expanded.
 *     type: object
 *   type_id:
 *     type: string
 *     description: The Rental type that the Rental belongs to
 *     example: ptyp_01G8X9A7ESKAJXG2H0E6F1MW7A
 *   type:
 *     description: Available if the relation `type` is expanded.
 *     $ref: "#/components/schemas/RentalType"
 *   tags:
 *     description: The Rental Tags assigned to the Rental. Available if the relation `tags` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/RentalTag"
 *   discountable:
 *     description: "Whether the Rental can be discounted. Discounts will not apply to Line Items of this Rental when this flag is set to `false`."
 *     type: boolean
 *     default: true
 *   external_id:
 *     description: The external ID of the rental
 *     type: string
 *     example: null
 *   sales_channels:
 *     description: The sales channels the rental is associated with. Available if the relation `sales_channels` is expanded.
 *     type: array
 *     items:
 *       type: object
 *       description: A sales channel object.
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
