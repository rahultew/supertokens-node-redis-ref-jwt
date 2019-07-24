import * as mongo from "mongodb";

import Config from "../../../config";
import { AuthError, generateError } from "../../../error";
import { TypeConfig } from "../../types";
import { generateUUID, parseUserIdToCorrectFormat, stringifyUserId } from "../../utils";
import { Driver } from "../driverInterface";

export class NativeMongoDriver implements Driver {
    private client: mongo.MongoClient;
    private static processEventListentersSet: boolean = false;
    private givenByClient = false;

    constructor(client: mongo.MongoClient | null, config: TypeConfig) {
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
                process.on("SIGINT", async () => {
                    if (this.client.isConnected()) {
                        await this.client.close();
                    }
                });
                process.on("SIGTERM", async () => {
                    if (this.client.isConnected()) {
                        await this.client.close();
                    }
                });
                process.on("exit", async () => {
                    if (this.client.isConnected()) {
                        await this.client.close();
                    }
                });
                NativeMongoDriver.processEventListentersSet = true;
            }
        }
    }

    private getClient(): Promise<mongo.MongoClient> {
        return new Promise<mongo.MongoClient>((resolve, reject) => {
            if (this.givenByClient) {
                if (this.client.isConnected()) {
                    resolve(this.client);
                    return;
                } else {
                    reject(
                        generateError(
                            AuthError.GENERAL_ERROR,
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
                            reject(generateError(AuthError.GENERAL_ERROR, err));
                        });
                }
            }
        });
    }

    close = async (): Promise<void> => {
        await this.client.close(true);
    };

    isConnected = (): boolean => {
        return this.client.isConnected();
    };

    getCollectionNames = async (): Promise<string[]> => {
        let mongoClient = await this.getClient();
        return runQueryOrThrowAuthError(async () => {
            const collections = await mongoClient.db().collections();
            return collections.map(y => y.collectionName);
        });
    };

    createSigningKeyCollection = async (): Promise<void> => {
        let mongoClient = await this.getClient();
        return runQueryOrThrowAuthError(async () => {
            const config = Config.get();
            await mongoClient.db().createCollection(config.mongo.collections.signingKey);
            await mongoClient
                .db()
                .collection(config.mongo.collections.signingKey)
                .createIndex({ key_name: 1 }, { unique: true });
            // TODO: perhaps add last_updated_sign too to unique?
        });
    };

    createRefreshTokenCollection = async (): Promise<void> => {
        let mongoClient = await this.getClient();
        return runQueryOrThrowAuthError(async () => {
            const config = Config.get();
            await mongoClient.db().createCollection(config.mongo.collections.refreshTokens);
            await mongoClient
                .db()
                .collection(config.mongo.collections.refreshTokens)
                .createIndex({ session_handle: 1 }, { unique: true });
            // TODO: perhaps add last_updated_sign too to unique?
        });
    };

    getKeyValueFromKeyName = async (
        keyName: string
    ): Promise<{ keyValue: string; createdAtTime: number; lastUpdatedSign: string } | undefined> => {
        let mongoClient = await this.getClient();
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
    };

    insertKeyValueForKeyName = async (keyName: string, keyValue: string, createdAtTime: number): Promise<boolean> => {
        let mongoClient = await this.getClient();
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
    };

    updateKeyValueForKeyName = async (
        keyName: string,
        keyValue: string,
        createdAtTime: number,
        lastUpdatedSign: string
    ): Promise<number> => {
        let mongoClient = await this.getClient();
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
    };

    updateSessionData = async (sessionHandle: string, sessionData: any): Promise<number> => {
        let mongoClient = await this.getClient();
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
    };

    getSessionData = async (sessionHandle: string): Promise<{ found: false } | { found: true; data: any }> => {
        let mongoClient = await this.getClient();
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
    };

    deleteSession = async (sessionHandle: string): Promise<number> => {
        let mongoClient = await this.getClient();
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
    };

    createNewSession = async (
        sessionHandle: string,
        userId: string | number,
        refreshTokenHash2: string,
        sessionData: any,
        expiresAt: number,
        jwtPayload: any
    ): Promise<void> => {
        let mongoClient = await this.getClient();
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
    };

    getSessionInfo = async (
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
    > => {
        let mongoClient = await this.getClient();
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
    };

    updateSessionInfo = async (
        sessionHandle: string,
        refreshTokenHash2: string,
        sessionData: any,
        expiresAt: number,
        lastUpdatedSign: string
    ): Promise<number> => {
        let mongoClient = await this.getClient();
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
    };

    getAllSessionHandlesForUser = async (userId: string | number): Promise<string[]> => {
        let mongoClient = await this.getClient();
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
    };

    deleteAllExpiredSessions = async (): Promise<void> => {
        let mongoClient = await this.getClient();
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
    };

    resetTables = async (): Promise<void> => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        let mongoClient = await this.getClient();
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
    };

    getNumberOfRowsInRefreshTokensTable = async (): Promise<number> => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        let mongoClient = await this.getClient();
        return runQueryOrThrowAuthError(async () => {
            const config = Config.get();
            let result = await mongoClient
                .db()
                .collection(config.mongo.collections.refreshTokens)
                .find({})
                .count();
            return Number(result);
        });
    };

    isSessionBlacklisted = async (sessionHandle: string): Promise<boolean> => {
        let mongoClient = await this.getClient();
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
    };

    createCollectionsIndexesIfNotExists = async (): Promise<void> => {
        if (!(await this.checkIfSigningKeyCollectionExists())) {
            await this.createSigningKeyCollection();
        }
        if (!(await this.checkIfRefreshTokensCollectionExists())) {
            await this.createRefreshTokenCollection();
        }
    };

    checkIfSigningKeyCollectionExists = async (): Promise<boolean> => {
        const config = Config.get();
        const collectionNames = await this.getCollectionNames();
        return collectionNames.includes(config.mongo.collections.signingKey);
    };

    checkIfRefreshTokensCollectionExists = async (): Promise<boolean> => {
        const config = Config.get();
        const collectionNames = await this.getCollectionNames();
        return collectionNames.includes(config.mongo.collections.refreshTokens);
    };
}

async function runQueryOrThrowAuthError<OutputType>(func: () => Promise<OutputType>) {
    try {
        return await func();
    } catch (err) {
        throw generateError(AuthError.GENERAL_ERROR, err);
    }
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
