import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { Rental } from "././rental"
import { RentalOptionValue } from "././rental-option-value"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalOption extends SoftDeletableEntity {
  @Column()
  title: string

  @OneToMany(() => RentalOptionValue, (value) => value.option, {
    cascade: ["soft-remove", "remove"],
  })
  values: RentalOptionValue[]

  @Column()
  rental_id: string

  @ManyToOne(() => Rental, (rental) => rental.options)
  @JoinColumn({ name: "rental_id" })
  rental: Rental

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "opt")
  }
}

/**
 * @schema RentalOption
 * title: "Rental Option"
 * description: "Rental Options define properties that may vary between different variants of a Rental. Common Rental Options are \"Size\" and \"Color\", but Medusa doesn't limit what Rental Options that can be defined."
 * type: object
 * required:
 *   - title
 *   - rental_id
 * properties:
 *   id:
 *     type: string
 *     description: The rental option's ID
 *     example: opt_01F0YESHQBZVKCEXJ24BS6PCX3
 *   title:
 *     description: "The title that the Rental Option is defined by (e.g. \"Size\")."
 *     type: string
 *     example: Size
 *   values:
 *     description: The Rental Option Values that are defined for the Rental Option. Available if the relation `values` is expanded.
 *     type: array
 *     items:
 *       $ref: "#/components/schemas/RentalOptionValue"
 *   rental_id:
 *     description: "The ID of the Rental that the Rental Option is defined for."
 *     type: string
 *     example: prod_01G1G5V2MBA328390B5AXJ610F
 *   rental:
 *     description: A rental object. Available if the relation `rental` is expanded.
 *     type: object
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
