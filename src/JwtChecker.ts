import { Algorithm, VerifyOptions, verify } from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "./Errors";

function verifyAsync(
  token: string,
  secret: string,
  options?: VerifyOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    verify(token, secret, options, (err, decoded) => {
      if (err) return reject(new ForbiddenError(err.message));
      resolve(decoded);
    });
  });
}

export default function (
  algorithm: Algorithm,
  secret: string,
  audience: string
) {
  return async function (headers: any) {
    const token = headers.authorization?.split(/\s+/);
    if (token?.[0]?.toLowerCase() !== "bearer") throw new UnauthorizedError();
    const jwt = await verifyAsync(token[1], secret, {
      algorithms: [algorithm],
      audience,
    });
    const ret = jwt.sub;
    if (!ret) throw new ForbiddenError();
    return ret;
  };
}
