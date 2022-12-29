import { Router } from 'express';
import { getConfigFile } from "medusa-core-utils"
import { ConfigModule } from "@medusajs/medusa/dist/types/global"
import cors from "cors"
import errorHandler from "@medusajs/medusa/dist/api/middlewares/error-handler"
//import bodyParser from 'body-parser';

import admin from "./routes/admin"
import store from "./routes/store"

export default (rootDirectory : any, pluginOptions : any) => {
  const app = Router();

  const { configModule } = getConfigFile<ConfigModule>(rootDirectory, "medusa-config")
  const { projectConfig } = configModule

  admin(app, projectConfig)
  store(app, projectConfig)

  app.use(errorHandler())

  return app;
}

// Admin
export * from "./routes/admin/rental-tags"
export * from "./routes/admin/rental-types"
export * from "./routes/admin/rentals"
export * from "./routes/admin/variants"
// Store
export * from "./routes/store/rentals"
//export * from "./routes/store/rental-types"





 {/* 
   app.options("/hello")
  app.get("/hello", (req, res) => {
    res.json({
      message: "Welcome to Your Storey! INDEX",
    })
  })
 
 app.get('/store/rental-features', async (req, res) => {
    const rentalFeatureService = req.scope.resolve('rentalFeatureService');
    res.json(await rentalFeatureService.list());
  });

  app.post('/store/rental-feature', bodyParser.json(), async (req, res) => {
    const rentalFeatureService = req.scope.resolve('rentalFeatureService');
    const { name } = req.body;
    if (!name) {
      res.status(400).json({
        msg: 'Name not supplied.',
      });
      return;
    }
    const rentalFeature = await rentalFeatureService.create(name);
    console.log(rentalFeature);
    res.json({ msg: 'Rental Feature created', id: rentalFeature.id });
  });*/}