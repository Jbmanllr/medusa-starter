import { BeforeInsert, Column, Entity } from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalTag extends SoftDeletableEntity {
  @Column()
  value: string

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "ptag")
  }
}

/**
 * @schema RentalTag
 * title: "Rental Tag"
 * description: "Rental Tags can be added to Rentals for easy filtering and grouping."
 * type: object
 * required:
 *   - value
 * properties:
 *   id:
 *     type: string
 *     description: The rental tag's ID
 *     example: ptag_01G8K2MTMG9168F2B70S1TAVK3
 *   value:
 *     description: "The value that the Rental Tag represents"
 *     type: string
 *     example: Pants
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
