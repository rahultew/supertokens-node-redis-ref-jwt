import * as mongo from "mongodb";
/**
 *
 * @param mongoClient
 */
export declare function getCollectionNames(mongoClient: mongo.MongoClient): Promise<string[]>;
export declare function createSigningKeyCollection(mongoClient: mongo.MongoClient): Promise<void>;
export declare function createRefreshTokenCollection(mongoClient: mongo.MongoClient): Promise<void>;
/**
 *
 * @param mongoClient
 * @param keyName
 */
export declare function getKeyValueFromKeyName(mongoClient: mongo.MongoClient, keyName: string): Promise<{
    keyValue: string;
    createdAtTime: number;
    lastUpdatedSign: string;
} | undefined>;
/**
 *
 * @returns true if insert successful, false if a key with that already exists.
 */
export declare function insertKeyValueForKeyName(mongoClient: mongo.MongoClient, keyName: string, keyValue: string, createdAtTime: number): Promise<boolean>;
/**
 *
 */
export declare function updateKeyValueForKeyName(mongoClient: mongo.MongoClient, keyName: string, keyValue: string, createdAtTime: number, lastUpdatedSign: string): Promise<number>;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param sessionData
 */
export declare function updateSessionData(mongoClient: mongo.MongoClient, sessionHandle: string, sessionData: any): Promise<any>;
export declare function getSessionData(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<{
    found: false;
} | {
    found: true;
    data: any;
}>;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
export declare function deleteSession(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<number>;
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
export declare function createNewSession(mongoClient: mongo.MongoClient, sessionHandle: string, userId: string | number, refreshTokenHash2: string, sessionData: any, expiresAt: number, jwtPayload: any): Promise<void>;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 */
export declare function getSessionInfo(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<{
    userId: string | number;
    refreshTokenHash2: string;
    sessionData: any;
    expiresAt: number;
    jwtPayload: any;
    lastUpdatedSign: string;
} | undefined>;
/**
 *
 * @param mongoClient
 * @param sessionHandle
 * @param refreshTokenHash2
 * @param sessionData
 * @param expiresAt
 * @param oldCreatedAtTime
 */
export declare function updateSessionInfo(mongoClient: mongo.MongoClient, sessionHandle: string, refreshTokenHash2: string, sessionData: any, expiresAt: number, lastUpdatedSign: string): Promise<number>;
/**
 *
 * @param mongoClient
 * @param userId
 */
export declare function getAllSessionHandlesForUser(mongoClient: mongo.MongoClient, userId: string | number): Promise<string[]>;
export declare function deleteAllExpiredSessions(mongoClient: mongo.MongoClient): Promise<void>;
export declare function resetTables(mongoClient: mongo.MongoClient): Promise<void>;
export declare function getNumberOfRowsInRefreshTokensTable(): Promise<number>;
export declare function isSessionBlacklisted(mongoClient: mongo.MongoClient, sessionHandle: string): Promise<boolean>;
