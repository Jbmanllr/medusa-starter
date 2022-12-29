import { MedusaError } from "medusa-core-utils"
import { EntityManager, ILike } from "typeorm"
import { RentalType } from "../models"
import { RentalTypeRepository } from "../repositories/rental-type"
import { FindConfig, Selector } from "@medusajs/medusa/dist/types/common"
import { TransactionBaseService } from "@medusajs/medusa/dist/interfaces"
import { buildQuery, isString } from "@medusajs/medusa/dist/utils"

class RentalTypeService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly typeRepository_: typeof RentalTypeRepository

  constructor({ manager, rentalTypeRepository }) {
    super(arguments[0])

    this.manager_ = manager
    this.typeRepository_ = rentalTypeRepository
  }

  /**
   * Gets a rental type by id.
   * Throws in case of DB Error and if rental was not found.
   * @param id - id of the rental to get.
   * @param config - object that defines what should be included in the
   *   query response
   * @return the result of the find one operation.
   */
  async retrieve(
    id: string,
    config: FindConfig<RentalType> = {}
  ): Promise<RentalType> {
    const typeRepo = this.manager_.getCustomRepository(this.typeRepository_)

    const query = buildQuery({ id }, config)
    const type = await typeRepo.findOne(query)

    if (!type) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Rental type with id: ${id} was not found`
      )
    }

    return type
  }

  /**
   * Lists rental types
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async list(
    selector: Selector<RentalType> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config: FindConfig<RentalType> = { skip: 0, take: 20 }
  ): Promise<RentalType[]> {
    const [rentalTypes] = await this.listAndCount(selector, config)
    return rentalTypes
  }

  /**
   * Lists rental types and adds count.
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async listAndCount(
    selector: Selector<RentalType> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config: FindConfig<RentalType> = { skip: 0, take: 20 }
  ): Promise<[RentalType[], number]> {
    const typeRepo = this.manager_.getCustomRepository(this.typeRepository_)

    let q
    if (isString(selector.q)) {
      q = selector.q
      delete selector.q
    }

    const query = buildQuery(selector, config)

    if (q) {
      query.where.value = ILike(`%${q}%`)
    }

    if (query.where.discount_condition_id) {
      const discountConditionId = query.where.discount_condition_id as string
      delete query.where.discount_condition_id
      return await typeRepo.findAndCountByDiscountConditionId(
        discountConditionId,
        query
      )
    }

    return await typeRepo.findAndCount(query)
  }
}

export default RentalTypeService
