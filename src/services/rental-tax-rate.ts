import { EntityManager } from "typeorm"
import { RentalTaxRate } from "../models"
import { RentalTaxRateRepository } from "../repositories/rental-tax-rate"
import { FindConfig } from "@medusajs/medusa/dist/types/common"
import { FilterableRentalTaxRateProps } from "../types/rental-tax-rate"
import { TransactionBaseService } from "@medusajs/medusa/dist/interfaces"
import { buildQuery } from "@medusajs/medusa/dist/utils"

class RentalTaxRateService extends TransactionBaseService {
  protected manager_: EntityManager
  protected transactionManager_: EntityManager | undefined

  protected readonly rentalTaxRateRepository_: typeof RentalTaxRateRepository

  constructor({ manager, rentalTaxRateRepository }) {
    super(arguments[0])

    this.manager_ = manager
    this.rentalTaxRateRepository_ = rentalTaxRateRepository
  }

  /**
   * @param selector - the query object for find
   * @param config - query config object for variant retrieval
   * @return the result of the find operation
   */
  async list(
    selector: FilterableRentalTaxRateProps,
    config: FindConfig<RentalTaxRate> = { relations: [], skip: 0, take: 20 }
  ): Promise<RentalTaxRate[]> {
    const pTaxRateRepo = this.manager_.getCustomRepository(
      this.rentalTaxRateRepository_
    )

    const query = buildQuery(selector, config)

    return await pTaxRateRepo.find(query)
  }
}

export default RentalTaxRateService
