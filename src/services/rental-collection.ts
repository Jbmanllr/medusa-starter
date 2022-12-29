import { MedusaError, isDefined} from "medusa-core-utils"
import { Brackets, EntityManager, ILike } from "typeorm"
import { TransactionBaseService } from "@medusajs/medusa/dist/interfaces"
import { RentalCollection } from "../models"
import { RentalRepository } from "../repositories/rental"
import { RentalCollectionRepository } from "../repositories/rental-collection"
import { FindConfig, Selector } from "@medusajs/medusa/dist/types/common"
import {
  CreateRentalCollection,
  UpdateRentalCollection,
} from "../types/rental-collection"
import { buildQuery, isString, setMetadata } from "@medusajs/medusa/dist/utils"
import EventBusService from "@medusajs/medusa/dist/services/event-bus"

type InjectedDependencies = {
  manager: EntityManager
  eventBusService: EventBusService
  rentalRepository: typeof RentalRepository
  rentalCollectionRepository: typeof RentalCollectionRepository
}

/**
 * Provides layer to manipulate rental collections.
 */
class RentalCollectionService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly eventBus_: EventBusService
  // eslint-disable-next-line max-len
  protected readonly rentalCollectionRepository_: typeof RentalCollectionRepository
  protected readonly rentalRepository_: typeof RentalRepository

  constructor({
    manager,
    rentalCollectionRepository,
    rentalRepository,
    eventBusService,
  }: InjectedDependencies) {
    super(arguments[0])
    this.manager_ = manager

    this.rentalCollectionRepository_ = rentalCollectionRepository
    this.rentalRepository_ = rentalRepository
    this.eventBus_ = eventBusService
  }

  /**
   * Retrieves a rental collection by id.
   * @param collectionId - the id of the collection to retrieve.
   * @param config - the config of the collection to retrieve.
   * @return the collection.
   */
  async retrieve(
    collectionId: string,
    config: FindConfig<RentalCollection> = {}
  ): Promise<RentalCollection> {
    if (!isDefined(collectionId)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `"collectionId" must be defined`
      )
    }

    const collectionRepo = this.manager_.getCustomRepository(
      this.rentalCollectionRepository_
    )

    const query = buildQuery({ id: collectionId }, config)
    const collection = await collectionRepo.findOne(query)

    if (!collection) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Rental collection with id: ${collectionId} was not found`
      )
    }

    return collection
  }

  /**
   * Retrieves a rental collection by id.
   * @param collectionHandle - the handle of the collection to retrieve.
   * @param config - query config for request
   * @return the collection.
   */
  async retrieveByHandle(
    collectionHandle: string,
    config: FindConfig<RentalCollection> = {}
  ): Promise<RentalCollection> {
    const collectionRepo = this.manager_.getCustomRepository(
      this.rentalCollectionRepository_
    )

    const query = buildQuery({ handle: collectionHandle }, config)
    const collection = await collectionRepo.findOne(query)

    if (!collection) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Rental collection with handle: ${collectionHandle} was not found`
      )
    }

    return collection
  }

  /**
   * Creates a rental collection
   * @param collection - the collection to create
   * @return created collection
   */
  async create(
    collection: CreateRentalCollection
  ): Promise<RentalCollection> {
    return await this.atomicPhase_(async (manager) => {
      const collectionRepo = manager.getCustomRepository(
        this.rentalCollectionRepository_
      )

      const rentalCollection = collectionRepo.create(collection)
      return await collectionRepo.save(rentalCollection)
    })
  }

  /**
   * Updates a rental collection
   * @param collectionId - id of collection to update
   * @param update - update object
   * @return update collection
   */
  async update(
    collectionId: string,
    update: UpdateRentalCollection
  ): Promise<RentalCollection> {
    return await this.atomicPhase_(async (manager) => {
      const collectionRepo = manager.getCustomRepository(
        this.rentalCollectionRepository_
      )

      const collection = await this.retrieve(collectionId)

      const { metadata, ...rest } = update

      if (metadata) {
        collection.metadata = setMetadata(collection, metadata)
      }

      for (const [key, value] of Object.entries(rest)) {
        collection[key] = value
      }

      return collectionRepo.save(collection)
    })
  }

  /**
   * Deletes a rental collection idempotently
   * @param collectionId - id of collection to delete
   * @return empty promise
   */
  async delete(collectionId: string): Promise<void> {
    return await this.atomicPhase_(async (manager) => {
      const rentalCollectionRepo = manager.getCustomRepository(
        this.rentalCollectionRepository_
      )

      const collection = await this.retrieve(collectionId)

      if (!collection) {
        return Promise.resolve()
      }

      await rentalCollectionRepo.softRemove(collection)

      return Promise.resolve()
    })
  }

  async addRentals(
    collectionId: string,
    rentalIds: string[]
  ): Promise<RentalCollection> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

      const { id } = await this.retrieve(collectionId, { select: ["id"] })

      await rentalRepo.bulkAddToCollection(rentalIds, id)

      return await this.retrieve(id, {
        relations: ["rentals"],
      })
    })
  }

  async removeRentals(
    collectionId: string,
    rentalIds: string[]
  ): Promise<void> {
    return await this.atomicPhase_(async (manager) => {
      const rentalRepo = manager.getCustomRepository(this.rentalRepository_)

      const { id } = await this.retrieve(collectionId, { select: ["id"] })

      await rentalRepo.bulkRemoveFromCollection(rentalIds, id)

      return Promise.resolve()
    })
  }

  /**
   * Lists rental collections
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async list(
    selector: Selector<RentalCollection> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config = { skip: 0, take: 20 }
  ): Promise<RentalCollection[]> {
    const [collections] = await this.listAndCount(selector, config)
    return collections
  }

  /**
   * Lists rental collections and add count.
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async listAndCount(
    selector: Selector<RentalCollection> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config: FindConfig<RentalCollection> = { skip: 0, take: 20 }
  ): Promise<[RentalCollection[], number]> {
    const rentalCollectionRepo = this.manager_.getCustomRepository(
      this.rentalCollectionRepository_
    )

    let q
    if (isString(selector.q)) {
      q = selector.q
      delete selector.q
    }

    const query = buildQuery(selector, config)

    if (q) {
      const where = query.where

      delete where.title
      delete where.handle
      delete where.created_at
      delete where.updated_at

      query.where = (qb): void => {
        qb.where(where)

        qb.andWhere(
          new Brackets((qb) => {
            qb.where({ title: ILike(`%${q}%`) }).orWhere({
              handle: ILike(`%${q}%`),
            })
          })
        )
      }
    }

    if (query.where.discount_condition_id) {
      const discountConditionId = query.where.discount_condition_id as string
      delete query.where.discount_condition_id
      return await rentalCollectionRepo.findAndCountByDiscountConditionId(
        discountConditionId,
        query
      )
    }

    return await rentalCollectionRepo.findAndCount(query)
  }
}

export default RentalCollectionService
