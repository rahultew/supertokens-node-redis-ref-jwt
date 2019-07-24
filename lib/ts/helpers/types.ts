export type TypeInputConfig = {
    mongo: {
        // host?: string;  [deprecated since v3.1.0]
        // port?: number; [deprecated since v3.1.0]
        // user: string; [deprecated since v3.1.0]
        // password: string; [deprecated since v3.1.0]
        // connectTimeout?: number; [deprecated since v3.1.0]
        // socketTimeout?: number; [deprecated since v3.1.0]
        // database: string; [deprecated since v3.1.0]
        url: string; // since v3.1.0
        collections?: {
            // since v1
            signingKey?: string; // since v1
            refreshTokens?: string; // since v1
        };
    };
    tokens: {
        // since v1
        accessToken?: {
            // since v1
            signingKey?: {
                // since v1
                dynamic?: boolean; // since v1
                updateInterval?: number; // since v1
                get?: TypeGetSigningKeyUserFunction; // since v1
            };
            validity?: number; // since v1
            blacklisting?: boolean; // since v1.0.1
            accessTokenPath?: string; // since v3.0.3
        };
        refreshToken: {
            validity?: number; // since v1
            removalCronjobInterval?: string; // since v1
            renewTokenPath: string; // since v1
        };
        enableAntiCsrf?: boolean; // since v3.0.1
    };
    logging?: {
        // since v1
        info?: (info: any) => void; // since v1
        error?: (err: any) => void; // since v1
    };
    cookie: {
        // since v1
        domain: string; // since v1
        secure?: boolean; // since v1
    };
};

export type TypeConfig = {
    mongo: {
        host: string; // [deprecated]
        port: number; // [deprecated]
        user: string; // [deprecated]
        password: string; // [deprecated]
        connectTimeout: number; // [deprecated]
        socketTimeout: number; // [deprecated]
        database: string; // [deprecated]
        url: string;
        collections: {
            signingKey: string;
            refreshTokens: string;
        };
    };
    tokens: {
        accessToken: {
            signingKey: {
                dynamic: boolean;
                updateInterval: number;
                get: TypeGetSigningKeyUserFunction | undefined;
            };
            validity: number;
            blacklisting: boolean;
            accessTokenPath: string;
        };
        refreshToken: {
            validity: number;
            removalCronjobInterval: string;
            renewTokenPath: string;
        };
        enableAntiCsrf: boolean;
    };
    logging: {
        info?: (info: any) => void;
        error?: (err: any) => void;
    };
    cookie: {
        domain: string;
        secure: boolean;
    };
};

export type TypeGetSigningKeyUserFunction = () => Promise<string>;

export type MongoQueryParamTypes = string | number | boolean | null | Date;

export type TypeAuthError = {
    errType: number;
    err: any;
};
