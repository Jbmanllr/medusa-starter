import { MedusaError, isDefined } from "medusa-core-utils"
import { Brackets, EntityManager, ILike, SelectQueryBuilder } from "typeorm"
import {
  IPriceSelectionStrategy,
  PriceSelectionContext,
  TransactionBaseService,
} from "@medusajs/medusa/dist/interfaces"
import {
  Rental,
  RentalOptionValue,
  RentalVariant,
} from "../models"
import { MoneyAmount } from "@medusajs/medusa/dist/models"
import { CartRepository } from "@medusajs/medusa/dist/repositories/cart"
import { MoneyAmountRepository } from "@medusajs/medusa/dist/repositories/money-amount"
import { RentalRepository } from "../repositories/rental"
import { RentalOptionValueRepository } from "../repositories/rental-option-value"
import {
  FindWithRelationsOptions,
  RentalVariantRepository,
} from "../repositories/rental-variant"
import EventBusService from "@medusajs/medusa/dist/services/event-bus"
import RegionService from "@medusajs/medusa/dist/services/region"
import { FindConfig } from "@medusajs/medusa/dist/types/common"
import {
  CreateRentalVariantInput,
  FilterableRentalVariantProps,
  GetRegionPriceContext,
  RentalVariantPrice,
  UpdateRentalVariantInput,
} from "../types/rental-variant"
import { buildQuery, setMetadata } from "@medusajs/medusa/dist/utils"

class RentalVariantService extends TransactionBaseService {
  static Events = {
    UPDATED: "rental-variant.updated",
    CREATED: "rental-variant.created",
    DELETED: "rental-variant.deleted",
  }

  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly rentalVariantRepository_: typeof RentalVariantRepository
  protected readonly rentalRepository_: typeof RentalRepository
  protected readonly eventBus_: EventBusService
  protected readonly regionService_: RegionService
  protected readonly priceSelectionStrategy_: IPriceSelectionStrategy
  protected readonly moneyAmountRepository_: typeof MoneyAmountRepository
  protected readonly rentalOptionValueRepository_: typeof RentalOptionValueRepository
  protected readonly cartRepository_: typeof CartRepository

  constructor({
    manager,
    rentalVariantRepository,
    rentalRepository,
    eventBusService,
    regionService,
    moneyAmountRepository,
    rentalOptionValueRepository,
    cartRepository,
    priceSelectionStrategy,
  }) {
    super(arguments[0])

    this.manager_ = manager
    this.rentalVariantRepository_ = rentalVariantRepository
    this.rentalRepository_ = rentalRepository
    this.eventBus_ = eventBusService
    this.regionService_ = regionService
    this.moneyAmountRepository_ = moneyAmountRepository
    this.rentalOptionValueRepository_ = rentalOptionValueRepository
    this.cartRepository_ = cartRepository
    this.priceSelectionStrategy_ = priceSelectionStrategy
  }

  /**
   * Gets a rental variant by id.
   * @param variantId - the id of the rental to get.
   * @param config - query config object for variant retrieval.
   * @return the rental document.
   */
  async retrieve(
    variantId: string,
    config: FindConfig<RentalVariant> & PriceSelectionContext = {
      include_discount_prices: false,
    }
  ): Promise<RentalVariant> {
    const variantRepo = this.manager_.getCustomRepository(
      this.rentalVariantRepository_
    )
    const query = buildQuery({ id: variantId }, config)
    const variant = await variantRepo.findOne(query)

    if (!variant) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant with id: ${variantId} was not found`
      )
    }

    return variant
  }

  /**
   * Gets a rental variant by id.
   * @param sku - The unique stock keeping unit used to identify the rental variant.
   * @param config - query config object for variant retrieval.
   * @return the rental document.
   */
  async retrieveBySKU(
    sku: string,
    config: FindConfig<RentalVariant> & PriceSelectionContext = {
      include_discount_prices: false,
    }
  ): Promise<RentalVariant> {
    const variantRepo = this.manager_.getCustomRepository(
      this.rentalVariantRepository_
    )

    const priceIndex = config.relations?.indexOf("prices") ?? -1
    if (priceIndex >= 0 && config.relations) {
      config.relations = [...config.relations]
      config.relations.splice(priceIndex, 1)
    }

    const query = buildQuery({ sku }, config)
    const variant = await variantRepo.findOne(query)

    if (!variant) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Variant with sku: ${sku} was not found`
      )
    }

    return variant
  }

  /**
   * Creates an unpublished rental variant. Will validate against parent rental
   * to ensure that the variant can in fact be created.
   * @param rentalOrRentalId - the rental the variant will be added to
   * @param variant - the variant to create
   * @return resolves to the creation result.
   */
  async create(
    rentalOrRentalId: string | Rental,
    variant: CreateRentalVariantInput
  ): Promise<RentalVariant> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)
      const variantRepo = manager.getCustomRepository(
        this.rentalVariantRepository_
      )

      const { prices, ...rest } = variant

      let rental = rentalOrRentalId

      if (typeof rental === `string`) {
        rental = (await rentalRepo.findOne({
          where: { id: rentalOrRentalId },
          relations: ["variants", "variants.options", "options"],
        })) as Rental
      } else if (!rental.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Rental id missing`
        )
      }

      if (rental.options.length !== variant.options.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Rental options length does not match variant options length. Rental has ${rental.options.length} and variant has ${variant.options.length}.`
        )
      }

      rental.options.forEach((option) => {
        if (!variant.options.find((vo) => option.id === vo.option_id)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Variant options do not contain value for ${option.title}`
          )
        }
      })

      const variantExists = rental.variants.find((v) => {
        return v.options.every((option) => {
          const variantOption = variant.options.find(
            (o) => option.option_id === o.option_id
          )

          return option.value === variantOption?.value
        })
      })

      if (variantExists) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Variant with title ${variantExists.title} with provided options already exists`
        )
      }

      if (!rest.variant_rank) {
        rest.variant_rank = rental.variants.length
      }

      const toCreate = {
        ...rest,
        rental_id: rental.id,
      }

      const rentalVariant = variantRepo.create(toCreate)

      const result = await variantRepo.save(rentalVariant)

      if (prices) {
        for (const price of prices) {
          if (price.region_id) {
            const region = await this.regionService_.retrieve(price.region_id)

            await this.setRegionPrice(result.id, {
              amount: price.amount,
              region_id: price.region_id,
              currency_code: region.currency_code,
            })
          } else {
            await this.setCurrencyPrice(result.id, price)
          }
        }
      }

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalVariantService.Events.CREATED, {
          id: result.id,
          rental_id: result.rental_id,
        })

      return result
    })
  }

  /**
   * Updates a variant.
   * Price updates should use dedicated methods.
   * The function will throw, if price updates are attempted.
   * @param variantOrVariantId - variant or id of a variant.
   * @param update - an object with the update values.
   * @param config - an object with the config values for returning the variant.
   * @return resolves to the update result.
   */
  async update(
    variantOrVariantId: string | Partial<RentalVariant>,
    update: UpdateRentalVariantInput
  ): Promise<RentalVariant> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const variantRepo = manager.getCustomRepository(
        this.rentalVariantRepository_
      )

      let variant = variantOrVariantId
      if (typeof variant === `string`) {
        const variantRes = await variantRepo.findOne({
          where: { id: variantOrVariantId as string },
        })
        if (!isDefined(variantRes)) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Variant with id ${variantOrVariantId} was not found`
          )
        } else {
          variant = variantRes as RentalVariant
        }
      } else if (!variant.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant id missing`
        )
      }

      const { prices, options, metadata, inventory_quantity, ...rest } = update

      if (prices) {
        await this.updateVariantPrices(variant.id!, prices)
      }

      if (options) {
        for (const option of options) {
          await this.updateOptionValue(
            variant.id!,
            option.option_id,
            option.value
          )
        }
      }

      if (typeof metadata === "object") {
        variant.metadata = setMetadata(variant as RentalVariant, metadata)
      }

      if (typeof inventory_quantity === "number") {
        variant.inventory_quantity = inventory_quantity as number
      }

      for (const [key, value] of Object.entries(rest)) {
        variant[key] = value
      }

      const result = await variantRepo.save(variant)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalVariantService.Events.UPDATED, {
          id: result.id,
          rental_id: result.rental_id,
          fields: Object.keys(update),
        })

      return result
    })
  }

  /**
   * Updates a variant's prices.
   * Deletes any prices that are not in the update object, and is not associated with a price list.
   * @param variantId - the id of variant
   * @param prices - the update prices
   * @returns empty promise
   */
  async updateVariantPrices(
    variantId: string,
    prices: RentalVariantPrice[]
  ): Promise<void> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const moneyAmountRepo = manager.getCustomRepository(
        this.moneyAmountRepository_
      )

      // get prices to be deleted
      const obsoletePrices = await moneyAmountRepo.findVariantPricesNotIn(
        variantId,
        prices
      )

      for (const price of prices) {
        if (price.region_id) {
          const region = await this.regionService_.retrieve(price.region_id)

          await this.setRegionPrice(variantId, {
            currency_code: region.currency_code,
            region_id: price.region_id,
            amount: price.amount,
          })
        } else {
          await this.setCurrencyPrice(variantId, price)
        }
      }

      await moneyAmountRepo.remove(obsoletePrices)
    })
  }

  /**
   * Gets the price specific to a region. If no region specific money amount
   * exists the function will try to use a currency price. If no default
   * currency price exists the function will throw an error.
   * @param variantId - the id of the variant to get price from
   * @param context - context for getting region price
   * @return the price specific to the region
   */
  async getRegionPrice(
    variantId: string,
    context: GetRegionPriceContext
  ): Promise<number | null> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const region = await this.regionService_
        .withTransaction(manager)
        .retrieve(context.regionId)

      const prices = await this.priceSelectionStrategy_
        .withTransaction(manager)
        .calculateVariantPrice(variantId, {
          region_id: context.regionId,
          currency_code: region.currency_code,
          quantity: context.quantity,
          customer_id: context.customer_id,
          include_discount_prices: !!context.include_discount_prices,
        })

      return prices.calculatedPrice
    })
  }

  /**
   * Sets the default price of a specific region
   * @param variantId - the id of the variant to update
   * @param price - the price for the variant.
   * @return the result of the update operation
   */
  async setRegionPrice(
    variantId: string,
    price: RentalVariantPrice
  ): Promise<MoneyAmount> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const moneyAmountRepo = manager.getCustomRepository(
        this.moneyAmountRepository_
      )

      let moneyAmount = await moneyAmountRepo.findOne({
        where: {
          variant_id: variantId,
          region_id: price.region_id,
          price_list_id: null,
        },
      })

      if (!moneyAmount) {
        moneyAmount = moneyAmountRepo.create({
          ...price,
          variant_id: variantId,
        })
      } else {
        moneyAmount.amount = price.amount
      }

      return await moneyAmountRepo.save(moneyAmount)
    })
  }

  /**
   * Sets the default price for the given currency.
   * @param variantId - the id of the variant to set prices for
   * @param price - the price for the variant
   * @return the result of the update operation
   */
  async setCurrencyPrice(
    variantId: string,
    price: RentalVariantPrice
  ): Promise<MoneyAmount> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const moneyAmountRepo = manager.getCustomRepository(
        this.moneyAmountRepository_
      )

      return await moneyAmountRepo.upsertVariantCurrencyPrice(variantId, price)
    })
  }

  /**
   * Updates variant's option value.
   * Option value must be of type string or number.
   * @param variantId - the variant to decorate.
   * @param optionId - the option from rental.
   * @param optionValue - option value to add.
   * @return the result of the update operation.
   */
  async updateOptionValue(
    variantId: string,
    optionId: string,
    optionValue: string
  ): Promise<RentalOptionValue> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const rentalOptionValueRepo = manager.getCustomRepository(
        this.rentalOptionValueRepository_
      )

      const rentalOptionValue = await rentalOptionValueRepo.findOne({
        where: { variant_id: variantId, option_id: optionId },
      })

      if (!rentalOptionValue) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Rental option value not found`
        )
      }

      rentalOptionValue.value = optionValue

      return await rentalOptionValueRepo.save(rentalOptionValue)
    })
  }

  /**
   * Adds option value to a variant.
   * Fails when rental with variant does not exist or
   * if that rental does not have an option with the given
   * option id. Fails if given variant is not found.
   * Option value must be of type string or number.
   * @param variantId - the variant to decorate.
   * @param optionId - the option from rental.
   * @param optionValue - option value to add.
   * @return the result of the update operation.
   */
  async addOptionValue(
    variantId: string,
    optionId: string,
    optionValue: string
  ): Promise<RentalOptionValue> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const rentalOptionValueRepo = manager.getCustomRepository(
        this.rentalOptionValueRepository_
      )

      const rentalOptionValue = rentalOptionValueRepo.create({
        variant_id: variantId,
        option_id: optionId,
        value: optionValue,
      })

      return await rentalOptionValueRepo.save(rentalOptionValue)
    })
  }

  /**
   * Deletes option value from given variant.
   * Will never fail due to delete being idempotent.
   * @param variantId - the variant to decorate.
   * @param optionId - the option from rental.
   * @return empty promise
   */
  async deleteOptionValue(variantId: string, optionId: string): Promise<void> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const rentalOptionValueRepo: RentalOptionValueRepository =
        manager.getCustomRepository(this.rentalOptionValueRepository_)

      const rentalOptionValue = await rentalOptionValueRepo.findOne({
        where: {
          variant_id: variantId,
          option_id: optionId,
        },
      })

      if (!rentalOptionValue) {
        return Promise.resolve()
      }

      await rentalOptionValueRepo.softRemove(rentalOptionValue)

      return Promise.resolve()
    })
  }

  /**
   * @param selector - the query object for find
   * @param config - query config object for variant retrieval
   * @return the result of the find operation
   */
  async listAndCount(
    selector: FilterableRentalVariantProps,
    config: FindConfig<RentalVariant> & PriceSelectionContext = {
      relations: [],
      skip: 0,
      take: 20,
      include_discount_prices: false,
    }
  ): Promise<[RentalVariant[], number]> {
    const variantRepo = this.manager_.getCustomRepository(
      this.rentalVariantRepository_
    )

    const { q, query, relations } = this.prepareListQuery_(selector, config)

    if (q) {
      const qb = this.getFreeTextQueryBuilder_(variantRepo, query, q)
      const [raw, count] = await qb.getManyAndCount()

      const variants = await variantRepo.findWithRelations(
        relations,
        raw.map((i) => i.id),
        query.withDeleted ?? false
      )

      return [variants, count]
    }

    const [variants, count] = await variantRepo.findWithRelationsAndCount(
      relations,
      query
    )

    return [variants, count]
  }

  /**
   * @param selector - the query object for find
   * @param config - query config object for variant retrieval
   * @return the result of the find operation
   */
  async list(
    selector: FilterableRentalVariantProps,
    config: FindConfig<RentalVariant> & PriceSelectionContext = {
      relations: [],
      skip: 0,
      take: 20,
    }
  ): Promise<RentalVariant[]> {
    const rentalVariantRepo = this.manager_.getCustomRepository(
      this.rentalVariantRepository_
    )

    const priceIndex = config.relations?.indexOf("prices") ?? -1
    if (priceIndex >= 0 && config.relations) {
      config.relations = [...config.relations]
      config.relations.splice(priceIndex, 1)
    }

    let q: string | undefined
    if ("q" in selector) {
      q = selector.q
      delete selector.q
    }

    const query = buildQuery(selector, config)

    if (q) {
      const where = query.where

      delete where.sku
      delete where.title

      query.join = {
        alias: "variant",
        innerJoin: {
          rental: "variant.rental",
        },
      }

      query.where = (qb: SelectQueryBuilder<RentalVariant>): void => {
        qb.where(where).andWhere([
          { sku: ILike(`%${q}%`) },
          { title: ILike(`%${q}%`) },
          { rental: { title: ILike(`%${q}%`) } },
        ])
      }
    }

    return await rentalVariantRepo.find(query)
  }

  /**
   * Deletes variant.
   * Will never fail due to delete being idempotent.
   * @param variantId - the id of the variant to delete. Must be
   *   castable as an ObjectId
   * @return empty promise
   */
  async delete(variantId: string): Promise<void> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const variantRepo = manager.getCustomRepository(
        this.rentalVariantRepository_
      )

      const variant = await variantRepo.findOne({
        where: { id: variantId },
        relations: ["prices", "options"],
      })

      if (!variant) {
        return Promise.resolve()
      }

      await variantRepo.softRemove(variant)

      await this.eventBus_
        .withTransaction(manager)
        .emit(RentalVariantService.Events.DELETED, {
          id: variant.id,
          rental_id: variant.rental_id,
          metadata: variant.metadata,
        })
    })
  }

  /**
   * Creates a query object to be used for list queries.
   * @param selector - the selector to create the query from
   * @param config - the config to use for the query
   * @return an object containing the query, relations and free-text
   *   search param.
   */
  prepareListQuery_(
    selector: FilterableRentalVariantProps,
    config: FindConfig<RentalVariant>
  ): { query: FindWithRelationsOptions; relations: string[]; q?: string } {
    let q: string | undefined
    if (isDefined(selector.q)) {
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

    const rels = query.relations as string[]
    delete query.relations

    return {
      query,
      relations: rels,
      q,
    }
  }

  /**
   * Lists variants based on the provided parameters and includes the count of
   * variants that match the query.
   * @param variantRepo - the variant repository
   * @param query - object that defines the scope for what should be returned
   * @param q - free text query
   * @return an array containing the rentals as the first element and the total
   *   count of rentals that matches the query as the second element.
   */
  getFreeTextQueryBuilder_(
    variantRepo: RentalVariantRepository,
    query: FindWithRelationsOptions,
    q?: string
  ): SelectQueryBuilder<RentalVariant> {
    const where = query.where

    if (typeof where === "object") {
      if ("title" in where) {
        delete where.title
      }
    }

    let qb = variantRepo
      .createQueryBuilder("pv")
      .take(query.take)
      .skip(Math.max(query.skip ?? 0, 0))
      .leftJoinAndSelect("pv.rental", "rental")
      .select(["pv.id"])
      .where(where!)
      .andWhere(
        new Brackets((qb) => {
          qb.where(`rental.title ILIKE :q`, { q: `%${q}%` })
            .orWhere(`pv.title ILIKE :q`, { q: `%${q}%` })
            .orWhere(`pv.sku ILIKE :q`, { q: `%${q}%` })
        })
      )

    if (query.withDeleted) {
      qb = qb.withDeleted()
    }

    return qb
  }
}

export default RentalVariantService
