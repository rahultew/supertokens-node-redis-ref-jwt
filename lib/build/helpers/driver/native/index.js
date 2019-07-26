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
const config_1 = require("../../../config");
const error_1 = require("../../../error");
const utils_1 = require("../../utils");
class NativeMongoDriver {
    constructor(client, config) {
        this.givenByClient = false;
        this.close = () =>
            __awaiter(this, void 0, void 0, function*() {
                yield this.client.close(true);
            });
        this.isConnected = () => {
            return this.client.isConnected();
        };
        this.getCollectionNames = () =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const collections = yield mongoClient.db().collections();
                        return collections.map(y => y.collectionName);
                    })
                );
            });
        this.createSigningKeyCollection = () =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        yield mongoClient.db().createCollection(config.mongo.collections.signingKey);
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.signingKey)
                            .createIndex({ key_name: 1 }, { unique: true });
                        // TODO: perhaps add last_updated_sign too to unique?
                    })
                );
            });
        this.createRefreshTokenCollection = () =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        yield mongoClient.db().createCollection(config.mongo.collections.refreshTokens);
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .createIndex({ session_handle: 1 }, { unique: true });
                        // TODO: perhaps add last_updated_sign too to unique?
                    })
                );
            });
        this.getKeyValueFromKeyName = keyName =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = { key_name: keyName };
                        const doc = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.signingKey)
                            .findOne(query);
                        if (doc === null) {
                            return undefined;
                        }
                        return {
                            keyValue: doc.key_value.toString(),
                            createdAtTime: Number(doc.created_at_time),
                            lastUpdatedSign: doc.last_updated_sign.toString()
                        };
                    })
                );
            });
        this.insertKeyValueForKeyName = (keyName, keyValue, createdAtTime) =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = {
                            key_name: keyName,
                            key_value: keyValue,
                            created_at_time: createdAtTime,
                            last_updated_sign: utils_1.generateUUID()
                        };
                        try {
                            yield mongoClient
                                .db()
                                .collection(config.mongo.collections.signingKey)
                                .insertOne(query);
                        } catch (err) {
                            if (err.message.includes("duplicate key error index")) {
                                return false;
                            }
                            throw err;
                        }
                        return true;
                    })
                );
            });
        this.updateKeyValueForKeyName = (keyName, keyValue, createdAtTime, lastUpdatedSign) =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.signingKey)
                            .updateOne(
                                {
                                    key_name: keyName,
                                    last_updated_sign: lastUpdatedSign
                                },
                                {
                                    $set: {
                                        key_name: keyName,
                                        key_value: keyValue,
                                        created_at_time: createdAtTime,
                                        last_updated_sign: utils_1.generateUUID()
                                    }
                                },
                                {
                                    upsert: false
                                }
                            );
                        return result.result.nModified;
                    })
                );
            });
        this.updateSessionData = (sessionHandle, sessionData) =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        let result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .updateOne(
                                {
                                    session_handle: sessionHandle
                                },
                                {
                                    $set: {
                                        last_updated_sign: utils_1.generateUUID(),
                                        session_info: serialiseSessionData(sessionData)
                                    }
                                },
                                {
                                    upsert: false
                                }
                            );
                        return result.result.nModified;
                    })
                );
            });
        this.getSessionData = sessionHandle =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = { session_handle: sessionHandle };
                        let result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .findOne(query);
                        if (result === null) {
                            return {
                                found: false
                            };
                        }
                        return {
                            found: true,
                            data: unserialiseSessionData(result.session_info)
                        };
                    })
                );
            });
        this.deleteSession = sessionHandle =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = { session_handle: sessionHandle };
                        const result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .deleteOne(query);
                        if (result.result.n === undefined) {
                            return 0;
                        }
                        return result.result.n;
                    })
                );
            });
        this.createNewSession = (sessionHandle, userId, refreshTokenHash2, sessionData, expiresAt, jwtPayload) =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                userId = utils_1.stringifyUserId(userId);
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = {
                            session_handle: sessionHandle,
                            user_id: userId,
                            refresh_token_hash_2: refreshTokenHash2,
                            session_info: serialiseSessionData(sessionData),
                            expires_at: expiresAt,
                            jwt_user_payload: serialiseSessionData(jwtPayload),
                            last_updated_sign: utils_1.generateUUID()
                        };
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .insertOne(query);
                    })
                );
            });
        this.getSessionInfo = sessionHandle =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = { session_handle: sessionHandle };
                        const row = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .findOne(query);
                        if (row === null) {
                            return undefined;
                        }
                        return {
                            userId: utils_1.parseUserIdToCorrectFormat(row.user_id),
                            refreshTokenHash2: row.refresh_token_hash_2,
                            sessionData: unserialiseSessionData(row.session_info),
                            expiresAt: Number(row.expires_at),
                            jwtPayload: unserialiseSessionData(row.jwt_user_payload),
                            lastUpdatedSign: row.last_updated_sign.toString()
                        };
                    })
                );
            });
        this.updateSessionInfo = (sessionHandle, refreshTokenHash2, sessionData, expiresAt, lastUpdatedSign) =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .updateOne(
                                {
                                    session_handle: sessionHandle,
                                    last_updated_sign: lastUpdatedSign
                                },
                                {
                                    $set: {
                                        refresh_token_hash_2: refreshTokenHash2,
                                        session_info: serialiseSessionData(sessionData),
                                        expires_at: expiresAt,
                                        last_updated_sign: utils_1.generateUUID()
                                    }
                                },
                                {
                                    upsert: false
                                }
                            );
                        return result.result.nModified;
                    })
                );
            });
        this.getAllSessionHandlesForUser = userId =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                userId = utils_1.stringifyUserId(userId);
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = {
                            user_id: userId
                        };
                        let result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .find(query)
                            .toArray();
                        return result.map(y => y.session_handle.toString());
                    })
                );
            });
        this.deleteAllExpiredSessions = () =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = {
                            expires_at: {
                                $lte: Date.now()
                            }
                        };
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .deleteMany(query);
                    })
                );
            });
        this.resetTables = () =>
            __awaiter(this, void 0, void 0, function*() {
                if (process.env.TEST_MODE !== "testing") {
                    throw Error("call this function only during testing");
                }
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .drop();
                        yield mongoClient
                            .db()
                            .collection(config.mongo.collections.signingKey)
                            .drop();
                    })
                );
            });
        this.getNumberOfRowsInRefreshTokensTable = () =>
            __awaiter(this, void 0, void 0, function*() {
                if (process.env.TEST_MODE !== "testing") {
                    throw Error("call this function only during testing");
                }
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        let result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .find({})
                            .count();
                        return Number(result);
                    })
                );
            });
        this.isSessionBlacklisted = sessionHandle =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield this.getClient();
                return runQueryOrThrowAuthError(() =>
                    __awaiter(this, void 0, void 0, function*() {
                        const config = config_1.default.get();
                        const query = { session_handle: sessionHandle };
                        let result = yield mongoClient
                            .db()
                            .collection(config.mongo.collections.refreshTokens)
                            .find(query)
                            .count();
                        return result === 0;
                    })
                );
            });
        this.createCollectionsIndexesIfNotExists = () =>
            __awaiter(this, void 0, void 0, function*() {
                if (!(yield this.checkIfSigningKeyCollectionExists())) {
                    yield this.createSigningKeyCollection();
                }
                if (!(yield this.checkIfRefreshTokensCollectionExists())) {
                    yield this.createRefreshTokenCollection();
                }
            });
        this.checkIfSigningKeyCollectionExists = () =>
            __awaiter(this, void 0, void 0, function*() {
                const config = config_1.default.get();
                const collectionNames = yield this.getCollectionNames();
                return collectionNames.includes(config.mongo.collections.signingKey);
            });
        this.checkIfRefreshTokensCollectionExists = () =>
            __awaiter(this, void 0, void 0, function*() {
                const config = config_1.default.get();
                const collectionNames = yield this.getCollectionNames();
                return collectionNames.includes(config.mongo.collections.refreshTokens);
            });
        if (client !== null) {
            if (!client.isConnected()) {
                throw Error("Please pass a connected client to this library");
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
            if (!NativeMongoDriver.processEventListentersSet) {
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
                NativeMongoDriver.processEventListentersSet = true;
            }
        }
    }
    getClient() {
        return new Promise((resolve, reject) => {
            if (this.givenByClient) {
                if (this.client.isConnected()) {
                    resolve(this.client);
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
                if (this.client.isConnected()) {
                    resolve(this.client);
                    return;
                } else {
                    this.client
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
NativeMongoDriver.processEventListentersSet = false;
exports.NativeMongoDriver = NativeMongoDriver;
function runQueryOrThrowAuthError(func) {
    return __awaiter(this, void 0, void 0, function*() {
        try {
            return yield func();
        } catch (err) {
            throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
        }
    });
}
function serialiseSessionData(data) {
    if (data === undefined) {
        return "";
    } else {
        return JSON.stringify(data);
    }
}
function unserialiseSessionData(data) {
    if (data === "") {
        return undefined;
    } else {
        try {
            return JSON.parse(data);
        } catch (err) {
            throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
        }
    }
}
//# sourceMappingURL=index.js.map
