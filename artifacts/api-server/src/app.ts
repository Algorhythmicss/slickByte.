import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const REQUEST_BODY_LIMIT = "10mb";

app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (!err || typeof err !== "object") {
    next(err);
    return;
  }

  const error = err as { type?: string; status?: number; message?: string };

  if (error.type === "entity.too.large" || error.status === 413) {
    res.status(413).json({
      error: "payload_too_large",
      message: "Uploaded image is too large. Try a smaller or compressed image.",
    });
    return;
  }

  if (error.status === 400) {
    res.status(400).json({
      error: "invalid_json",
      message: "Request body could not be parsed as JSON.",
    });
    return;
  }

  next(err);
});

export default app;
