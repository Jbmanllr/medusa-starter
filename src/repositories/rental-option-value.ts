import { EntityRepository, Repository } from "typeorm"
import { RentalOptionValue } from "../models/rental-option-value"

@EntityRepository(RentalOptionValue)
// eslint-disable-next-line max-len
export class RentalOptionValueRepository extends Repository<RentalOptionValue> {}
