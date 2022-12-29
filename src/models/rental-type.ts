import { BeforeInsert, Column, Entity } from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalType extends SoftDeletableEntity {
  @Column()
  value: string

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "ptyp")
  }
}

/**
 * @schema RentalType
 * title: "Rental Type"
 * description: "Rental Type can be added to Rentals for filtering and reporting purposes."
 * type: object
 * required:
 *   - value
 * properties:
 *   id:
 *     type: string
 *     description: The rental type's ID
 *     example: ptyp_01G8X9A7ESKAJXG2H0E6F1MW7A
 *   value:
 *     description: "The value that the Rental Type represents."
 *     type: string
 *     example: Clothing
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
