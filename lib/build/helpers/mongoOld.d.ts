import * as mongo from "mongodb";
export declare class Mongo {
    private static instance;
    private client;
    private static processEventListentersSet;
    private givenByClient;
    private constructor();
    static init(client?: mongo.MongoClient): Promise<void>;
    static getClient(): Promise<mongo.MongoClient>;
    static reset: () => Promise<void>;
}
export declare function checkIfSigningKeyCollectionExists(): Promise<boolean>;
export declare function checkIfRefreshTokensCollectionExists(): Promise<boolean>;
