import { Driver } from "./driver/driverInterface";
export declare class MongoDriver {
    private static instance;
    private driverName;
    private isUserDefined;
    private driver;
    private constructor();
    static init: (client?: any) => Promise<void>;
    static getDriver: () => Driver;
    static getDriverName: () => "native" | "mongoose";
    static getIsUserDefined: () => boolean;
    static reset: () => Promise<void>;
}
