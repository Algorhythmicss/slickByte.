import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mealsRouter from "./meals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mealsRouter);

export default router;
