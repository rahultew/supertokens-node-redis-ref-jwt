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
const redis = require("redis");
const RedisPoolMember_1 = require("./RedisPoolMember");
class RedisPool {
    constructor(clientConfig) {
        this.clientConfig = clientConfig;
        this.idleMemberSet = new Set();
        this.busyMemberSet = new Set();
    }
}
RedisPool.waitingList = [];
RedisPool.getClient = (init = false) =>
    __awaiter(this, void 0, void 0, function*() {
        let instance = RedisPool.instance;
        if (instance === undefined) {
            throw new Error("init function not called");
        }
        if (!RedisPool.shouldKeepClient()) {
            return new Promise((actualResolve, actualReject) => {
                let isFinished = false;
                function resolve(member) {
                    if (isFinished) {
                        return;
                    }
                    isFinished = true;
                    instance.idleMemberSet.delete(member);
                    instance.busyMemberSet.add(member);
                    actualResolve(member);
                }
                function reject(err) {
                    if (isFinished) {
                        return;
                    }
                    isFinished = true;
                    actualReject(err);
                }
                RedisPool.waitingList.push(resolve);
                setTimeout(() => {
                    reject(new Error("Waited for 500 ms to get a connection. But failed"));
                }, 500);
            });
        }
        if (instance.idleMemberSet.size == 0) {
            return new Promise((actualResolve, actualReject) => {
                let newClient = redis.createClient(instance.clientConfig);
                let member;
                let hasFinished = false;
                let endCalled = false;
                let lastError = undefined;
                function resolve(response) {
                    if (!hasFinished) {
                        hasFinished = true;
                        actualResolve(response);
                    }
                }
                function reject(err) {
                    if (!hasFinished) {
                        hasFinished = true;
                        actualReject(err);
                    }
                }
                let releaseMember = () => {
                    if (member === undefined || endCalled) {
                        return;
                    }
                    instance.busyMemberSet.delete(member);
                    if (RedisPool.shouldKeepClient()) {
                        instance.idleMemberSet.add(member);
                        if (RedisPool.waitingList.length > 0) {
                            let next = RedisPool.waitingList.shift();
                            next(member);
                        }
                    } else {
                        member.quit();
                    }
                };
                newClient.on("ready", (err, res) => {
                    if (endCalled) {
                        return;
                    }
                    if (err !== undefined && err !== null) {
                        reject(err);
                    } else {
                        member = new RedisPoolMember_1.RedisPoolMember(newClient, releaseMember);
                        instance.busyMemberSet.add(member);
                        resolve(member);
                    }
                });
                newClient.on("error", (err, res) => {
                    // end will be called after this.
                    lastError = err;
                });
                newClient.on("end", (err, res) =>
                    __awaiter(this, void 0, void 0, function*() {
                        if (endCalled) {
                            return;
                        }
                        endCalled = true;
                        if (member === undefined) {
                            newClient.quit();
                            let toThrowErr = new Error("Something went wrong");
                            if (err !== undefined) {
                                toThrowErr = err;
                            } else if (lastError !== undefined) {
                                toThrowErr = lastError;
                            }
                            reject(toThrowErr);
                        } else {
                            member.setIsConnected(false);
                            instance.busyMemberSet.delete(member);
                            instance.idleMemberSet.delete(member);
                            member.quit();
                            return;
                        }
                    })
                );
            });
        } else {
            let member;
            for (let m of instance.idleMemberSet) {
                member = m;
                break;
            }
            if (member === undefined) {
                throw Error("Should never come here");
            }
            instance.idleMemberSet.delete(member);
            instance.busyMemberSet.add(member);
            return member;
        }
    });
RedisPool.shouldKeepClient = () => {
    let instance = RedisPool.instance;
    if (instance === undefined) {
        throw new Error("init function not called");
    }
    let currNumberOfClients = instance.busyMemberSet.size + instance.idleMemberSet.size;
    let noOtherClient = currNumberOfClients === 0;
    let withinLimitOfMax =
        RedisPool.maxNumberOfClients !== undefined &&
        Math.floor(0.75 * RedisPool.maxNumberOfClients) >= currNumberOfClients;
    return noOtherClient || withinLimitOfMax;
};
RedisPool.getSetSizes = () => {
    let instance = RedisPool.instance;
    return `${instance.busyMemberSet.size} ${instance.idleMemberSet.size}`;
};
RedisPool.init = clientConfig =>
    __awaiter(this, void 0, void 0, function*() {
        if (RedisPool.instance === undefined) {
            RedisPool.instance = new RedisPool(clientConfig === undefined ? {} : clientConfig);
        }
        let client = yield RedisPool.getClient();
        let maxNumber = undefined;
        try {
            maxNumber = Number((yield client.sendCommand("CONFIG", "GET", "maxclients"))[1]);
        } catch (err) {
            client.quit();
            RedisPool.instance = undefined;
            throw err;
        }
        client.releaseConnection();
        RedisPool.maxNumberOfClients = maxNumber;
    });
exports.default = RedisPool;
//# sourceMappingURL=RedisPool.js.map
