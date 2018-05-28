declare module Express {
    export interface Application {
        // TODO https://github.com/Microsoft/TypeScript/issues/5506 and https://github.com/Microsoft/TypeScript/issues/5506
        // we have to create real subclasses as a module to use imported types
        //import {Server} from "net";

        rootDir: string;
        httpServer: any;
        i18next: any;
        sessionStore: any;
        cookieParser: any;

        dirCleaner: any;
    }

    export interface Request {
        countryCode: string;
        session: Session;
        user: any;
        t(key: string, options?: any): string | any | Array<any>; // from  i18next .d.ts, originally with TranslationOptions
        language: string; // from i18nexts
        cf_ip: string; // from cloudflare-expres
        isAuthenticated(): boolean; // from passport
    }

    export interface Response {
        addMessage(message: string, session?: boolean): void;
        sendJson(obj: any, jsonpCallback?: string): void;
        sendJsonPostResponse(obj: any): void;
        setCacheHeaders(expiresMin: number, vary?: string): void;
    }

    export interface Session {
        confirmedCookies: boolean;
        messages: string[];
        lastLoginStateChange: number;
    }
}

interface Error {
    status?: number;
}