import * as WebSocket from "ws";
import * as basicAuth from "basic-auth";
import * as express from "express";
import * as trouter from "trouter";
import { IncomingMessage } from "http";
import { Socket } from "net";
import { json as jsonBodyParser } from "body-parser";

const WS_METHOD = "GET";

interface Request extends IncomingMessage {
  readonly auth?: basicAuth.BasicAuthResult;
  readonly params: any;
  readonly query: any;
  readonly body: any;
}

type Response = express.Response;

type WSFN = (request: Request, socket: WebSocket) => void;

type RequestHandler = (req: Request, res: Response) => void;
type NextFunction = (err?: any) => void;
type ErrorHandler = (
  err: Error | any,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

function createApp() {
  return express()
    .set("trust proxy", true)
    .set("x-powered-by", false)
    .use(jsonBodyParser());
}

function wrap(fn: RequestHandler) {
  return function (req: Request, res: Response, next: NextFunction) {
    const b = Object.assign(req, { auth: basicAuth(req) });
    Promise.resolve(fn(b, res)).catch(next);
  };
}

class Server {
  #router = new trouter();
  #app = createApp();

  use(fn: ErrorHandler) {
    this.#app.use(fn);
    return this;
  }

  get(pattern: string, fn: RequestHandler) {
    this.#app.get(pattern, wrap(fn));
    return this;
  }

  getFile(pattern: string, path: string) {
    this.#app.get(
      pattern,
      wrap((req, res) => res.sendFile(path))
    );

    return this;
  }

  post(pattern: string, fn: RequestHandler) {
    this.#app.post(pattern, wrap(fn));
    return this;
  }

  put(pattern: string, fn: RequestHandler) {
    this.#app.put(pattern, wrap(fn));
    return this;
  }

  delete(pattern: string, fn: RequestHandler) {
    this.#app.delete(pattern, wrap(fn));
    return this;
  }

  websocket(pattern: string, fn: WSFN) {
    this.#router.add(WS_METHOD, pattern, fn);
    return this;
  }

  listen(port: number, callback?: () => void) {
    const ret = this.#app.listen(port, callback);
    const wss = new WebSocket.Server({ noServer: true });

    ret.on("upgrade", (req, socket: Socket, head) => {
      const item = this.#router.find(WS_METHOD, req.url);
      if (!item.handlers.length) {
        socket.write("HTTP/1.1 404 Not found\r\n\r\n");
        return socket.destroy();
      }

      wss.handleUpgrade(req, socket, head, (ws, req: any) => {
        req.auth = basicAuth(req);
        req.params = item.params;
        item.handlers.forEach(async (fn) => {
          try {
            await fn(req, ws);
          } catch (err) {
            console.error(err);
            ws.close(1002, err?.message?.substr(0, 120));
          }
        });
      });
    });

    return ret;
  }
}

export default function () {
  return new Server();
}
