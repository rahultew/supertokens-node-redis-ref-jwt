import * as mongo from "mongodb";

import Config from "../config";
import { AuthError, generateError } from "../error";
import { createRefreshTokenCollection, createSigningKeyCollection, getCollectionNames } from "./dbQueriesOld";
import { TypeConfig } from "./types";

export class Mongo {
    private static instance: undefined | Mongo;
    private client: mongo.MongoClient;
    private static processEventListentersSet: boolean = false;
    private givenByClient = false;

    private constructor(config: TypeConfig, client?: mongo.MongoClient) {
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
                Mongo.processEventListentersSet = true;
            }
        }
    }

    static async init(client?: mongo.MongoClient) {
        if (Mongo.instance === undefined) {
            try {
                const config = Config.get();
                Mongo.instance = new Mongo(config, client);
                await createCollectionsIndexesIfNotExists();
            } catch (err) {
                Mongo.instance = undefined;
                throw generateError(AuthError.GENERAL_ERROR, err);
            }
        }
    }

    static getClient(): Promise<mongo.MongoClient> {
        return new Promise<mongo.MongoClient>((resolve, reject) => {
            if (Mongo.instance === undefined) {
                reject(generateError(AuthError.GENERAL_ERROR, new Error("mongo not initiated")));
                return;
            }
            if (Mongo.instance.givenByClient) {
                if (Mongo.instance.client.isConnected()) {
                    resolve(Mongo.instance.client);
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
                            reject(generateError(AuthError.GENERAL_ERROR, err));
                        });
                }
            }
        });
    }

    static reset = async () => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (Mongo.instance !== undefined && Mongo.instance.client.isConnected()) {
            await Mongo.instance.client.close();
        }
        Mongo.instance = undefined;
    };
}

async function createCollectionsIndexesIfNotExists() {
    const config = Config.get();
    const mongoClient = await Mongo.getClient();
    if (!(await checkIfSigningKeyCollectionExists())) {
        await createSigningKeyCollection(mongoClient);
    }
    if (!(await checkIfRefreshTokensCollectionExists())) {
        await createRefreshTokenCollection(mongoClient);
    }
}

export async function checkIfSigningKeyCollectionExists(): Promise<boolean> {
    const config = Config.get();
    const mongoClient = await Mongo.getClient();
    const collectionNames = await getCollectionNames(mongoClient);
    return collectionNames.includes(config.mongo.collections.signingKey);
}

export async function checkIfRefreshTokensCollectionExists(): Promise<boolean> {
    const config = Config.get();
    const mongoClient = await Mongo.getClient();
    const collectionNames = await getCollectionNames(mongoClient);
    return collectionNames.includes(config.mongo.collections.refreshTokens);
}
