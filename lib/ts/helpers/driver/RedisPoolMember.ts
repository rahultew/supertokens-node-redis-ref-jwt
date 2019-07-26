import * as redis from "redis";

import { toPromise } from "./utils";

export class RedisPoolMember {
    private isConnected: boolean;
    private client: redis.RedisClient;
    private hasQuit: boolean;
    private releaseFunction: () => void;

    constructor(client: redis.RedisClient, releaseFunction: () => void) {
        this.isConnected = true;
        this.client = client;
        this.hasQuit = false;
        this.releaseFunction = releaseFunction;
    }

    setIsConnected = (isConnected: boolean) => {
        this.isConnected = isConnected;
    };

    releaseConnection = () => {
        if (!this.isConnected) {
            return;
        }

        this.releaseFunction();
    };

    quit = () => {
        if (this.hasQuit) {
            return;
        }

        this.hasQuit = true;
        this.isConnected = false;
        this.client.quit();
    };

    set = async (key: string, value: string) => {
        try {
            if (this.isConnected) {
                return (await toPromise<string[]>(this.client.set.bind(this.client))(key, value))[0];
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            throw err;
        }
    };

    get = async (key: string) => {
        try {
            if (this.isConnected) {
                return (await toPromise<string[]>(this.client.get.bind(this.client))(key))[0];
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            throw err;
        }
    };

    sendCommand = async (command: string, ...args: string[]) => {
        try {
            if (this.isConnected) {
                return (await toPromise<string[]>(this.client.sendCommand.bind(this.client))(command, args))[0];
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            throw err;
        }
    };

    incr = async (key: string) => {
        try {
            if (this.isConnected) {
                await toPromise<string[]>(this.client.incr.bind(this.client)(key))[0];
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            throw err;
        }
    };

    watch = async (key: string) => {
        try {
            if (this.isConnected) {
                await toPromise<string[]>(this.client.watch.bind(this.client)(key))[0];
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            throw err;
        }
    };

    private discard = async () => {
        try {
            if (this.isConnected) {
                await toPromise<any[]>(this.client.discard.bind(this.client))();
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            // We ignore this error
        }
    };

    exec = async (multi: redis.Multi) => {
        try {
            if (this.isConnected) {
                await toPromise<any[]>(multi.exec.bind(multi))();
            } else {
                throw Error("Client not connected");
            }
        } catch (err) {
            await this.discard();
            throw err;
        }
    };

    getMulti = () => {
        return this.client.multi();
    };
}
