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
const mongo = require("mongodb");
const config_1 = require("../config");
const error_1 = require("../error");
const dbQueriesOld_1 = require("./dbQueriesOld");
class Mongo {
    constructor(config, client) {
        this.givenByClient = false;
        if (client !== undefined) {
            if (!client.isConnected()) {
                throw Error("Please pass a connected client to this library");
            }
            if (client.db().databaseName !== config.mongo.database) {
                throw Error("Please make sure the mongo client is connected to the correct databse");
            }
            this.client = client;
            this.givenByClient = true;
        } else {
            let url =
                config.mongo.url !== undefined
                    ? config.mongo.url
                    : `mongodb://${config.mongo.user}:${config.mongo.password}@${config.mongo.host}:${
                          config.mongo.port
                      }/${config.mongo.database}?connectTimeoutMS=${config.mongo.connectTimeout}&socketTimeoutMS=${
                          config.mongo.socketTimeout
                      }`;
            this.client = new mongo.MongoClient(url, { useNewUrlParser: true });
            if (!Mongo.processEventListentersSet) {
                process.on("SIGINT", () =>
                    __awaiter(this, void 0, void 0, function*() {
                        if (this.client.isConnected()) {
                            yield this.client.close();
                        }
                    })
                );
                process.on("SIGTERM", () =>
                    __awaiter(this, void 0, void 0, function*() {
                        if (this.client.isConnected()) {
                            yield this.client.close();
                        }
                    })
                );
                process.on("exit", () =>
                    __awaiter(this, void 0, void 0, function*() {
                        if (this.client.isConnected()) {
                            yield this.client.close();
                        }
                    })
                );
                Mongo.processEventListentersSet = true;
            }
        }
    }
    static init(client) {
        return __awaiter(this, void 0, void 0, function*() {
            if (Mongo.instance === undefined) {
                try {
                    const config = config_1.default.get();
                    Mongo.instance = new Mongo(config, client);
                    yield createCollectionsIndexesIfNotExists();
                } catch (err) {
                    Mongo.instance = undefined;
                    throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
                }
            }
        });
    }
    static getClient() {
        return new Promise((resolve, reject) => {
            if (Mongo.instance === undefined) {
                reject(error_1.generateError(error_1.AuthError.GENERAL_ERROR, new Error("mongo not initiated")));
                return;
            }
            if (Mongo.instance.givenByClient) {
                if (Mongo.instance.client.isConnected()) {
                    resolve(Mongo.instance.client);
                    return;
                } else {
                    reject(
                        error_1.generateError(
                            error_1.AuthError.GENERAL_ERROR,
                            new Error(
                                "Please provide a connected client to SuperTokens lib and keep it connected until this node process is running"
                            )
                        )
                    );
                }
            } else {
                if (Mongo.instance.client.isConnected()) {
                    resolve(Mongo.instance.client);
                    return;
                } else {
                    Mongo.instance.client
                        .connect()
                        .then(mClient => {
                            resolve(mClient);
                        })
                        .catch(err => {
                            reject(error_1.generateError(error_1.AuthError.GENERAL_ERROR, err));
                        });
                }
            }
        });
    }
}
Mongo.processEventListentersSet = false;
Mongo.reset = () =>
    __awaiter(this, void 0, void 0, function*() {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (Mongo.instance !== undefined && Mongo.instance.client.isConnected()) {
            yield Mongo.instance.client.close();
        }
        Mongo.instance = undefined;
    });
exports.Mongo = Mongo;
function createCollectionsIndexesIfNotExists() {
    return __awaiter(this, void 0, void 0, function*() {
        const config = config_1.default.get();
        const mongoClient = yield Mongo.getClient();
        if (!(yield checkIfSigningKeyCollectionExists())) {
            yield dbQueriesOld_1.createSigningKeyCollection(mongoClient);
        }
        if (!(yield checkIfRefreshTokensCollectionExists())) {
            yield dbQueriesOld_1.createRefreshTokenCollection(mongoClient);
        }
    });
}
function checkIfSigningKeyCollectionExists() {
    return __awaiter(this, void 0, void 0, function*() {
        const config = config_1.default.get();
        const mongoClient = yield Mongo.getClient();
        const collectionNames = yield dbQueriesOld_1.getCollectionNames(mongoClient);
        return collectionNames.includes(config.mongo.collections.signingKey);
    });
}
exports.checkIfSigningKeyCollectionExists = checkIfSigningKeyCollectionExists;
function checkIfRefreshTokensCollectionExists() {
    return __awaiter(this, void 0, void 0, function*() {
        const config = config_1.default.get();
        const mongoClient = yield Mongo.getClient();
        const collectionNames = yield dbQueriesOld_1.getCollectionNames(mongoClient);
        return collectionNames.includes(config.mongo.collections.refreshTokens);
    });
}
exports.checkIfRefreshTokensCollectionExists = checkIfRefreshTokensCollectionExists;
//# sourceMappingURL=mongoOld.js.map
