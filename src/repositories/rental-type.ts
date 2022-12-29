import { EntityRepository, Repository } from "typeorm"
import { RentalType } from "../models/rental-type"
import { ExtendedFindConfig, Selector } from "@medusajs/medusa/dist/types/common"

type UpsertTypeInput = Partial<RentalType> & {
  value: string
}

@EntityRepository(RentalType)
export class RentalTypeRepository extends Repository<RentalType> {
  async upsertType(type?: UpsertTypeInput): Promise<RentalType | null> {
    if (!type) {
      return null
    }

    const existing = await this.findOne({
      where: { value: type.value },
    })

    if (existing) {
      return existing
    }

    const created = this.create({
      value: type.value,
    })
    return await this.save(created)
  }

  async findAndCountByDiscountConditionId(
    conditionId: string,
    query: ExtendedFindConfig<RentalType, Selector<RentalType>>
  ): Promise<[RentalType[], number]> {
    const qb = this.createQueryBuilder("pt")

    if (query?.select) {
      qb.select(query.select.map((select) => `pt.${select}`))
    }

    if (query.skip) {
      qb.skip(query.skip)
    }

    if (query.take) {
      qb.take(query.take)
    }

    return await qb
      .where(query.where)
      .innerJoin(
        "discount_condition_rental_type",
        "dc_pt",
        `dc_pt.rental_type_id = pt.id AND dc_pt.condition_id = :dcId`,
        { dcId: conditionId }
      )
      .getManyAndCount()
  }
}
