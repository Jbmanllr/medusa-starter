import { FlagRouter } from "@medusajs/medusa/dist/utils/flag-router"

import { MedusaError, isDefined } from "medusa-core-utils"
import { EntityManager } from "typeorm"
import { SearchService } from "@medusajs/medusa"
import RentalVariantService from "./rental-variant"
import { TransactionBaseService } from "@medusajs/medusa/dist/interfaces"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
import {
  Rental,
  RentalOption,
  RentalTag,
  RentalType,
  RentalVariant
} from "../models"
import { SalesChannel } from "@medusajs/medusa/dist/models"
import { ImageRepository } from "@medusajs/medusa/dist/repositories/image"
import {
  FindWithoutRelationsOptions,
  RentalRepository,
} from "../repositories/rental"
import { RentalOptionRepository } from "../repositories/rental-option"
import { RentalTagRepository } from "../repositories/rental-tag"
import { RentalTypeRepository } from "../repositories/rental-type"
import { RentalVariantRepository } from "../repositories/rental-variant"
import { Selector } from "@medusajs/medusa/dist/types/common"
import {
  CreateRentalInput,
  FilterableRentalProps,
  FindRentalConfig,
  RentalOptionInput, 
  RentalSelector,
  UpdateRentalInput,
} from "../types/rental"
import { buildQuery, setMetadata } from "@medusajs/medusa/dist/utils"
import EventBusService from "@medusajs/medusa/dist/services/event-bus"

type InjectedDependencies = {
  manager: EntityManager
  rentalOptionRepository: typeof RentalOptionRepository
  rentalRepository: typeof RentalRepository
  rentalVariantRepository: typeof RentalVariantRepository
  rentalTypeRepository: typeof RentalTypeRepository
  rentalTagRepository: typeof RentalTagRepository
  imageRepository: typeof ImageRepository
  rentalVariantService: RentalVariantService
  searchService: SearchService
  eventBusService: EventBusService
  featureFlagRouter: FlagRouter
}

class RentalService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly rentalOptionRepository_: typeof RentalOptionRepository
  protected readonly rentalRepository_: typeof RentalRepository
  protected readonly rentalVariantRepository_: typeof RentalVariantRepository
  protected readonly rentalTypeRepository_: typeof RentalTypeRepository
  protected readonly rentalTagRepository_: typeof RentalTagRepository
  protected readonly imageRepository_: typeof ImageRepository
  protected readonly rentalVariantService_: RentalVariantService
  protected readonly searchService_: SearchService
  protected readonly eventBus_: EventBusService
  protected readonly featureFlagRouter_: FlagRouter

  static readonly IndexName = `rentals`
  static readonly Events = {
    UPDATED: "rental.updated",
    CREATED: "rental.created",
    DELETED: "rental.deleted",
  }

  constructor({
    manager,
    rentalOptionRepository,
    rentalRepository,
    rentalVariantRepository,
    eventBusService,
    rentalVariantService,
    rentalTypeRepository,
    rentalTagRepository,
    imageRepository,
    searchService,
    featureFlagRouter,
  }: InjectedDependencies) {
    // eslint-disable-next-line prefer-rest-params
    super(arguments[0])

    this.manager_ = manager
    this.rentalOptionRepository_ = rentalOptionRepository
    this.rentalRepository_ = rentalRepository
    this.rentalVariantRepository_ = rentalVariantRepository
    this.eventBus_ = eventBusService
    this.rentalVariantService_ = rentalVariantService
    this.rentalTypeRepository_ = rentalTypeRepository
    this.rentalTagRepository_ = rentalTagRepository
    this.imageRepository_ = imageRepository
    this.searchService_ = searchService
    this.featureFlagRouter_ = featureFlagRouter
  }

  /**
   * Lists rentals based on the provided parameters.
   * @param selector - an object that defines rules to filter rentals
   *   by
   * @param config - object that defines the scope for what should be
   *   returned
   * @return the result of the find operation
   */
  async list(
    selector: RentalSelector,
    config: FindRentalConfig = {
      relations: [],
      skip: 0,
      take: 20,
      include_discount_prices: false,
    }
  ): Promise<Rental[]> {
    const [rentals] = await this.listAndCount(selector, config)
    return rentals
  }

  /**
   * Lists rentals based on the provided parameters and includes the count of
   * rentals that match the query.
   * @param selector - an object that defines rules to filter rentals
   *   by
   * @param config - object that defines the scope for what should be
   *   returned
   * @return an array containing the rentals as
   *   the first element and the total count of rentals that matches the query
   *   as the second element.
   */
  async listAndCount(
    selector: RentalSelector,
    config: FindRentalConfig = {
      relations: [],
      skip: 0,
      take: 20,
      include_discount_prices: false,
    }
  ): Promise<[Rental[], number]> {
    const manager = this.manager_
    const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

    const { q, query, relations } = this.prepareListQuery_(selector, config)

    if (q) {
      return await rentalRepo.getFreeTextSearchResultsAndCount(
        q,
        query,
        relations
      )
    }

    return await rentalRepo.findWithRelationsAndCount(relations, query)
  }

  /**
   * Return the total number of documents in database
   * @param {object} selector - the selector to choose rentals by
   * @return {Promise} the result of the count operation
   */
  async count(selector: Selector<Rental> = {}): Promise<number> {
    const manager = this.manager_
    const rentalRepo = manager.getCustomRepository(this.rentalRepository_)
    const query = buildQuery(selector)
    return await rentalRepo.count(query)
  }

  /**
   * Gets a rental by id.
   * Throws in case of DB Error and if rental was not found.
   * @param rentalId - id of the rental to get.
   * @param config - object that defines what should be included in the
   *   query response
   * @return the result of the find one operation.
   */
  async retrieve(
    rentalId: string,
    config: FindRentalConfig = {
      include_discount_prices: false,
    }
  ): Promise<Rental> {
    if (!isDefined(rentalId)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `"rentalId" must be defined`
      )
    }

    return await this.retrieve_({ id: rentalId }, config)
  }

  /**
   * Gets a rental by handle.
   * Throws in case of DB Error and if rental was not found.
   * @param rentalHandle - handle of the rental to get.
   * @param config - details about what to get from the rental
   * @return the result of the find one operation.
   */
  async retrieveByHandle(
    rentalHandle: string,
    config: FindRentalConfig = {}
  ): Promise<Rental> {
    if (!isDefined(rentalHandle)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `"rentalHandle" must be defined`
      )
    }

    return await this.retrieve_({ handle: rentalHandle }, config)
  }

  /**
   * Gets a rental by external id.
   * Throws in case of DB Error and if rental was not found.
   * @param externalId - handle of the rental to get.
   * @param config - details about what to get from the rental
   * @return the result of the find one operation.
   */
  async retrieveByExternalId(
    externalId: string,
    config: FindRentalConfig = {}
  ): Promise<Rental> {
    if (!isDefined(externalId)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `"externalId" must be defined`
      )
    }

    return await this.retrieve_({ external_id: externalId }, config)
  }

  /**
   * Gets a rental by selector.
   * Throws in case of DB Error and if rental was not found.
   * @param selector - selector object
   * @param config - object that defines what should be included in the
   *   query response
   * @return the result of the find one operation.
   */
  async retrieve_(
    selector: Selector<Rental>,
    config: FindRentalConfig = {
      include_discount_prices: false,
    }
  ): Promise<Rental> {
    const manager = this.manager_
    const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

    const { relations, ...query } = buildQuery(selector, config)

    const rental = await rentalRepo.findOneWithRelations(
      relations,
      query as FindWithoutRelationsOptions
    )

    if (!rental) {
      const selectorConstraints = Object.entries(selector)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")

      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Rental with ${selectorConstraints} was not found`
      )
    }

    return rental
  }

  /**
   * Gets all variants belonging to a rental.
   * @param rentalId - the id of the rental to get variants from.
   * @param config - The config to select and configure relations etc...
   * @return an array of variants
   */
  async retrieveVariants(
    rentalId: string,
    config: FindRentalConfig = {
      skip: 0,
      take: 50,
    }
  ): Promise<RentalVariant[]> {
    const givenRelations = config.relations ?? []
    const requiredRelations = ["variants"]
    const relationsSet = new Set([...givenRelations, ...requiredRelations])

    const rental = await this.retrieve(rentalId, {
      ...config,
      relations: [...relationsSet],
    })
    return rental.variants
  }

  async filterRentalsBySalesChannel(
    rentalIds: string[],
    salesChannelId: string,
    config: FindRentalConfig = {
      skip: 0,
      take: 50,
    }
  ): Promise<Rental[]> {
    const givenRelations = config.relations ?? []
    const requiredRelations = ["sales_channels"]
    const relationsSet = new Set([...givenRelations, ...requiredRelations])

    const rentals = await this.list(
      {
        id: rentalIds,
      },
      {
        ...config,
        relations: [...relationsSet],
      }
    )
    const rentalSalesChannelsMap = new Map<string, SalesChannel[]>(
      rentals.map((rental) => [rental.id, rental.sales_channels])
    )
    return rentals.filter((rental) => {
      return rentalSalesChannelsMap
        .get(rental.id)
        ?.some((sc) => sc.id === salesChannelId)
    })
  }

  async listTypes(): Promise<RentalType[]> {
    const manager = this.manager_
    const rentalTypeRepository = manager.getCustomRepository(
      this.rentalTypeRepository_
    )

    return await rentalTypeRepository.find({})
  }

  async listTagsByUsage(count = 10): Promise<RentalTag[]> {
    const manager = this.manager_
    const rentalTagRepo = manager.getCustomRepository(
      this.rentalTagRepository_
    )

    return await rentalTagRepo.listTagsByUsage(count)
  }

  /**
   * Check if the rental is assigned to at least one of the provided sales channels.
   *
   * @param id - rental id
   * @param salesChannelIds - an array of sales channel ids
   */
  async isRentalInSalesChannels(
    id: string,
    salesChannelIds: string[]
  ): Promise<boolean> {
    const rental = await this.retrieve_(
      { id },
      { relations: ["sales_channels"] }
    )

    // TODO: reimplement this to use db level check
    const rentalsSalesChannels = rental.sales_channels.map(
      (channel) => channel.id
    )

    return rentalsSalesChannels.some((id) => salesChannelIds.includes(id))
  }

  /**
   * Creates a rental.
   * @param rentalObject - the rental to create
   * @return resolves to the creation result.
   */
  async create(rentalObject: CreateRentalInput): Promise<Rental> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)
      const rentalTagRepo = manager.getCustomRepository(
        this.rentalTagRepository_
      )
      const rentalTypeRepo = manager.getCustomRepository(
        this.rentalTypeRepository_
      )
      const imageRepo = manager.getCustomRepository(this.imageRepository_)
      const optionRepo = manager.getCustomRepository(
        this.rentalOptionRepository_
      )

      const {
        options,
        tags,
        type,
        images,
        sales_channels: salesChannels,
        ...rest
      } = rentalObject

      if (!rest.thumbnail && images?.length) {
        rest.thumbnail = images[0]
      }

      // if rental is a giftcard, we should disallow discounts
      if (rest.is_giftcard) {
        rest.discountable = false
      }

      let rental = rentalRepo.create(rest)

      if (images?.length) {
        rental.images = await imageRepo.upsertImages(images)
      }

      if (tags?.length) {
        rental.tags = await rentalTagRepo.upsertTags(tags)
      }

      if (typeof type !== `undefined`) {
        rental.type_id = (await rentalTypeRepo.upsertType(type))?.id || null
      }

      if (
        this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key)
      ) {
        if (isDefined(salesChannels)) {
          rental.sales_channels = []
          if (salesChannels?.length) {
            const salesChannelIds = salesChannels?.map((sc) => sc.id)
            rental.sales_channels = salesChannelIds?.map(
              (id) => ({ id } as SalesChannel)
            )
          }
        }
      }

      rental = await rentalRepo.save(rental)

      rental.options = await Promise.all(
        (options ?? []).map(async (option) => {
          const res = optionRepo.create({
            ...option,
            rental_id: rental.id,
          })
          await optionRepo.save(res)
          return res
        })
      )

      const result = await this.retrieve(rental.id, {
        relations: ["options"],
      })

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.CREATED, {
          id: result.id,
        })
      return result
    })
  }

  /**
   * Updates a rental. Rental variant updates should use dedicated methods,
   * e.g. `addVariant`, etc. The function will throw errors if metadata or
   * rental variant updates are attempted.
   * @param {string} rentalId - the id of the rental. Must be a string that
   *   can be casted to an ObjectId
   * @param {object} update - an object with the update values.
   * @return {Promise} resolves to the update result.
   */
  async update(
    rentalId: string,
    update: UpdateRentalInput
  ): Promise<Rental> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)
      const rentalVariantRepo = manager.getCustomRepository(
        this.rentalVariantRepository_
      )
      const rentalTagRepo = manager.getCustomRepository(
        this.rentalTagRepository_
      )
      const rentalTypeRepo = manager.getCustomRepository(
        this.rentalTypeRepository_
      )
      const imageRepo = manager.getCustomRepository(this.imageRepository_)

      const relations = ["variants", "tags", "images"]

      if (
        this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key)
      ) {
        if (isDefined(update.sales_channels)) {
          relations.push("sales_channels")
        }
      } else {
        if (isDefined(update.sales_channels)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "the property sales_channels should no appears as part of the payload"
          )
        }
      }

      const rental = await this.retrieve(rentalId, {
        relations,
      })

      const {
        variants,
        metadata,
        images,
        tags,
        type,
        sales_channels: salesChannels,
        ...rest
      } = update

      if (!rental.thumbnail && !update.thumbnail && images?.length) {
        rental.thumbnail = images[0]
      }

      if (images) {
        rental.images = await imageRepo.upsertImages(images)
      }

      if (metadata) {
        rental.metadata = setMetadata(rental, metadata)
      }

      if (typeof type !== `undefined`) {
        rental.type_id = (await rentalTypeRepo.upsertType(type))?.id || null
      }

      if (tags) {
        rental.tags = await rentalTagRepo.upsertTags(tags)
      }

      if (
        this.featureFlagRouter_.isFeatureEnabled(SalesChannelFeatureFlag.key)
      ) {
        if (isDefined(salesChannels)) {
          rental.sales_channels = []
          if (salesChannels?.length) {
            const salesChannelIds = salesChannels?.map((sc) => sc.id)
            rental.sales_channels = salesChannelIds?.map(
              (id) => ({ id } as SalesChannel)
            )
          }
        }
      }

      if (variants) {
        // Iterate rental variants and update their properties accordingly
        for (const variant of rental.variants) {
          const exists = variants.find((v) => v.id && variant.id === v.id)
          if (!exists) {
            await rentalVariantRepo.remove(variant)
          }
        }

        const newVariants: RentalVariant[] = []
        for (const [i, newVariant] of variants.entries()) {
          const variant_rank = i

          if (newVariant.id) {
            const variant = rental.variants.find((v) => v.id === newVariant.id)

            if (!variant) {
              throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Variant with id: ${newVariant.id} is not associated with this rental`
              )
            }

            const saved = await this.rentalVariantService_
              .withTransaction(manager)
              .update(variant, {
                ...newVariant,
                variant_rank,
                rental_id: variant.rental_id,
              })

            newVariants.push(saved)
          } else {
            // If the provided variant does not have an id, we assume that it
            // should be created
            const created = await this.rentalVariantService_
              .withTransaction(manager)
              .create(rental.id, {
                ...newVariant,
                variant_rank,
                options: newVariant.options || [],
                prices: newVariant.prices || [],
              })

            newVariants.push(created)
          }
        }

        rental.variants = newVariants
      }

      for (const [key, value] of Object.entries(rest)) {
        if (isDefined(value)) {
          rental[key] = value
        }
      }

      const result = await rentalRepo.save(rental)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.UPDATED, {
          id: result.id,
          fields: Object.keys(update),
        })
      return result
    })
  }

  /**
   * Deletes a rental from a given rental id. The rental's associated
   * variants will also be deleted.
   * @param rentalId - the id of the rental to delete. Must be
   *   castable as an ObjectId
   * @return empty promise
   */
  async delete(rentalId: string): Promise<void> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

      // Should not fail, if rental does not exist, since delete is idempotent
      const rental = await rentalRepo.findOne(
        { id: rentalId },
        { relations: ["variants", "variants.prices", "variants.options"] }
      )

      if (!rental) {
        return
      }

      await rentalRepo.softRemove(rental)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.DELETED, {
          id: rentalId,
        })

      return Promise.resolve()
    })
  }

  /**
   * Adds an option to a rental. Options can, for example, be "Size", "Color",
   * etc. Will update all the rentals variants with a dummy value for the newly
   * created option. The same option cannot be added more than once.
   * @param rentalId - the rental to apply the new option to
   * @param optionTitle - the display title of the option, e.g. "Size"
   * @return the result of the model update operation
   */
  async addOption(rentalId: string, optionTitle: string): Promise<Rental> {
    return await this.atomicPhase_(async (manager) => {
      const rentalOptionRepo = manager.getCustomRepository(
        this.rentalOptionRepository_
      )

      const rental = await this.retrieve(rentalId, {
        relations: ["options", "variants"],
      })

      if (rental.options.find((o) => o.title === optionTitle)) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `An option with the title: ${optionTitle} already exists`
        )
      }

      const option = rentalOptionRepo.create({
        title: optionTitle,
        rental_id: rentalId,
      })

      await rentalOptionRepo.save(option)

      const rentalVariantServiceTx =
        this.rentalVariantService_.withTransaction(manager)
      for (const variant of rental.variants) {
        await rentalVariantServiceTx.addOptionValue(
          variant.id,
          option.id,
          "Default Value"
        )
      }

      const result = await this.retrieve(rentalId)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.UPDATED, result)
      return result
    })
  }

  async reorderVariants(
    rentalId: string,
    variantOrder: string[]
  ): Promise<Rental> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

      const rental = await this.retrieve(rentalId, {
        relations: ["variants"],
      })

      if (rental.variants.length !== variantOrder.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Rental variants and new variant order differ in length.`
        )
      }

      rental.variants = variantOrder.map((vId) => {
        const variant = rental.variants.find((v) => v.id === vId)
        if (!variant) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Rental has no variant with id: ${vId}`
          )
        }

        return variant
      })

      const result = rentalRepo.save(rental)
      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.UPDATED, result)
      return result
    })
  }

  /**
   * Updates a rental's option. Throws if the call tries to update an option
   * not associated with the rental. Throws if the updated title already exists.
   * @param rentalId - the rental whose option we are updating
   * @param optionId - the id of the option we are updating
   * @param data - the data to update the option with
   * @return the updated rental
   */
  async updateOption(
    rentalId: string,
    optionId: string,
    data: RentalOptionInput
  ): Promise<Rental> {
    return await this.atomicPhase_(async (manager) => {
      const rentalOptionRepo = manager.getCustomRepository(
        this.rentalOptionRepository_
      )

      const rental = await this.retrieve(rentalId, { relations: ["options"] })

      const { title, values } = data

      const optionExists = rental.options.some(
        (o) =>
          o.title.toUpperCase() === title.toUpperCase() && o.id !== optionId
      )
      if (optionExists) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `An option with title ${title} already exists`
        )
      }

      const rentalOption = await rentalOptionRepo.findOne({
        where: { id: optionId },
      })

      if (!rentalOption) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Option with id: ${optionId} does not exist`
        )
      }

      rentalOption.title = title
      if (values) {
        rentalOption.values = values
      }

      await rentalOptionRepo.save(rentalOption)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.UPDATED, rental)
      return rental
    })
  }

  /**
   * Retrieve rental's option by title.
   *
   * @param title - title of the option
   * @param rentalId - id of a rental
   * @return rental option
   */
  async retrieveOptionByTitle(
    title: string,
    rentalId: string
  ): Promise<RentalOption | undefined> {
    const rentalOptionRepo = this.manager_.getCustomRepository(
      this.rentalOptionRepository_
    )

    return rentalOptionRepo.findOne({
      where: { title, rental_id: rentalId },
    })
  }

  /**
   * Delete an option from a rental.
   * @param rentalId - the rental to delete an option from
   * @param optionId - the option to delete
   * @return the updated rental
   */
  async deleteOption(
    rentalId: string,
    optionId: string
  ): Promise<Rental | void> {
    return await this.atomicPhase_(async (manager) => {
      const rentalOptionRepo = manager.getCustomRepository(
        this.rentalOptionRepository_
      )

      const rental = await this.retrieve(rentalId, {
        relations: ["variants", "variants.options"],
      })

      const rentalOption = await rentalOptionRepo.findOne({
        where: { id: optionId, rental_id: rentalId },
        relations: ["values"],
      })

      if (!rentalOption) {
        return Promise.resolve()
      }

      // In case the rental does not contain variants, we can safely delete the option
      // If it does contain variants, we need to make sure no variant exist for the
      // rental option to delete
      if (rental?.variants?.length) {
        // For the option we want to delete, make sure that all variants have the
        // same option values. The reason for doing is, that we want to avoid
        // duplicate variants. For example, if we have a rental with size and
        // color options, that has four variants: (black, 1), (black, 2),
        // (blue, 1), (blue, 2) and we delete the size option from the rental,
        // we would end up with four variants: (black), (black), (blue), (blue).
        // We now have two duplicate variants. To ensure that this does not
        // happen, we will force the user to select which variants to keep.
        const firstVariant = rental.variants[0]

        const valueToMatch = firstVariant.options.find(
          (o) => o.option_id === optionId
        )?.value

        const equalsFirst = await Promise.all(
          rental.variants.map(async (v) => {
            const option = v.options.find((o) => o.option_id === optionId)
            return option?.value === valueToMatch
          })
        )

        if (!equalsFirst.every((v) => v)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `To delete an option, first delete all variants, such that when an option is deleted, no duplicate variants will exist.`
          )
        }
      }

      // If we reach this point, we can safely delete the rental option
      await rentalOptionRepo.softRemove(rentalOption)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalService.Events.UPDATED, rental)
      return rental
    })
  }

  /**
   * Creates a query object to be used for list queries.
   * @param selector - the selector to create the query from
   * @param config - the config to use for the query
   * @return an object containing the query, relations and free-text
   *   search param.
   */
  protected prepareListQuery_(
    selector: FilterableRentalProps | Selector<Rental>,
    config: FindRentalConfig
  ): {
    q: string
    relations: (keyof Rental)[]
    query: FindWithoutRelationsOptions
  } {
    let q
    if ("q" in selector) {
      q = selector.q
      delete selector.q
    }

    const query = buildQuery(selector, config)

    if (config.relations && config.relations.length > 0) {
      query.relations = config.relations
    }

    if (config.select && config.select.length > 0) {
      query.select = config.select
    }

    const rels = query.relations
    delete query.relations

    return {
      query: query as FindWithoutRelationsOptions,
      relations: rels as (keyof Rental)[],
      q,
    }
  }
}

export default RentalService
