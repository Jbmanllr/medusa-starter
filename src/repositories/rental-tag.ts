import { EntityRepository, In, Repository } from "typeorm"
import { RentalTag } from "../models/rental-tag"
import { ExtendedFindConfig, Selector } from "@medusajs/medusa/dist/types/common"

type UpsertTagsInput = (Partial<RentalTag> & {
  value: string
})[]

type RentalTagSelector = Partial<RentalTag> & {
  q?: string
  discount_condition_id?: string
}

export type DefaultWithoutRelations = Omit<
  ExtendedFindConfig<RentalTag, RentalTagSelector>,
  "relations"
>

export type FindWithoutRelationsOptions = DefaultWithoutRelations & {
  where: DefaultWithoutRelations["where"] & {
    discount_condition_id?: string
  }
}

@EntityRepository(RentalTag)
export class RentalTagRepository extends Repository<RentalTag> {
  public async listTagsByUsage(count = 10): Promise<RentalTag[]> {
    return await this.query(
      `
          SELECT id, COUNT(pts.rental_tag_id) as usage_count, pt.value
          FROM rental_tag pt
                   LEFT JOIN rental_tags pts ON pt.id = pts.rental_tag_id
          GROUP BY id
          ORDER BY usage_count DESC
              LIMIT $1
      `,
      [count]
    )
  }

  public async upsertTags(tags: UpsertTagsInput): Promise<RentalTag[]> {
    const tagsValues = tags.map((tag) => tag.value)
    const existingTags = await this.find({
      where: {
        value: In(tagsValues),
      },
    })
    const existingTagsMap = new Map(
      existingTags.map<[string, RentalTag]>((tag) => [tag.value, tag])
    )

    const upsertedTags: RentalTag[] = []

    for (const tag of tags) {
      const aTag = existingTagsMap.get(tag.value)
      if (aTag) {
        upsertedTags.push(aTag)
      } else {
        const newTag = this.create(tag)
        const savedTag = await this.save(newTag)
        upsertedTags.push(savedTag)
      }
    }

    return upsertedTags
  }

  async findAndCountByDiscountConditionId(
    conditionId: string,
    query: ExtendedFindConfig<RentalTag, Selector<RentalTag>>
  ) {
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
        "discount_condition_rental_tag",
        "dc_pt",
        `dc_pt.rental_tag_id = pt.id AND dc_pt.condition_id = :dcId`,
        { dcId: conditionId }
      )
      .getManyAndCount()
  }
}
