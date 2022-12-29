import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm"
import { DbAwareColumn, resolveDbType } from "@medusajs/medusa/dist/utils/db-aware-column"

import { RentalType } from "././rental-type"
import { TaxRate } from "@medusajs/medusa/dist/models/tax-rate"

@Entity()
export class RentalTypeTaxRate {
  @PrimaryColumn()
  rental_type_id: string

  @PrimaryColumn()
  rate_id: string

  @ManyToOne(() => RentalType, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rental_type_id" })
  rental_type?: RentalType

  @ManyToOne(() => TaxRate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rate_id" })
  tax_rate?: TaxRate

  @CreateDateColumn({ type: resolveDbType("timestamptz") })
  created_at: Date

  @UpdateDateColumn({ type: resolveDbType("timestamptz") })
  updated_at: Date

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>
}

/**
 * @schema RentalTypeTaxRate
 * title: "Rental Type Tax Rate"
 * description: "Associates a tax rate with a rental type to indicate that the rental type is taxed in a certain way"
 * type: object
 * required:
 *   - rental_type_id
 *   - rate_id
 * properties:
 *   rental_type_id:
 *     description: "The ID of the Rental type"
 *     type: string
 *     example: ptyp_01G8X9A7ESKAJXG2H0E6F1MW7A
 *   rental_type:
 *     description: Available if the relation `rental_type` is expanded.
 *     $ref: "#/components/schemas/RentalType"
 *   rate_id:
 *     description: "The id of the Tax Rate"
 *     type: string
 *     example: txr_01G8XDBAWKBHHJRKH0AV02KXBR
 *   tax_rate:
 *     description: Available if the relation `tax_rate` is expanded.
 *     $ref: "#/components/schemas/TaxRate"
 *   created_at:
 *     type: string
 *     description: "The date with timezone at which the resource was created."
 *     format: date-time
 *   updated_at:
 *     type: string
 *     description: "The date with timezone at which the resource was updated."
 *     format: date-time
 *   metadata:
 *     type: object
 *     description: An optional key-value map with additional details
 *     example: {car: "white"}
 */
