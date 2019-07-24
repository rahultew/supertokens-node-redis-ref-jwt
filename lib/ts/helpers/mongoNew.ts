import * as mongo from "mongodb";
import * as mongoose from "mongoose";

import Config from "../config";
import { AuthError, generateError } from "../error";
import { Driver } from "./driver/driverInterface";
import { MongooseDriver } from "./driver/mongoose";
import { NativeMongoDriver } from "./driver/native";
import { TypeConfig } from "./types";

export class MongoDriver {
    private static instance: undefined | MongoDriver;

    private driverName: "native" | "mongoose";
    private isUserDefined: boolean;

    private driver: Driver;

    private constructor(config: TypeConfig, client?: mongoose.Connection | mongo.MongoClient) {
        if (client !== undefined) {
            this.isUserDefined = true;
            if (typeof (client as mongo.MongoClient).isConnected === "function") {
                this.driver = new NativeMongoDriver(client as mongo.MongoClient, config);
                this.driverName = "native";
            } else {
                this.driver = new MongooseDriver(client as mongoose.Connection);
                this.driverName = "mongoose";
            }
        } else {
            this.isUserDefined = false;
            this.driverName = "native";
            this.driver = new NativeMongoDriver(null, config);
        }
    }

    static init = async (client?: mongo.MongoClient | mongoose.Connection) => {
        if (MongoDriver.instance === undefined) {
            try {
                const config = Config.get();
                MongoDriver.instance = new MongoDriver(config, client);
                await MongoDriver.instance.driver.createCollectionsIndexesIfNotExists();
            } catch (err) {
                MongoDriver.instance = undefined;
                throw generateError(AuthError.GENERAL_ERROR, err);
            }
        }
    };

    static getDriver = () => {
        if (MongoDriver.instance === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
        }
        return MongoDriver.instance.driver;
    };

    static getDriverName = (): "mongoose" | "native" => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (MongoDriver.instance === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
        }
        return MongoDriver.instance.driverName;
    };

    static getIsUserDefined = (): boolean => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (MongoDriver.instance === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
        }
        return MongoDriver.instance.isUserDefined;
    };

    static reset = async () => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (MongoDriver.instance !== undefined && MongoDriver.instance.driver.isConnected()) {
            await MongoDriver.instance.driver.close();
        }
        MongoDriver.instance = undefined;
    };
}
