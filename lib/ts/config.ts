import { AuthError, generateError } from "./error";
import { TypeConfig, TypeGetSigningKeyUserFunction, TypeInputConfig } from "./helpers/types";
import { sanitizeBooleanInput, sanitizeNumberInput, sanitizeStringInput } from "./helpers/utils";

/**
 * @class Config
 * @description this is a singleton class since we need just one Config for this node process.
 */
export default class Config {
    private static instance: undefined | Config;
    private config: TypeConfig;

    private constructor(config: TypeConfig) {
        this.config = config;
    }

    /**
     * @description called when library is being initialised
     * @throws AuthError GENERAL_ERROR
     */
    static init(config: TypeInputConfig) {
        if (Config.instance === undefined) {
            Config.instance = new Config(setDefaults(validateAndNormalise(config)));
        }
    }

    static get(): TypeConfig {
        if (Config.instance === undefined) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("configs not set. Please call the init function before using this library"),
                false
            );
        }
        return Config.instance.config;
    }

    static reset = () => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        Config.instance = undefined;
    };

    static isInitialised = () => {
        if (process.env.TEST_MODE !== "testing") {
            throw Error("call this function only during testing");
        }
        return Config.instance !== undefined;
    };
}

/**
 * @description checks for user input validity in terms of types and ranges
 * @throws AuthError GENERAL_ERROR
 */
const validateAndNormalise = (config: any): TypeInputConfig => {
    if (config === null || typeof config !== "object") {
        throw generateError(AuthError.GENERAL_ERROR, new Error("passed config is not an object"), false);
    }
    const mongoInputConfig = config.mongo;
    if (typeof mongoInputConfig !== "object") {
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error("mongo config not passed. mongo url is required"),
            false
        );
    }
    const url = sanitizeStringInput(mongoInputConfig.url);
    /**
     * following part is deprecated since v3.1.0
     */
    let extraParams = {};
    if (url === undefined) {
        const host = sanitizeStringInput(mongoInputConfig.host);
        const port = sanitizeNumberInput(mongoInputConfig.port);
        const user = sanitizeStringInput(mongoInputConfig.user);
        if (user === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo config error. url not passed"), false);
        }
        const password = sanitizeStringInput(mongoInputConfig.password);
        if (password === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo config error. url not passed"), false);
        }
        const connectionLimit = sanitizeNumberInput(mongoInputConfig.connectionLimit);
        const database = sanitizeStringInput(mongoInputConfig.database);
        if (database === undefined) {
            throw generateError(AuthError.GENERAL_ERROR, new Error("mongo config error. url not passed"), false);
        }
        extraParams = {
            host,
            port,
            user,
            password,
            database
        };
    }
    let collections:
        | {
              signingKey: string | undefined;
              refreshTokens: string | undefined;
          }
        | undefined;
    const collectionsMongoInputConfig = mongoInputConfig.collections;
    if (collectionsMongoInputConfig !== undefined) {
        const signingKey = sanitizeStringInput(collectionsMongoInputConfig.signingKey);
        const refreshTokens = sanitizeStringInput(collectionsMongoInputConfig.refreshTokens);
        collections = {
            signingKey,
            refreshTokens
        };
    }
    const mongo = {
        url,
        ...extraParams,
        collections
    };
    let tokensInputConfig = config.tokens;
    const accessTokenInputConfig = tokensInputConfig.accessToken;
    let accessToken:
        | {
              signingKey:
                  | {
                        dynamic: boolean | undefined;
                        updateInterval: number | undefined;
                        get: TypeGetSigningKeyUserFunction | undefined;
                    }
                  | undefined;
              validity: number | undefined;
              blacklisting: boolean | undefined;
              accessTokenPath: string | undefined;
          }
        | undefined;
    if (accessTokenInputConfig !== undefined) {
        const signingKeyInputConfig = accessTokenInputConfig.signingKey;
        let signingKey:
            | {
                  dynamic: boolean | undefined;
                  updateInterval: number | undefined;
                  get: TypeGetSigningKeyUserFunction | undefined;
              }
            | undefined;
        if (signingKeyInputConfig !== undefined) {
            const dynamic = sanitizeBooleanInput(signingKeyInputConfig.dynamic);
            let updateInterval = sanitizeNumberInput(signingKeyInputConfig.updateInterval);
            if (updateInterval !== undefined && process.env.TEST_MODE !== "testing") {
                if (updateInterval > defaultConfig.tokens.accessToken.signingKey.updateInterval.max) {
                    throw generateError(
                        AuthError.GENERAL_ERROR,
                        new Error(
                            "update interval passed for updating singingKey for access token is not within allowed interval. (Note: value passed will be in units of hours)"
                        ),
                        false
                    );
                } else if (updateInterval < defaultConfig.tokens.accessToken.signingKey.updateInterval.min) {
                    throw generateError(
                        AuthError.GENERAL_ERROR,
                        new Error(
                            "update interval passed for updating singingKey for access token is not within allowed interval. (Note: value passed will be in units of hours)"
                        ),
                        false
                    );
                }
            }
            const get = signingKeyInputConfig.get;
            if (get !== undefined && typeof get !== "function") {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error("config > tokens > accessToken > get must be a function"),
                    false
                );
            }
            signingKey = {
                dynamic,
                updateInterval,
                get
            };
        }
        let validity = sanitizeNumberInput(accessTokenInputConfig.validity);
        if (validity !== undefined && process.env.TEST_MODE !== "testing") {
            if (validity > defaultConfig.tokens.accessToken.validity.max) {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error(
                        "passed value for validity of access token is not within allowed interval. (Note: value passed will be in units of seconds)"
                    ),
                    false
                );
            } else if (validity < defaultConfig.tokens.accessToken.validity.min) {
                throw generateError(
                    AuthError.GENERAL_ERROR,
                    new Error(
                        "passed value for validity of access token is not within allowed interval. (Note: value passed will be in units of seconds)"
                    ),
                    false
                );
            }
        }
        let blacklisting = sanitizeBooleanInput(accessTokenInputConfig.blacklisting);
        let accessTokenPath = sanitizeStringInput(accessTokenInputConfig.accessTokenPath);
        accessToken = {
            signingKey,
            validity,
            blacklisting,
            accessTokenPath
        };
    }
    let enableAntiCsrf = sanitizeBooleanInput(tokensInputConfig.enableAntiCsrf);
    let refreshTokenInputConfig = tokensInputConfig.refreshToken;
    if (typeof refreshTokenInputConfig !== "object") {
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error("refreshToken config not passed. renewTokenPath is required"),
            false
        );
    }
    let validity = sanitizeNumberInput(refreshTokenInputConfig.validity);
    if (validity !== undefined && process.env.TEST_MODE !== "testing") {
        if (validity > defaultConfig.tokens.refreshToken.validity.max) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error(
                    "passed value for validity of refresh token is not within allowed interval. (Note: value passed will be in units of hours)"
                ),
                false
            );
        } else if (validity < defaultConfig.tokens.refreshToken.validity.min) {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error(
                    "passed value for validity of refresh token is not within allowed interval. (Note: value passed will be in units of hours)"
                ),
                false
            );
        }
    }
    const renewTokenPath = sanitizeStringInput(refreshTokenInputConfig.renewTokenPath);
    if (renewTokenPath === undefined) {
        throw generateError(AuthError.GENERAL_ERROR, new Error("renewTokenPath not passed"), false);
    }
    const removalCronjobInterval = sanitizeStringInput(refreshTokenInputConfig.removalCronjobInterval);
    if (removalCronjobInterval !== undefined && typeof removalCronjobInterval !== "string") {
        throw generateError(
            AuthError.GENERAL_ERROR,
            new Error("removalCronjobInterval does not have the correct type"),
            false
        );
    }
    const refreshToken = {
        renewTokenPath,
        removalCronjobInterval,
        validity
    };
    const tokens = {
        accessToken,
        refreshToken,
        enableAntiCsrf
    };
    let loggingInputConfig = config.logging;
    let logging;
    if (loggingInputConfig !== undefined) {
        let info = loggingInputConfig.info;
        let error = loggingInputConfig.error;
        if (info !== undefined && typeof info !== "function") {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("logging config error. info option passed must be a function"),
                false
            );
        }
        if (error !== undefined && typeof error !== "function") {
            throw generateError(
                AuthError.GENERAL_ERROR,
                new Error("logging config error. error option passed must be a function"),
                false
            );
        }
        logging = {
            info,
            error
        };
    }
    const cookieInputConfig = config.cookie;
    const domain = sanitizeStringInput(cookieInputConfig.domain);
    const secure = sanitizeBooleanInput(cookieInputConfig.secure);
    if (domain === undefined) {
        throw generateError(AuthError.GENERAL_ERROR, new Error("domain parameter for cookie not passed"), false);
    }
    const cookie = {
        domain,
        secure
    };
    return {
        mongo: mongo as any,
        tokens,
        cookie,
        logging
    };
};

const setDefaults = (config: TypeInputConfig): TypeConfig => {
    // TODO: change this style of a || b to a === undefined ? b : a
    return {
        mongo: {
            host: (config.mongo as any).host || defaultConfig.mongo.host, // as any is used for backward compatibility
            port: (config.mongo as any).port || defaultConfig.mongo.port, // as any is used for backward compatibility
            user: (config.mongo as any).user, // as any is used for backward compatibility
            password: (config.mongo as any).password, // as any is used for backward compatibility
            connectTimeout: (config.mongo as any).connectTimeout || defaultConfig.mongo.connectTimeout, // as any is used for backward compatibility
            socketTimeout: (config.mongo as any).socketTimeout || defaultConfig.mongo.socketTimeout, // as any is used for backward compatibility
            database: (config.mongo as any).database, // as any is used for backward compatibility
            url: config.mongo.url,
            collections:
                config.mongo.collections === undefined
                    ? defaultConfig.mongo.collections
                    : {
                          refreshTokens:
                              config.mongo.collections.refreshTokens || defaultConfig.mongo.collections.refreshTokens,
                          signingKey: config.mongo.collections.signingKey || defaultConfig.mongo.collections.signingKey
                      }
        },
        tokens: {
            accessToken:
                config.tokens.accessToken === undefined
                    ? {
                          signingKey: {
                              dynamic: defaultConfig.tokens.accessToken.signingKey.dynamic,
                              updateInterval:
                                  defaultConfig.tokens.accessToken.signingKey.updateInterval.default * 60 * 60 * 1000,
                              get: undefined
                          },
                          validity: defaultConfig.tokens.accessToken.validity.default * 1000,
                          blacklisting: defaultConfig.tokens.accessToken.blacklisting,
                          accessTokenPath: defaultConfig.tokens.accessToken.accessTokenPath
                      }
                    : {
                          signingKey:
                              config.tokens.accessToken.signingKey === undefined
                                  ? {
                                        dynamic: defaultConfig.tokens.accessToken.signingKey.dynamic,
                                        updateInterval:
                                            defaultConfig.tokens.accessToken.signingKey.updateInterval.default *
                                            60 *
                                            60 *
                                            1000,
                                        get: undefined
                                    }
                                  : {
                                        dynamic:
                                            config.tokens.accessToken.signingKey.dynamic === undefined
                                                ? defaultConfig.tokens.accessToken.signingKey.dynamic
                                                : config.tokens.accessToken.signingKey.dynamic,
                                        updateInterval:
                                            (config.tokens.accessToken.signingKey.updateInterval ||
                                                defaultConfig.tokens.accessToken.signingKey.updateInterval.default) *
                                            60 *
                                            60 *
                                            1000,
                                        get: config.tokens.accessToken.signingKey.get
                                    },
                          validity:
                              (config.tokens.accessToken.validity ||
                                  defaultConfig.tokens.accessToken.validity.default) * 1000,
                          blacklisting:
                              config.tokens.accessToken.blacklisting === undefined
                                  ? defaultConfig.tokens.accessToken.blacklisting
                                  : config.tokens.accessToken.blacklisting,
                          accessTokenPath:
                              config.tokens.accessToken.accessTokenPath === undefined
                                  ? defaultConfig.tokens.accessToken.accessTokenPath
                                  : config.tokens.accessToken.accessTokenPath
                      },
            refreshToken: {
                validity:
                    (config.tokens.refreshToken.validity || defaultConfig.tokens.refreshToken.validity.default) *
                    60 *
                    60 *
                    1000,
                removalCronjobInterval:
                    config.tokens.refreshToken.removalCronjobInterval === undefined
                        ? defaultConfig.tokens.refreshToken.removalCronjobInterval
                        : config.tokens.refreshToken.removalCronjobInterval,
                renewTokenPath: config.tokens.refreshToken.renewTokenPath
            },
            enableAntiCsrf:
                config.tokens.enableAntiCsrf === undefined
                    ? defaultConfig.tokens.enableAntiCsrf
                    : config.tokens.enableAntiCsrf
        },
        cookie: {
            secure: config.cookie.secure === undefined ? defaultConfig.cookie.secure : config.cookie.secure,
            domain: config.cookie.domain
        },
        logging: {
            info: config.logging !== undefined ? config.logging.info : undefined,
            error: config.logging !== undefined ? config.logging.error : undefined
        }
    };
};

const defaultConfig = {
    mongo: {
        host: "localhost",
        port: 27017,
        connectTimeout: 20000,
        socketTimeout: 20000,
        collections: {
            signingKey: "signing_key",
            refreshTokens: "refresh_token"
        }
    },
    tokens: {
        accessToken: {
            signingKey: {
                dynamic: true,
                updateInterval: {
                    // in hours.
                    min: 1,
                    max: 720,
                    default: 24
                }
            },
            validity: {
                // in seconds
                min: 10,
                max: 1000 * 24 * 3600,
                default: 3600
            },
            blacklisting: false,
            accessTokenPath: "/"
        },
        enableAntiCsrf: true,
        refreshToken: {
            validity: {
                // in hours.
                min: 1,
                max: 365 * 24,
                default: 100 * 24
            },
            removalCronjobInterval: "0 0 0 1-31/7 * *" // every 7th day of a month starting from the 1st until the 31st
        }
    },
    cookie: {
        secure: true
    }
};
