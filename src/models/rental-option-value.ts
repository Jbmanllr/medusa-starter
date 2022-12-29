import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm"

import { DbAwareColumn } from "@medusajs/medusa/dist/utils/db-aware-column"
import { RentalOption } from "././rental-option"
import { RentalVariant } from "././rental-variant"
import { SoftDeletableEntity } from "@medusajs/medusa"
import { generateEntityId } from "@medusajs/medusa/dist/utils/generate-entity-id"

@Entity()
export class RentalOptionValue extends SoftDeletableEntity {
  @Column()
  value: string

  @Index()
  @Column()
  option_id: string

  @ManyToOne(() => RentalOption, (option) => option.values)
  @JoinColumn({ name: "option_id" })
  option: RentalOption

  @Index()
  @Column()
  variant_id: string

  @ManyToOne(() => RentalVariant, (variant) => variant.options, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "variant_id" })
  variant: RentalVariant

  @DbAwareColumn({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "optval")
  }
}

/**
 * @schema RentalOptionValue
 * title: "Rental Option Value"
 * description: "A value given to a Rental Variant's option set. Rental Variant have a Rental Option Value for each of the Rental Options defined on the Rental."
 * type: object
 * required:
 *   - value
 *   - option_id
 *   - variant_id
 * properties:
 *   id:
 *     type: string
 *     description: The rental option value's ID
 *     example: optval_01F0YESHR7S6ECD03RF6W12DSJ
 *   value:
 *     description: "The value that the Rental Variant has defined for the specific Rental Option (e.g. if the Rental Option is \"Size\" this value could be \"Small\", \"Medium\" or \"Large\")."
 *     type: string
 *     example: large
 *   option_id:
 *     description: "The ID of the Rental Option that the Rental Option Value is defined for."
 *     type: string
 *     example: opt_01F0YESHQBZVKCEXJ24BS6PCX3
 *   option:
 *     description: Available if the relation `option` is expanded.
 *     $ref: "#/components/schemas/RentalOption"
 *   variant_id:
 *     description: "The ID of the Rental Variant that the Rental Option Value is defined for."
 *     type: string
 *     example: variant_01G1G5V2MRX2V3PVSR2WXYPFB6
 *   variant:
 *     description: Available if the relation `variant` is expanded.
 *     $ref: "#/components/schemas/RentalVariant"
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
