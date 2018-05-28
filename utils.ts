import * as escapeHtml from "escape-html";
import * as fs from "fs-extra";
import * as path from "path";
import * as apputils from "@ekliptor/apputils";
import {Request, Response, NextFunction} from "express";

let expressApp = null

/**
 * Set the express app object (once on startup)
 * @param app
 */
export function setApp(app) {
    expressApp = app
}

export function getApp() {
    return expressApp
}

/**
 * Render a sub-template and return a promise.
 * @param res The express res object
 * @param tplFile The name of the template file on disk
 * @param options Options with variables to render in the template.
 * @returns {Promise} the html
 */
export function render(res: Response, tplFile: string, options) {
    return new Promise<string>((resolve, reject) => {
        res.render(tplFile, options, (err, html) => {
            if (err)
                return reject(err)
            resolve(html)
        })
    })
}

/**
 * Render a sub-template without the context of a request (no locals from middlewares).
 * @param tplFile
 * @param options
 * @returns {Promise}
 */
export function renderView(tplFile: string, options) {
    return new Promise<string>((resolve, reject) => {
        expressApp.render(tplFile, options, (err, html) => {
            if (err)
                return reject(err)
            resolve(html)
        })
    })
}

/**
 * Renders a status message and returns a promise.
 * @param res The express res object
 * @param text The text to display.
 * @param options
 * tplFile = the template file. default: sub/misc
 * template = name of the template block to render (within tplFile)
 * msgClass = success|info|warning|danger (for bootstrap). default: danger
 * safeHtml {bool} Allow html input as text without escaping (default false)
 * @returns {Promise} the html
 */
export function getMessage(res: Response, text: string, options?): Promise<string> {
    if (!options)
        options = {}
    if (!options.timeout)
        options.timeout = 0;
    if (typeof options.tplFile !== 'string')
        options.tplFile = 'sub/misc'
    if (typeof options.template !== 'string')
        options.template = 'message'
    if (typeof options.msgClass !== 'string')
        options.msgClass = 'danger'
    options.text = options.safeHtml === true ? text : escapeHtml(text)
    return render(res, options.tplFile, options)
}

export function extendResponse(req: Request, res: Response, next: NextFunction, logger = null) {
    try { // might fail if we extend the response of our error stack handler
        // REQUEST


        // RESPONSE
        res.locals.title = req.t('siteName'); // default title. can be overwritten
        res.locals.getTitle = (title) => {
            return title + ' - ' + res.locals.title
        }
        if (req.user && req.user.data === undefined)
            req.user.data = {}
        res.locals.user = req.user // from passport
        res.locals.appData = {
            lang: req.language.substr(0, 2)
        }
        if (req.user) {
            res.locals.appData.username = req.user.username;
            res.locals.appData.level = req.user.level;
        }
        res.locals.langDir = 'ltr' // rtl, TODO global config for other lang codes?
        res.locals.messages = []

        /**
         * Adds a user message to be displayed.
         * Note that for this to work with sessions, you must call responder.render() instead of res.render()
         * @param message{String} the message html
         * @param session{bool} save it in session store for the next page load of html (use if the current req is an api call triggering a page load)
         */
        res.addMessage = function (message, session = true) {
            if (session) { // store it
                if (!req.session.messages)
                    req.session.messages = []
                req.session.messages.push(message)
            }
            else { // display it
                if (!res.locals.messages)
                    res.locals.messages = []
                res.locals.messages.push(message)
            }
        }

        res.sendJson = function (obj, jsonpCallback = '') {
            if (jsonpCallback !== '') {
                res.setHeader('Content-Type', 'application/javascript; charset=UTF-8')
                res.end(jsonpCallback + '(' + JSON.stringify(obj) + ');')
            }
            else { // strictly speaking UTF-8 is the only valid format for json, but let's be sure
                res.setHeader('Content-Type', 'application/json; charset=UTF-8')
                res.end(JSON.stringify(obj))
            }
        }
        res.sendJsonPostResponse = function (obj) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8') // for www-url-encoded form (and multipart?) always same
            res.end(JSON.stringify(obj))
        }
        res.setCacheHeaders = function (expiresMin, vary = '') {
            // TODO pass in req and set low value if logged in? (to avoid caching status html from header)
            // gmdate https://www.npmjs.com/package/phpdate-js
            // not really needed because Cache-Control max-age overrides Expires: https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
            // also: new Date(Date.now() + ms).toUTCString() returns the same GMT time for this case
            if (expiresMin == 0) {
                res.setHeader('Pragma', 'no-cache')
                res.setHeader('Cache-Control', 'no-cache, private, must-revalidate, max-stale=0, post-check=0, pre-check=0, no-store')
                //res.setHeader('Expires', 'gmdate now')
                if (vary !== '')
                    vary = ', ' + vary
                res.setHeader('Vary', 'Cookie' + vary)
                return
            }
            let expires = expiresMin * 60
            res.setHeader('Pragma', 'public')
            //res.setHeader('Cache-Control', 'must-revalidate, max-age=' + expires)
            res.setHeader('Cache-Control', 'public, max-age=' + expires)
            if (vary !== '') // Vary Accept-Encoding is present if compression is enabled. setHeader adds headers and doesn't override them
                res.setHeader('Vary', vary)
            //res.setHeader('Expires', 'gmdate now + expires')
        }
        // TODO add metatag middleware
    }
    catch (err) {
        if (logger) {
            logger.error('Error extending response')
            logger.error(err)
        }
    }
}

export function getLanguage(req: Request, defLang = '') {
    let lang = req.headers['accept-language']
    if (!lang)
        return defLang
    return (lang as string).substr(0, 2).toLowerCase()
}

export function getLocale(req: Request, defLocale = '') {
    let lang = req.headers['accept-language']
    if (!lang)
        return defLocale
    let langs = (lang as string).split(';')
    let locales = langs[0].split(',')
    return locales[0]
}

/* // use promise and express-context based utils.render() above
utils.renderToStr = function(filename, locals = null, jade = null) {
    if (jade === null) // TODO require global pug object after transition to pug and remove this code
        throw new Error('A jade object has currently to be provided to render templates to string')
    return jade.renderFile(filename, locals)
}
*/

export function getServerTimezoneStr(req: Request) {
    let date = new Date()
    let locale = 'en' // parse it from the same locale, although this will mean the name is always in english
    let timezone = date.toLocaleString(locale, {timeZoneName: 'long'}).replace(/.+(AM|PM) (.+)/, '$2')
    let timezoneShort = date.toLocaleString(locale, {timeZoneName: 'short'}).replace(/.+(AM|PM) (.+)/, '$2')
    return timezone + ' (' + timezoneShort  + ')'
}

export function loadClientViews(app, viewPath: string, callback?: (err: any, views: string[]) => void) {
    if (viewPath[viewPath.length - 1] !== path.sep)
        viewPath += path.sep
    /*
    fs.readdir(viewPath, (err, viewFiles) => {
        if (err)
            return callback && callback(err)
    })
    */
    //let viewFiles = fs.walkSync(viewPath) // throws error if path doesn't exist
    apputils.file.listDir(viewPath, (err, viewFiles) => {
        if (err)
            return callback && callback(err, null)

        let views = []
        viewFiles.forEach((viewFile) => {
            viewFile = path.join(viewPath, viewFile)
            if (viewFile.match('\.js$') !== null)
                //views.push(viewPath + viewFile) // path for browser, always /
                views.push(viewFile)
        })
        if (path.sep === '/')
            app.locals.viewFiles = views.map(view => view.replace(/^.+public\//, '/')) // relative paths for webbrowser
        else
            app.locals.viewFiles = views.map(view => view.replaceAll('\\', '/').replace(/^.+public\//, '/'))
        callback && callback(null, views)
    })
}

import Responder from "./Responder";
import Meta from "./Meta";
export {Responder, Meta}