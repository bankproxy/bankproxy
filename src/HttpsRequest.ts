import * as https from "https";

export interface HttpsResponseHeaders extends NodeJS.Dict<string | string[]> {
  "content-type"?: string;
  location?: string;
  "set-cookie"?: string[];
}

export interface HttpsResponse {
  headers: HttpsResponseHeaders;
  statusCode: number;
  statusMessage: string;
  body: Buffer;
}

export function httpsRequest(
  log: (line: string) => void,
  url: string,
  options: https.RequestOptions,
  data?: Buffer
) {
  if (data) options.headers["Content-Length"] = data.length;

  return new Promise<HttpsResponse>((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        const body = Buffer.concat(chunks);

        log(`========================================`);
        log(`${options.method} ${url}: ${JSON.stringify(options.headers)}`);
        log(`> ${data}`);
        log(`----------------------------------------`);
        log(`${JSON.stringify(res.headers)}`);
        log(`< ${body.toString()}`);

        resolve({
          headers: res.headers,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          body,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (data) req.write(data);
    req.end();
  });
}
