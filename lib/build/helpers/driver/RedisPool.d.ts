import * as redis from 'redis';
import { RedisPoolMember } from './RedisPoolMember';
export default class RedisPool {
    private static instance;
    private idleMemberSet;
    private busyMemberSet;
    private clientConfig;
    private static maxNumberOfClients;
    private static waitingList;
    private constructor();
    static getClient: (init?: boolean) => Promise<RedisPoolMember>;
    static shouldKeepClient: () => boolean;
    static getSetSizes: () => string;
    static init: (clientConfig?: redis.ClientOpts | undefined) => Promise<void>;
}
