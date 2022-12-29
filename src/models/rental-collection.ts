import { BeforeInsert, Column, Entity, Index, OneToMany } from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { Rental } from "././rental"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { kebabCase } from "lodash"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalCollection extends SoftDeletableEntity {
  @Column()
  title: string

  @Index({ unique: true, where: "deleted_at IS NULL" })
  @Column({ nullable: true })
  handle: string

  @OneToMany(() => Rental, (rental) => rental.collection)
  rentals: Rental[]

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private createHandleIfNotProvided(): void {
    if (this.id) return

    this.id = generateEntityId(this.id, "pcol")
    if (!this.handle) {
      this.handle = kebabCase(this.title)
    }
  }
}

/**
 * @schema RentalCollection
 * title: "Rental Collection"
 * description: "Rental Collections represents a group of Rentals that are related."
 * type: object
 * required:
 *   - title
 * properties:
 *   id:
 *     type: string
 *     description: The rental collection's ID
 *     example: pcol_01F0YESBFAZ0DV6V831JXWH0BG
 *   title:
 *     description: "The title that the Rental Collection is identified by."
 *     type: string
 *     example: Summer Collection
 *   handle:
 *     description: "A unique string that identifies the Rental Collection - can for example be used in slug structures."
 *     type: string
 *     example: summer-collection
 *   rentals:
 *     description: The Rentals contained in the Rental Collection. Available if the relation `rentals` is expanded.
 *     type: array
 *     items:
 *       type: object
 *       description: A rental collection object.
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
