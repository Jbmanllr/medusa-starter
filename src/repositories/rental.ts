import { flatten, groupBy, map, merge } from "lodash"
import { Brackets, EntityRepository, FindOperator, In, Repository, SelectQueryBuilder, EntityMetadata} from "typeorm"
import { PriceList, SalesChannel } from "@medusajs/medusa/dist/models"
import { Rental } from "../models"
import { ExtendedFindConfig, Selector, WithRequiredProperty, } from "@medusajs/medusa/dist/types/common"
import { applyOrdering } from "@medusajs/medusa/dist/utils/repository"

export type RentalSelector = Omit<Selector<Rental>, "tags"> & {
  tags: FindOperator<string[]>
}

export type DefaultWithoutRelations = Omit<
  ExtendedFindConfig<Rental, RentalSelector>,
  "relations"
>

export type FindWithoutRelationsOptions = DefaultWithoutRelations & {
  where: DefaultWithoutRelations["where"] & {
    price_list_id?: FindOperator<PriceList>
    sales_channel_id?: FindOperator<SalesChannel>
    discount_condition_id?: string
  }
}

@EntityRepository(Rental)
export class RentalRepository extends Repository<Rental> {
  private mergeEntitiesWithRelations(
    entitiesAndRelations: Array<Partial<Rental>>
  ): Rental[] {
    const entitiesAndRelationsById = groupBy(entitiesAndRelations, "id")
    return map(entitiesAndRelationsById, (entityAndRelations) =>
      merge({}, ...entityAndRelations)
    )
  }

  private async queryRentals(
    optionsWithoutRelations: FindWithoutRelationsOptions,
    shouldCount = false
  ): Promise<[Rental[], number]> {
    const rentalAlias = "rental"

    const tags = optionsWithoutRelations?.where?.tags
    delete optionsWithoutRelations?.where?.tags

    const price_lists = optionsWithoutRelations?.where?.price_list_id
    delete optionsWithoutRelations?.where?.price_list_id

    const sales_channels = optionsWithoutRelations?.where?.sales_channel_id
    delete optionsWithoutRelations?.where?.sales_channel_id

    const discount_condition_id =
      optionsWithoutRelations?.where?.discount_condition_id
    delete optionsWithoutRelations?.where?.discount_condition_id

    const qb = this.createQueryBuilder(rentalAlias)
      .select([`${rentalAlias}.id`])
      .skip(optionsWithoutRelations.skip)
      .take(optionsWithoutRelations.take)

    if (optionsWithoutRelations.where) {
      qb.where(optionsWithoutRelations.where)
    }

    if (tags) {
      qb.leftJoin(`${rentalAlias}.tags`, "tags").andWhere(
        `tags.id IN (:...tag_ids)`,
        {
          tag_ids: tags.value,
        }
      )
    }

    if (price_lists) {
      qb.leftJoin(`${rentalAlias}.variants`, "variants")
        .leftJoin("variants.prices", "prices")
        .andWhere("prices.price_list_id IN (:...price_list_ids)", {
          price_list_ids: price_lists.value,
        })
    }

    if (sales_channels) {
      qb.innerJoin(
        `${rentalAlias}.sales_channels`,
        "sales_channels",
        "sales_channels.id IN (:...sales_channels_ids)",
        { sales_channels_ids: sales_channels.value }
      )
    }

    if (discount_condition_id) {
      qb.innerJoin(
        "discount_condition_rental",
        "dc_rental",
        `dc_rental.rental_id = ${rentalAlias}.id AND dc_rental.condition_id = :dcId`,
        { dcId: discount_condition_id }
      )
    }

    const joinedWithPriceLists = !!price_lists
    applyOrdering({
      repository: this,
      order: optionsWithoutRelations.order ?? {},
      qb,
      alias: rentalAlias,
      shouldJoin: (relation) => relation !== "prices" || !joinedWithPriceLists,
    })

    if (optionsWithoutRelations.withDeleted) {
      qb.withDeleted()
    }

    let entities: Rental[]
    let count = 0
    if (shouldCount) {
      const result = await qb.getManyAndCount()
      entities = result[0]
      count = result[1]
    } else {
      entities = await qb.getMany()
    }

    return [entities, count]
  }

  private getGroupedRelations(relations: string[]): {
    [toplevel: string]: string[]
  } {
    const groupedRelations: { [toplevel: string]: string[] } = {}
    for (const rel of relations) {
      const [topLevel] = rel.split(".")
      if (groupedRelations[topLevel]) {
        groupedRelations[topLevel].push(rel)
      } else {
        groupedRelations[topLevel] = [rel]
      }
    }

    return groupedRelations
  }

  private async queryRentalsWithIds(
    entityIds: string[],
    groupedRelations: { [toplevel: string]: string[] },
    withDeleted = false,
    select: (keyof Rental)[] = [],
    order: { [column: string]: "ASC" | "DESC" } = {}
  ): Promise<Rental[]> {
    const entitiesIdsWithRelations = await Promise.all(
      Object.entries(groupedRelations).map(async ([toplevel, rels]) => {
        let querybuilder = this.createQueryBuilder("rentals")

        if (select && select.length) {
          querybuilder.select(select.map((f) => `rentals.${f}`))
        }

        if (toplevel === "variants") {
          querybuilder = querybuilder.leftJoinAndSelect(
            `rentals.${toplevel}`,
            toplevel,
            "variants.deleted_at IS NULL"
          )

          order["variants.variant_rank"] = "ASC"
        } else {
          querybuilder = querybuilder.leftJoinAndSelect(
            `rentals.${toplevel}`,
            toplevel
          )
        }

        for (const rel of rels) {
          const [_, rest] = rel.split(".")
          if (!rest) {
            continue
          }
          // Regex matches all '.' except the rightmost
          querybuilder = querybuilder.leftJoinAndSelect(
            rel.replace(/\.(?=[^.]*\.)/g, "__"),
            rel.replace(".", "__")
          )
        }

        if (withDeleted) {
          querybuilder = querybuilder
            .where("rentals.id IN (:...entitiesIds)", {
              entitiesIds: entityIds,
            })
            .withDeleted()
        } else {
          querybuilder = querybuilder.where(
            "rentals.deleted_at IS NULL AND rentals.id IN (:...entitiesIds)",
            {
              entitiesIds: entityIds,
            }
          )
        }

        return querybuilder.getMany()
      })
    ).then(flatten)

    return entitiesIdsWithRelations
  }

  public async findWithRelationsAndCount(
    relations: string[] = [],
    idsOrOptionsWithoutRelations: FindWithoutRelationsOptions = { where: {} }
  ): Promise<[Rental[], number]> {
    let count: number
    let entities: Rental[]
    if (Array.isArray(idsOrOptionsWithoutRelations)) {
      entities = await this.findByIds(idsOrOptionsWithoutRelations, {
        withDeleted: idsOrOptionsWithoutRelations.withDeleted ?? false,
      })
      count = entities.length
    } else {
      const result = await this.queryRentals(
        idsOrOptionsWithoutRelations,
        true
      )
      entities = result[0]
      count = result[1]
    }
    const entitiesIds = entities.map(({ id }) => id)

    if (entitiesIds.length === 0) {
      // no need to continue
      return [[], count]
    }

    if (relations.length === 0) {
      const toReturn = await this.findByIds(
        entitiesIds,
        idsOrOptionsWithoutRelations
      )
      return [toReturn, toReturn.length]
    }

    const groupedRelations = this.getGroupedRelations(relations)
    const entitiesIdsWithRelations = await this.queryRentalsWithIds(
      entitiesIds,
      groupedRelations,
      idsOrOptionsWithoutRelations.withDeleted,
      idsOrOptionsWithoutRelations.select,
      idsOrOptionsWithoutRelations.order
    )

    const entitiesAndRelations = groupBy(entitiesIdsWithRelations, "id")
    const entitiesToReturn = map(entitiesIds, (id) =>
      merge({}, ...entitiesAndRelations[id])
    )

    return [entitiesToReturn, count]
  }

  public async findWithRelations(
    relations: string[] = [],
    idsOrOptionsWithoutRelations: FindWithoutRelationsOptions | string[] = {
      where: {},
    },
    withDeleted = false
  ): Promise<Rental[]> {
    let entities: Rental[]
    if (Array.isArray(idsOrOptionsWithoutRelations)) {
      entities = await this.findByIds(idsOrOptionsWithoutRelations, {
        withDeleted,
      })
    } else {
      const result = await this.queryRentals(
        idsOrOptionsWithoutRelations,
        false
      )
      entities = result[0]
    }
    const entitiesIds = entities.map(({ id }) => id)

    if (entitiesIds.length === 0) {
      // no need to continue
      return []
    }

    if (
      relations.length === 0 &&
      !Array.isArray(idsOrOptionsWithoutRelations)
    ) {
      return await this.findByIds(entitiesIds, idsOrOptionsWithoutRelations)
    }

    const groupedRelations = this.getGroupedRelations(relations)
    const entitiesIdsWithRelations = await this.queryRentalsWithIds(
      entitiesIds,
      groupedRelations,
      withDeleted
    )

    const entitiesAndRelations = entitiesIdsWithRelations.concat(entities)
    const entitiesToReturn =
      this.mergeEntitiesWithRelations(entitiesAndRelations)

    return entitiesToReturn
  }

  public async findOneWithRelations(
    relations: string[] = [],
    optionsWithoutRelations: FindWithoutRelationsOptions = { where: {} }
  ): Promise<Rental> {
    // Limit 1
    optionsWithoutRelations.take = 1

    const result = await this.findWithRelations(
      relations,
      optionsWithoutRelations
    )
    return result[0]
  }

  public async bulkAddToCollection(
    rentalIds: string[],
    collectionId: string
  ): Promise<Rental[]> {
    await this.createQueryBuilder()
      .update(Rental)
      .set({ collection_id: collectionId })
      .where({ id: In(rentalIds) })
      .execute()

    return this.findByIds(rentalIds)
  }

  public async bulkRemoveFromCollection(
    rentalIds: string[],
    collectionId: string
  ): Promise<Rental[]> {
    await this.createQueryBuilder()
      .update(Rental)
      .set({ collection_id: null })
      .where({ id: In(rentalIds), collection_id: collectionId })
      .execute()

    return this.findByIds(rentalIds)
  }

  public async getFreeTextSearchResultsAndCount(
    q: string,
    options: FindWithoutRelationsOptions = { where: {} },
    relations: string[] = []
  ): Promise<[Rental[], number]> {
    const rentalAlias = "rental"
    const pricesAlias = "prices"
    const variantsAlias = "variants"
    const collectionAlias = "collection"
    const tagsAlias = "tags"

    const tags = options.where.tags
    delete options.where.tags

    const price_lists = options.where.price_list_id
    delete options.where.price_list_id

    const sales_channels = options.where.sales_channel_id
    delete options.where.sales_channel_id

    const discount_condition_id = options.where.discount_condition_id
    delete options.where.discount_condition_id

    const cleanedOptions = this._cleanOptions(options)

    let qb = this.createQueryBuilder(`${rentalAlias}`)
      .leftJoinAndSelect(`${rentalAlias}.variants`, variantsAlias)
      .leftJoinAndSelect(`${rentalAlias}.collection`, `${collectionAlias}`)
      .select([`${rentalAlias}.id`])
      .where(cleanedOptions.where)
      .andWhere(
        new Brackets((qb) => {
          qb.where(`${rentalAlias}.description ILIKE :q`, { q: `%${q}%` })
            .orWhere(`${rentalAlias}.title ILIKE :q`, { q: `%${q}%` })
            .orWhere(`${variantsAlias}.title ILIKE :q`, { q: `%${q}%` })
            .orWhere(`${variantsAlias}.sku ILIKE :q`, { q: `%${q}%` })
            .orWhere(`${collectionAlias}.title ILIKE :q`, { q: `%${q}%` })
        })
      )
      .skip(cleanedOptions.skip)
      .take(cleanedOptions.take)

    if (discount_condition_id) {
      qb.innerJoin(
        "discount_condition_rental",
        "dc_rental",
        `dc_rental.rental_id = ${rentalAlias}.id AND dc_rental.condition_id = :dcId`,
        { dcId: discount_condition_id }
      )
    }

    if (tags) {
      qb.leftJoin(`${rentalAlias}.tags`, tagsAlias).andWhere(
        `${tagsAlias}.id IN (:...tag_ids)`,
        {
          tag_ids: tags.value,
        }
      )
    }

    if (price_lists) {
      const variantPricesAlias = `${variantsAlias}_prices`
      qb.leftJoin(`${rentalAlias}.variants`, variantPricesAlias)
        .leftJoin(`${variantPricesAlias}.prices`, pricesAlias)
        .andWhere(`${pricesAlias}.price_list_id IN (:...price_list_ids)`, {
          price_list_ids: price_lists.value,
        })
    }

    if (sales_channels) {
      qb.innerJoin(
        `${rentalAlias}.sales_channels`,
        "sales_channels",
        "sales_channels.id IN (:...sales_channels_ids)",
        { sales_channels_ids: sales_channels.value }
      )
    }

    const joinedWithTags = !!tags
    const joinedWithPriceLists = !!price_lists
    applyOrdering({
      repository: this,
      order: options.order ?? {},
      qb,
      alias: rentalAlias,
      shouldJoin: (relation) =>
        relation !== variantsAlias &&
        (relation !== pricesAlias || !joinedWithPriceLists) &&
        (relation !== tagsAlias || !joinedWithTags),
    })

    if (cleanedOptions.withDeleted) {
      qb = qb.withDeleted()
    }

    const [results, count] = await qb.getManyAndCount()
    const orderedResultsSet = new Set(results.map((p) => p.id))

    const rentals = await this.findWithRelations(
      relations,
      [...orderedResultsSet],
      cleanedOptions.withDeleted
    )
    const rentalsMap = new Map(rentals.map((p) => [p.id, p]))

    // Looping through the orderedResultsSet in order to maintain the original order and assign the data returned by findWithRelations
    const orderedRentals: Rental[] = []
    orderedResultsSet.forEach((id) => {
      orderedRentals.push(rentalsMap.get(id)!)
    })

    return [orderedRentals, count]
  }

  public async isRentalInSalesChannels(
    id: string,
    salesChannelIds: string[]
  ): Promise<boolean> {
    return (
      (await this.createQueryBuilder("rental")
        .leftJoin(
          "rental.sales_channels",
          "sales_channels",
          "sales_channels.id IN (:...salesChannelIds)",
          { salesChannelIds }
        )
        .getCount()) > 0
    )
  }

  private _cleanOptions(
    options: FindWithoutRelationsOptions
  ): WithRequiredProperty<FindWithoutRelationsOptions, "where"> {
    const where = options.where ?? {}
    if ("description" in where) {
      delete where.description
    }
    if ("title" in where) {
      delete where.title
    }

    if ("price_list_id" in where) {
      delete where?.price_list_id
    }

    if ("discount_condition_id" in where) {
      delete where?.discount_condition_id
    }

    return {
      ...options,
      where,
    }
  }
}
