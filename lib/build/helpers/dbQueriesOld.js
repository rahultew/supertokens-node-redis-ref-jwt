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
const config_1 = require("../config");
const error_1 = require("../error");
const mongoOld_1 = require("./mongoOld");
const utils_1 = require("./utils");
const utils_2 = require("./utils");
// the purpose of this function is that it does the querying, and if mongo throws an error, it wraps that into an AuthError
function runQueryOrThrowAuthError(func) {
    return __awaiter(this, void 0, void 0, function*() {
        try {
            return yield func();
        } catch (err) {
            throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
        }
    });
}
/**
 *
 * @param mongoClient
 */
function getCollectionNames(mongoClient) {
    return __awaiter(this, void 0, void 0, function*() {
        return runQueryOrThrowAuthError(() =>
            __awaiter(this, void 0, void 0, function*() {
                const collections = yield mongoClient.db().collections();
                return collections.map(y => y.collectionName);
            })
        );
    });
}
exports.getCollectionNames = getCollectionNames;
function createSigningKeyCollection(mongoClient) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.createSigningKeyCollection = createSigningKeyCollection;
function createRefreshTokenCollection(mongoClient) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.createRefreshTokenCollection = createRefreshTokenCollection;
/**
 *
 * @param mongoClient
 * @param keyName
 */
function getKeyValueFromKeyName(mongoClient, keyName) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.getKeyValueFromKeyName = getKeyValueFromKeyName;
/**
 *
 * @returns true if insert successful, false if a key with that already exists.
 */
function insertKeyValueForKeyName(mongoClient, keyName, keyValue, createdAtTime) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.insertKeyValueForKeyName = insertKeyValueForKeyName;
/**
 *
 */
function updateKeyValueForKeyName(mongoClient, keyName, keyValue, createdAtTime, lastUpdatedSign) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.updateKeyValueForKeyName = updateKeyValueForKeyName;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param sessionData
 */
function updateSessionData(mongoClient, sessionHandle, sessionData) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.updateSessionData = updateSessionData;
function getSessionData(mongoClient, sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.getSessionData = getSessionData;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
function deleteSession(mongoClient, sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.deleteSession = deleteSession;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param userId
 * @param refreshTokenHash2
 * @param sessionData
 * @param expiresAt
 * @param jwtPayload
 */
function createNewSession(mongoClient, sessionHandle, userId, refreshTokenHash2, sessionData, expiresAt, jwtPayload) {
    return __awaiter(this, void 0, void 0, function*() {
        userId = utils_2.stringifyUserId(userId);
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
}
exports.createNewSession = createNewSession;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
function getSessionInfo(mongoClient, sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
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
                    userId: utils_2.parseUserIdToCorrectFormat(row.user_id),
                    refreshTokenHash2: row.refresh_token_hash_2,
                    sessionData: unserialiseSessionData(row.session_info),
                    expiresAt: Number(row.expires_at),
                    jwtPayload: unserialiseSessionData(row.jwt_user_payload),
                    lastUpdatedSign: row.last_updated_sign.toString()
                };
            })
        );
    });
}
exports.getSessionInfo = getSessionInfo;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param refreshTokenHash2
 * @param sessionData
 * @param expiresAt
 * @param oldCreatedAtTime
 */
function updateSessionInfo(mongoClient, sessionHandle, refreshTokenHash2, sessionData, expiresAt, lastUpdatedSign) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.updateSessionInfo = updateSessionInfo;
/**
 *
 * @param mongoClient
 * @param userId
 */
function getAllSessionHandlesForUser(mongoClient, userId) {
    return __awaiter(this, void 0, void 0, function*() {
        userId = utils_2.stringifyUserId(userId);
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
}
exports.getAllSessionHandlesForUser = getAllSessionHandlesForUser;
function deleteAllExpiredSessions(mongoClient) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.deleteAllExpiredSessions = deleteAllExpiredSessions;
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
function resetTables(mongoClient) {
    return __awaiter(this, void 0, void 0, function*() {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
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
}
exports.resetTables = resetTables;
function getNumberOfRowsInRefreshTokensTable() {
    return __awaiter(this, void 0, void 0, function*() {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        return runQueryOrThrowAuthError(() =>
            __awaiter(this, void 0, void 0, function*() {
                let mongoClient = yield mongoOld_1.Mongo.getClient();
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
}
exports.getNumberOfRowsInRefreshTokensTable = getNumberOfRowsInRefreshTokensTable;
function isSessionBlacklisted(mongoClient, sessionHandle) {
    return __awaiter(this, void 0, void 0, function*() {
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
}
exports.isSessionBlacklisted = isSessionBlacklisted;
//# sourceMappingURL=dbQueriesOld.js.map
