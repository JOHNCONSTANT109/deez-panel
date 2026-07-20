import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botsRouter from "./bots";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botsRouter);
router.use(filesRouter);

export default router;
