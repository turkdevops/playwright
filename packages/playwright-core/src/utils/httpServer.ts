/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as http from 'http';
import fs from 'fs';
import path from 'path';
import { Server as WebSocketServer } from 'ws';
import * as mime from 'mime';
import { assert } from './utils';
import { VirtualFileSystem } from './vfs';

export type ServerRouteHandler = (request: http.IncomingMessage, response: http.ServerResponse) => boolean;

export class HttpServer {
  private _server: http.Server;
  private _urlPrefix: string;
  private _port: number = 0;
  private _routes: { prefix?: string, exact?: string, handler: ServerRouteHandler }[] = [];
  private _activeSockets = new Set<import('net').Socket>();
  constructor() {
    this._urlPrefix = '';
    this._server = http.createServer(this._onRequest.bind(this));
  }

  createWebSocketServer(): WebSocketServer {
    return new WebSocketServer({ server: this._server });
  }

  routePrefix(prefix: string, handler: ServerRouteHandler) {
    this._routes.push({ prefix, handler });
  }

  routePath(path: string, handler: ServerRouteHandler) {
    this._routes.push({ exact: path, handler });
  }

  port(): number {
    return this._port;
  }

  async start(port?: number): Promise<string> {
    console.assert(!this._urlPrefix, 'server already started');
    this._server.on('connection', socket => {
      this._activeSockets.add(socket);
      socket.once('close', () => this._activeSockets.delete(socket));
    });
    this._server.listen(port);
    await new Promise(cb => this._server!.once('listening', cb));
    const address = this._server.address();
    if (typeof address === 'string') {
      this._urlPrefix = address;
    } else {
      assert(address, 'Could not bind server socket');
      this._port = address.port;
      this._urlPrefix = `http://127.0.0.1:${address.port}`;
    }
    return this._urlPrefix;
  }

  async stop() {
    for (const socket of this._activeSockets)
      socket.destroy();
    await new Promise(cb => this._server!.close(cb));
  }

  urlPrefix(): string {
    return this._urlPrefix;
  }

  serveFile(response: http.ServerResponse, absoluteFilePath: string, headers?: { [name: string]: string }): boolean {
    try {
      const content = fs.readFileSync(absoluteFilePath);
      response.statusCode = 200;
      const contentType = mime.getType(path.extname(absoluteFilePath)) || 'application/octet-stream';
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', content.byteLength);
      for (const [name, value] of Object.entries(headers || {}))
        response.setHeader(name, value);
      response.end(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  async serveVirtualFile(response: http.ServerResponse, vfs: VirtualFileSystem, entry: string, headers?: { [name: string]: string }) {
    try {
      const content = await vfs.read(entry);
      response.statusCode = 200;
      const contentType = mime.getType(path.extname(entry)) || 'application/octet-stream';
      response.setHeader('Content-Type', contentType);
      response.setHeader('Content-Length', content.byteLength);
      for (const [name, value] of Object.entries(headers || {}))
        response.setHeader(name, value);
      response.end(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  private _onRequest(request: http.IncomingMessage, response: http.ServerResponse) {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
    if (request.headers.origin)
      response.setHeader('Access-Control-Allow-Headers', request.headers.origin);

    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
      return;
    }

    request.on('error', () => response.end());
    try {
      if (!request.url) {
        response.end();
        return;
      }
      const url = new URL('http://localhost' + request.url);
      for (const route of this._routes) {
        if (route.exact && url.pathname === route.exact && route.handler(request, response))
          return;
        if (route.prefix && url.pathname.startsWith(route.prefix) && route.handler(request, response))
          return;
      }
      response.statusCode = 404;
      response.end();
    } catch (e) {
      response.end();
    }
  }
}
