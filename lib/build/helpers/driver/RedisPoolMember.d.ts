import * as redis from 'redis';
export declare class RedisPoolMember {
    private isConnected;
    private client;
    private hasQuit;
    private releaseFunction;
    constructor(client: redis.RedisClient, releaseFunction: () => void);
    setIsConnected: (isConnected: boolean) => void;
    releaseConnection: () => void;
    quit: () => void;
    set: (key: string, value: string) => Promise<any>;
    get: (key: string) => Promise<any>;
    sendCommand: (command: string, ...args: string[]) => Promise<any>;
    incr: (key: string) => Promise<void>;
    watch: (key: string) => Promise<void>;
    private discard;
    exec: (multi: redis.Multi) => Promise<void>;
    getMulti: () => redis.Multi;
}
