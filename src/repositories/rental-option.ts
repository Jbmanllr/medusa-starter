import { EntityRepository, Repository } from "typeorm"
import { RentalOption } from "../models/rental-option"

@EntityRepository(RentalOption)
export class RentalOptionRepository extends Repository<RentalOption> {}
