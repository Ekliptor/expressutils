import * as path from "path";
import * as xutils from "./utils";
import Meta from "./Meta"
import {Request, Response, NextFunction} from "express";
import * as fs from "fs";

const viewDirs = [path.join(__dirname, 'views') + path.sep,
    path.join(__dirname, '..', 'views') + path.sep] // if we are inside /build dir
const VIEWS_DIR = fs.existsSync(viewDirs[0]) ? viewDirs[0] : viewDirs[1]

export default class Responder {
    protected req: Request;
    protected res: Response;
    protected next: NextFunction;
    protected className: string;
    protected tempDir?: string;

    constructor(req: Request, res: Response, next: NextFunction) {
        this.req = req;
        this.res = res;
        this.next = next;
        this.className = this.constructor.name;
    }

    public getReq() {
        return this.req;
    }

    public getRes() {
        return this.res;
    }

    public getNext() {
        return this.next;
    }

    public getOrigin() {
        // no port = always use the default protocol-port which is correct because we use it behind a local proxy in production
        let port = xutils.getApp().get('env') !== 'production' ? ':' + xutils.getApp().get('port') : ''
        return this.req.protocol + '://' + this.req.hostname + port
    }

    public getProtocol() {
        return this.req.protocol + ":" // just like url.parse()
    }

    public getHostname() {
        return this.req.hostname
    }

    public getPort() {
        return xutils.getApp().get('env') !== 'production' ? ':' + xutils.getApp().get('port') : ''
    }

    public getUrl() {
        return this.getOrigin() + this.req.originalUrl
    }

    public getClientIps() : string[] {
        let ips = []
        if (this.req.cf_ip) // cloudflare-express module
            ips = [this.req.cf_ip]
        else if (this.req.ips && this.req.ips.length !== 0)
            ips = this.req.ips // express specific solution for trusted proxy
        else if (this.req.ip)
            ips = [this.req.ip] // express specific solution without proxy
        else { // default node-js http server
            if (this.req.headers['x-forwarded-for'])
                ips = (this.req.headers['x-forwarded-for'] as string).split(",").map(ip => ip.trim())
            // the client ip or the ip of the last proxy in front of our app
            // unlike for express above we always add this, because we have no whitelist to know if we can trust the proxy
            // https://expressjs.com/en/guide/behind-proxies.html
            if (ips.length === 0 || (this.req.connection.remoteAddress !== '127.0.0.1' && this.req.connection.remoteAddress !== '::1'))
                ips.push(this.req.connection.remoteAddress)
        }
        return ips
    }

    public getClientIp(): string {
        let ips = this.getClientIps();
        return ips.shift();
    }

    /**
     * Render a page. Same parameters as res.render().
     * This function has to be called on every page that wants to display queued messages
     * @param name
     * @param options
     * @param callback
     * @returns {*|Promise}
     */
    public render(name: string, options, callback?: (err: Error, html: string) => void) {
        if (this.req.session.messages) { // load messages from last request (to display them now)
            this.res.locals.messages = this.req.session.messages
            delete this.req.session.messages
        }
        return this.res.render(name, options, callback)
    }

    /**
     * Helper function to read from $.serialize() and $.serializeArray()
     * note: just like with regular browser post unchecked checkboxes are not present (jquery mimics browser submits)
     * @param values
     * @param name
     */
    public readSubmitValue(valuesArr: any[], name) {
        for (let i = 0; i < valuesArr.length; i++)
        {
            if (valuesArr[i].name === name)
                return valuesArr[i].value;
        }
        return null;
    }

    public updateSubmitValue(valuesArr: any[], name, value) {
        for (let i = 0; i < valuesArr.length; i++)
        {
            if (valuesArr[i].name === name) {
                valuesArr[i] = Object.assign({}, valuesArr[i]); // always copy it to avoid modifying a global config object
                valuesArr[i].value = value;
                return;
            }
        }
    }

    public selectValue(valuesArr: any[], value) {
        for (let i = 0; i < valuesArr.length; i++)
        {
            if (valuesArr[i].value === value) {
                valuesArr[i] = Object.assign({}, valuesArr[i]); // always copy it to avoid modifying a global config object
                valuesArr[i].selected = true;
                return true;
            }
        }
        return false;
    }

    protected getClassName() {
        return this.className;
    }

    protected getMetaHtml() {
        return new Promise<string>((resolve, reject) => {
            let meta = new Meta(this)
            let tags = meta.getMetaTags()
            let tagOps = []
            tags.forEach((tag) => {
                tagOps.push(new Promise((resolve, reject) => {
                    let locals = {
                        tag: tag.getTagName(),
                        props : tag.getProperties()
                    }
                    xutils.render(this.res, VIEWS_DIR + 'meta', locals).then((html) => {
                        resolve(html)
                    })
                }))
            })
            Promise.all(tagOps).then((htmlArr) => {
                resolve(htmlArr.join('\n'))
            }).catch((err) => {
                console.log('Error getting meta html', err)
                resolve('') // render site without them
            })
        })
    }

    protected canAccess(level: number) {
        if (!this.req.isAuthenticated() || this.req.user.level > level) {
            let resError = new Error(this.req.t('forbidden'));
            resError.status = 403;
            this.next(resError);
            return false;
        }
        return true;
    }
}