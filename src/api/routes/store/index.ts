import cors from "cors"
import { Router } from "express"
import { parseCorsOrigins } from "medusa-core-utils"
import authenticate from "@medusajs/medusa/dist/api/middlewares/authenticate-customer"

import RentalRoutes from "./rentals"

const route = Router()

export default (app : any, projectConfig : any, featureFlagRouter : any) => {
  app.use("/store", route)

  const storeCors = projectConfig.store_cors || ""
  route.use(
    cors({
      origin: parseCorsOrigins(storeCors), 
      credentials: true,
    })
  )

  route.use(authenticate())

  RentalRoutes(route, featureFlagRouter)
}





{/*import cors from "cors"
import { Router } from "express"
import middlewares from "@medusajs/medusa/dist/api/middlewares"
//import productTypesRoutes from "../admin/product-types"
import RentalRoutes from "./rentals"
//import variantRoutes from "./variants"
import { parseCorsOrigins } from "medusa-core-utils"

const route = Router()

export default (app : any, container : any, config : any) => {
  app.use("/store", route)


  const storeCors = config.store_cors || ""
  route.use(
    cors({
      origin: parseCorsOrigins(storeCors),
      credentials: true,
    })
  )

  const featureFlagRouter = container.resolve("featureFlagRouter")

  route.use(middlewares.authenticateCustomer())

  RentalRoutes(route, featureFlagRouter)
  //productTypesRoutes(route)
  //variantRoutes(route)

  return app
}
*/}