import * as mongo from "mongodb";
import { TypeConfig } from "../../types";
import { Driver } from "../driverInterface";
export declare class NativeMongoDriver implements Driver {
    private client;
    private static processEventListentersSet;
    private givenByClient;
    constructor(client: mongo.MongoClient | null, config: TypeConfig);
    private getClient;
    close: () => Promise<void>;
    isConnected: () => boolean;
    getCollectionNames: () => Promise<string[]>;
    createSigningKeyCollection: () => Promise<void>;
    createRefreshTokenCollection: () => Promise<void>;
    getKeyValueFromKeyName: (keyName: string) => Promise<{
        keyValue: string;
        createdAtTime: number;
        lastUpdatedSign: string;
    } | undefined>;
    insertKeyValueForKeyName: (keyName: string, keyValue: string, createdAtTime: number) => Promise<boolean>;
    updateKeyValueForKeyName: (keyName: string, keyValue: string, createdAtTime: number, lastUpdatedSign: string) => Promise<number>;
    updateSessionData: (sessionHandle: string, sessionData: any) => Promise<number>;
    getSessionData: (sessionHandle: string) => Promise<{
        found: false;
    } | {
        found: true;
        data: any;
    }>;
    deleteSession: (sessionHandle: string) => Promise<number>;
    createNewSession: (sessionHandle: string, userId: string | number, refreshTokenHash2: string, sessionData: any, expiresAt: number, jwtPayload: any) => Promise<void>;
    getSessionInfo: (sessionHandle: string) => Promise<{
        userId: string | number;
        refreshTokenHash2: string;
        sessionData: any;
        expiresAt: number;
        jwtPayload: any;
        lastUpdatedSign: string;
    } | undefined>;
    updateSessionInfo: (sessionHandle: string, refreshTokenHash2: string, sessionData: any, expiresAt: number, lastUpdatedSign: string) => Promise<number>;
    getAllSessionHandlesForUser: (userId: string | number) => Promise<string[]>;
    deleteAllExpiredSessions: () => Promise<void>;
    resetTables: () => Promise<void>;
    getNumberOfRowsInRefreshTokensTable: () => Promise<number>;
    isSessionBlacklisted: (sessionHandle: string) => Promise<boolean>;
    createCollectionsIndexesIfNotExists: () => Promise<void>;
    checkIfSigningKeyCollectionExists: () => Promise<boolean>;
    checkIfRefreshTokensCollectionExists: () => Promise<boolean>;
}
