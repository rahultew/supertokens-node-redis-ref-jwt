import * as mongo from "mongodb";

import Config from "../config";
import { AuthError, generateError } from "../error";
import { Mongo } from "./mongoOld";
import { generateUUID } from "./utils";
import { parseUserIdToCorrectFormat, stringifyUserId } from "./utils";

// the purpose of this function is that it does the querying, and if mongo throws an error, it wraps that into an AuthError
async function runQueryOrThrowAuthError<OutputType>(func: () => Promise<OutputType>) {
    try {
        return await func();
    } catch (err) {
        throw generateError(AuthError.GENERAL_ERROR, err);
    }
}

/**
 *
 * @param mongoClient
 */
export async function getCollectionNames(mongoClient: mongo.MongoClient): Promise<string[]> {
    return runQueryOrThrowAuthError(async () => {
        const collections = await mongoClient.db().collections();
        return collections.map(y => y.collectionName);
    });
}

export async function createSigningKeyCollection(mongoClient: mongo.MongoClient) {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        await mongoClient.db().createCollection(config.mongo.collections.signingKey);
        await mongoClient
            .db()
            .collection(config.mongo.collections.signingKey)
            .createIndex({ key_name: 1 }, { unique: true });
        // TODO: perhaps add last_updated_sign too to unique?
    });
}

export async function createRefreshTokenCollection(mongoClient: mongo.MongoClient) {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        await mongoClient.db().createCollection(config.mongo.collections.refreshTokens);
        await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .createIndex({ session_handle: 1 }, { unique: true });
        // TODO: perhaps add last_updated_sign too to unique?
    });
}

/**
 *
 * @param mongoClient
 * @param keyName
 */
export async function getKeyValueFromKeyName(
    mongoClient: mongo.MongoClient,
    keyName: string
): Promise<{ keyValue: string; createdAtTime: number; lastUpdatedSign: string } | undefined> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = { key_name: keyName };
        const doc = await mongoClient
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
    });
}

/**
 *
 * @returns true if insert successful, false if a key with that already exists.
 */
export async function insertKeyValueForKeyName(
    mongoClient: mongo.MongoClient,
    keyName: string,
    keyValue: string,
    createdAtTime: number
): Promise<boolean> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = {
            key_name: keyName,
            key_value: keyValue,
            created_at_time: createdAtTime,
            last_updated_sign: generateUUID()
        };
        try {
            await mongoClient
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
    });
}

/**
 *
 */
export async function updateKeyValueForKeyName(
    mongoClient: mongo.MongoClient,
    keyName: string,
    keyValue: string,
    createdAtTime: number,
    lastUpdatedSign: string
): Promise<number> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const result = await mongoClient
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
                        last_updated_sign: generateUUID()
                    }
                },
                {
                    upsert: false
                }
            );
        return result.result.nModified;
    });
}

/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param sessionData
 */
export async function updateSessionData(mongoClient: mongo.MongoClient, sessionHandle: string, sessionData: any) {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        let result = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .updateOne(
                {
                    session_handle: sessionHandle
                },
                {
                    $set: {
                        last_updated_sign: generateUUID(),
                        session_info: serialiseSessionData(sessionData)
                    }
                },
                {
                    upsert: false
                }
            );
        return result.result.nModified;
    });
}

export async function getSessionData(
    mongoClient: mongo.MongoClient,
    sessionHandle: string
): Promise<{ found: false } | { found: true; data: any }> {
    return runQueryOrThrowAuthError<{ found: false } | { found: true; data: any }>(async () => {
        const config = Config.get();
        const query = { session_handle: sessionHandle };
        let result = await mongoClient
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
    });
}

/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
export async function deleteSession(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<number> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = { session_handle: sessionHandle };
        const result = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .deleteOne(query);
        if (result.result.n === undefined) {
            return 0;
        }
        return result.result.n;
    });
}

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
export async function createNewSession(
    mongoClient: mongo.MongoClient,
    sessionHandle: string,
    userId: string | number,
    refreshTokenHash2: string,
    sessionData: any,
    expiresAt: number,
    jwtPayload: any
) {
    userId = stringifyUserId(userId);
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = {
            session_handle: sessionHandle,
            user_id: userId,
            refresh_token_hash_2: refreshTokenHash2,
            session_info: serialiseSessionData(sessionData),
            expires_at: expiresAt,
            jwt_user_payload: serialiseSessionData(jwtPayload),
            last_updated_sign: generateUUID()
        };
        await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .insertOne(query);
    });
}

/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
export async function getSessionInfo(
    mongoClient: mongo.MongoClient,
    sessionHandle: string
): Promise<
    | {
          userId: string | number;
          refreshTokenHash2: string;
          sessionData: any;
          expiresAt: number;
          jwtPayload: any;
          lastUpdatedSign: string;
      }
    | undefined
> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = { session_handle: sessionHandle };
        const row = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .findOne(query);
        if (row === null) {
            return undefined;
        }
        return {
            userId: parseUserIdToCorrectFormat(row.user_id),
            refreshTokenHash2: row.refresh_token_hash_2,
            sessionData: unserialiseSessionData(row.session_info),
            expiresAt: Number(row.expires_at),
            jwtPayload: unserialiseSessionData(row.jwt_user_payload),
            lastUpdatedSign: row.last_updated_sign.toString()
        };
    });
}

/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param refreshTokenHash2
 * @param sessionData
 * @param expiresAt
 * @param oldCreatedAtTime
 */
export async function updateSessionInfo(
    mongoClient: mongo.MongoClient,
    sessionHandle: string,
    refreshTokenHash2: string,
    sessionData: any,
    expiresAt: number,
    lastUpdatedSign: string
): Promise<number> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const result = await mongoClient
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
                        last_updated_sign: generateUUID()
                    }
                },
                {
                    upsert: false
                }
            );
        return result.result.nModified;
    });
}

/**
 *
 * @param mongoClient
 * @param userId
 */
export async function getAllSessionHandlesForUser(
    mongoClient: mongo.MongoClient,
    userId: string | number
): Promise<string[]> {
    userId = stringifyUserId(userId);
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = {
            user_id: userId
        };
        let result = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .find(query)
            .toArray();
        return result.map(y => y.session_handle.toString());
    });
}

export async function deleteAllExpiredSessions(mongoClient: mongo.MongoClient) {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = {
            expires_at: {
                $lte: Date.now()
            }
        };
        await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .deleteMany(query);
    });
}

function serialiseSessionData(data: any): string {
    if (data === undefined) {
        return "";
    } else {
        return JSON.stringify(data);
    }
}

function unserialiseSessionData(data: string): any {
    if (data === "") {
        return undefined;
    } else {
        try {
            return JSON.parse(data);
        } catch (err) {
            throw generateError(AuthError.GENERAL_ERROR, err);
        }
    }
}

export async function resetTables(mongoClient: mongo.MongoClient) {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("call this function only during testing");
    }
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .drop();
        await mongoClient
            .db()
            .collection(config.mongo.collections.signingKey)
            .drop();
    });
}

export async function getNumberOfRowsInRefreshTokensTable(): Promise<number> {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("call this function only during testing");
    }
    return runQueryOrThrowAuthError(async () => {
        let mongoClient = await Mongo.getClient();
        const config = Config.get();
        let result = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .find({})
            .count();
        return Number(result);
    });
}

export async function isSessionBlacklisted(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<boolean> {
    return runQueryOrThrowAuthError(async () => {
        const config = Config.get();
        const query = { session_handle: sessionHandle };
        let result = await mongoClient
            .db()
            .collection(config.mongo.collections.refreshTokens)
            .find(query)
            .count();
        return result === 0;
    });
}
