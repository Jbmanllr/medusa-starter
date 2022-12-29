import cors from "cors"
import { Router } from "express"
import middlewares from "@medusajs/medusa/dist/api/middlewares"
import analyticsConfigs from "@medusajs/medusa/dist/api/routes/admin/analytics-configs"
import appRoutes from "@medusajs/medusa/dist/api/routes/admin/apps"
import authRoutes from "@medusajs/medusa/dist/api/routes/admin/auth"
import batchRoutes from "@medusajs/medusa/dist/api/routes/admin/batch"
//import collectionRoutes from "./collections"
//import priceListRoutes from "./price-lists"
import rentalTagRoutes from "./rental-tags"
import rentalTypesRoutes from "./rental-types"
import rentalRoutes from "./rentals"
import userRoutes, { unauthenticatedUserRoutes } from "@medusajs/medusa/dist/api/routes/admin/users"
//import variantRoutes from "./variants"
import { parseCorsOrigins } from "medusa-core-utils"
import featureFlagLoader from "@medusajs/medusa/dist/loaders/feature-flags"
import authenticate from "@medusajs/medusa/dist/api/middlewares/authenticate"

const route = Router()

export default (app : any, projectConfig : any) => {
  app.use("/admin", route)

  const adminCors = projectConfig.admin_cors || ""
  route.use(
    cors({
      origin: parseCorsOrigins(adminCors),
      credentials: true,
    })
  )

  //const featureFlagRouter = container.resolve("featureFlagRouter")
  const featureFlagRouter = featureFlagLoader(projectConfig)

  //route.use(authenticate())

  // Unauthenticated routes
  //authRoutes(route)

  // reset password
  //unauthenticatedUserRoutes(route)

  // accept invite
  //unauthenticatedInviteRoutes(route)

 //const middlewareService = container.resolve("middlewareService")
  // Calls all middleware that has been registered to run before authentication.
 // middlewareService.usePreAuthentication(app)

  // Authenticated routes
  //route.use(middlewares.authenticate())

  // Calls all middleware that has been registered to run after authentication.
 // middlewareService.usePostAuthentication(app)
  

  //analyticsConfigs(route)
  //appRoutes(route)
  //batchRoutes(route)
  rentalRoutes(route, featureFlagRouter)
  //rentalTagRoutes(route)
  //rentalTypesRoutes(route)
  //publishableApiKeyRoutes(route)
  //userRoutes(route)
  //variantRoutes(route)

  return app
}
