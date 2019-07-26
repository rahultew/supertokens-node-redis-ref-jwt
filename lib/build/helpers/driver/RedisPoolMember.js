"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class RedisPoolMember {
    constructor(client, releaseFunction) {
        this.setIsConnected = isConnected => {
            this.isConnected = isConnected;
        };
        this.releaseConnection = () => {
            if (!this.isConnected) {
                return;
            }
            this.releaseFunction();
        };
        this.quit = () => {
            if (this.hasQuit) {
                return;
            }
            this.hasQuit = true;
            this.isConnected = false;
            this.client.quit();
        };
        this.set = (key, value) =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        return (yield utils_1.toPromise(this.client.set.bind(this.client))(key, value))[0];
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    throw err;
                }
            });
        this.get = key =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        return (yield utils_1.toPromise(this.client.get.bind(this.client))(key))[0];
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    throw err;
                }
            });
        this.sendCommand = (command, ...args) =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        return (yield utils_1.toPromise(this.client.sendCommand.bind(this.client))(command, args))[0];
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    throw err;
                }
            });
        this.incr = key =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        yield utils_1.toPromise(this.client.incr.bind(this.client)(key))[0];
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    throw err;
                }
            });
        this.watch = key =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        yield utils_1.toPromise(this.client.watch.bind(this.client)(key))[0];
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    throw err;
                }
            });
        this.discard = () =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        yield utils_1.toPromise(this.client.discard.bind(this.client))();
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    // We ignore this error
                }
            });
        this.exec = multi =>
            __awaiter(this, void 0, void 0, function*() {
                try {
                    if (this.isConnected) {
                        yield utils_1.toPromise(multi.exec.bind(multi))();
                    } else {
                        throw Error("Client not connected");
                    }
                } catch (err) {
                    yield this.discard();
                    throw err;
                }
            });
        this.getMulti = () => {
            return this.client.multi();
        };
        this.isConnected = true;
        this.client = client;
        this.hasQuit = false;
        this.releaseFunction = releaseFunction;
    }
}
exports.RedisPoolMember = RedisPoolMember;
//# sourceMappingURL=RedisPoolMember.js.map
