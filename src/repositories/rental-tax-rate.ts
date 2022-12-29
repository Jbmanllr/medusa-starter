import { EntityRepository, Repository } from "typeorm"
import { RentalTaxRate } from "../models/rental-tax-rate"

@EntityRepository(RentalTaxRate)
export class RentalTaxRateRepository extends Repository<RentalTaxRate> {}
