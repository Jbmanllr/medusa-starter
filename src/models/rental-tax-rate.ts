import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm"
import { DbAwareColumn, resolveDbType } from "@medusajs/medusa/dist/utils/db-aware-column"

import { Rental } from "././rental"
import { TaxRate } from "@medusajs/medusa/dist/models/tax-rate"

@Entity()
export class RentalTaxRate {
  @PrimaryColumn()
  rental_id: string

  @PrimaryColumn()
  rate_id: string

  @ManyToOne(() => Rental, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rental_id" })
  rental?: Rental

  // Note the onDelete config here
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
 * @schema RentalTaxRate
 * title: "Rental Tax Rate"
 * description: "Associates a tax rate with a rental to indicate that the rental is taxed in a certain way"
 * type: object
 * required:
 *   - rental_id
 *   - rate_id
 * properties:
 *   rental_id:
 *     description: "The ID of the Rental"
 *     type: string
 *     example: prod_01G1G5V2MBA328390B5AXJ610F
 *   rental:
 *     description: Available if the relation `rental` is expanded.
 *     $ref: "#/components/schemas/Rental"
 *   rate_id:
 *     description: "The ID of the Tax Rate"
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
