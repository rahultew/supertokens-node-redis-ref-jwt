"use strict";
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator["throw"](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
const error_1 = require("../error");
const mongoose_1 = require("./driver/mongoose");
const native_1 = require("./driver/native");
class MongoDriver {
    constructor(config, client) {
        if (client !== undefined) {
            this.isUserDefined = true;
            if (typeof client.isConnected === "function") {
                this.driver = new native_1.NativeMongoDriver(client, config);
                this.driverName = "native";
            } else {
                this.driver = new mongoose_1.MongooseDriver(client);
                this.driverName = "mongoose";
            }
        } else {
            this.isUserDefined = false;
            this.driverName = "native";
            this.driver = new native_1.NativeMongoDriver(null, config);
        }
    }
}
MongoDriver.init = client =>
    __awaiter(this, void 0, void 0, function*() {
        if (MongoDriver.instance === undefined) {
            try {
                const config = config_1.default.get();
                MongoDriver.instance = new MongoDriver(config, client);
                yield MongoDriver.instance.driver.createCollectionsIndexesIfNotExists();
            } catch (err) {
                MongoDriver.instance = undefined;
                throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, err);
            }
        }
    });
MongoDriver.getDriver = () => {
    if (MongoDriver.instance === undefined) {
        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
    }
    return MongoDriver.instance.driver;
};
MongoDriver.getDriverName = () => {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("call this function only during testing");
    }
    if (MongoDriver.instance === undefined) {
        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
    }
    return MongoDriver.instance.driverName;
};
MongoDriver.getIsUserDefined = () => {
    if (process.env.TEST_MODE !== "testing") {
        throw Error("call this function only during testing");
    }
    if (MongoDriver.instance === undefined) {
        throw error_1.generateError(error_1.AuthError.GENERAL_ERROR, new Error("mongo not initiated"));
    }
    return MongoDriver.instance.isUserDefined;
};
MongoDriver.reset = () =>
    __awaiter(this, void 0, void 0, function*() {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        if (MongoDriver.instance !== undefined && MongoDriver.instance.driver.isConnected()) {
            yield MongoDriver.instance.driver.close();
        }
        MongoDriver.instance = undefined;
    });
exports.MongoDriver = MongoDriver;
//# sourceMappingURL=mongoNew.js.map
