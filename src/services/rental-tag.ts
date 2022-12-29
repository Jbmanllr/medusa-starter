import { MedusaError } from "medusa-core-utils"
import { EntityManager, ILike } from "typeorm"
import { RentalTag } from "../models"
import { RentalTagRepository } from "../repositories/rental-tag"
import { FindConfig, Selector } from "@medusajs/medusa/dist/types/common"
import { TransactionBaseService } from "@medusajs/medusa/dist/interfaces"
import { buildQuery, isString } from "@medusajs/medusa/dist/utils"

type RentalTagConstructorProps = {
  manager: EntityManager
  rentalTagRepository: typeof RentalTagRepository
}

class RentalTagService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly tagRepo_: typeof RentalTagRepository

  constructor({ manager, rentalTagRepository }: RentalTagConstructorProps) {
    super(arguments[0])
    this.manager_ = manager
    this.tagRepo_ = rentalTagRepository
  }

  /**
   * Retrieves a rental tag by id.
   * @param tagId - the id of the rental tag to retrieve
   * @param config - the config to retrieve the tag by
   * @return the collection.
   */
  async retrieve(
    tagId: string,
    config: FindConfig<RentalTag> = {}
  ): Promise<RentalTag> {
    const tagRepo = this.manager_.getCustomRepository(this.tagRepo_)

    const query = buildQuery({ id: tagId }, config)
    const tag = await tagRepo.findOne(query)

    if (!tag) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Rental tag with id: ${tagId} was not found`
      )
    }

    return tag
  }

  /**
   * Creates a rental tag
   * @param tag - the rental tag to create
   * @return created rental tag
   */
  async create(tag: Partial<RentalTag>): Promise<RentalTag> {
    return await this.atomicPhase_(async (manager: EntityManager) => {
      const tagRepo = manager.getCustomRepository(this.tagRepo_)

      const rentalTag = tagRepo.create(tag)
      return await tagRepo.save(rentalTag)
    })
  }

  /**
   * Lists rental tags
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async list(
    selector: Selector<RentalTag> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config: FindConfig<RentalTag> = { skip: 0, take: 20 }
  ): Promise<RentalTag[]> {
    const [tags] = await this.listAndCount(selector, config)
    return tags
  }

  /**
   * Lists rental tags and adds count.
   * @param selector - the query object for find
   * @param config - the config to be used for find
   * @return the result of the find operation
   */
  async listAndCount(
    selector: Selector<RentalTag> & {
      q?: string
      discount_condition_id?: string
    } = {},
    config: FindConfig<RentalTag> = { skip: 0, take: 20 }
  ): Promise<[RentalTag[], number]> {
    const tagRepo = this.manager_.getCustomRepository(this.tagRepo_)

    let q: string | undefined
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
      return await tagRepo.findAndCountByDiscountConditionId(
        discountConditionId,
        query
      )
    }

    return await tagRepo.findAndCount(query)
  }
}

export default RentalTagService
