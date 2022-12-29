import { EntityRepository, Repository } from "typeorm"
import { RentalCollection } from "../models"
import { ExtendedFindConfig, Selector } from "@medusajs/medusa/dist/types/common"

@EntityRepository(RentalCollection)
// eslint-disable-next-line max-len
export class RentalCollectionRepository extends Repository<RentalCollection> {
  async findAndCountByDiscountConditionId(
    conditionId: string,
    query: ExtendedFindConfig<RentalCollection, Selector<RentalCollection>>
  ): Promise<[RentalCollection[], number]> {
    const qb = this.createQueryBuilder("pc")

    if (query?.select) {
      qb.select(query.select.map((select) => `pc.${select}`))
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
        "discount_condition_rental_collection",
        "dc_pc",
        `dc_pc.rental_collection_id = pc.id AND dc_pc.condition_id = :dcId`,
        { dcId: conditionId }
      )
      .getManyAndCount()
  }
}
