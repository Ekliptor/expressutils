import MetaTag from "./MetaTag";
import * as xutils from "./utils";
import Responder from "./Responder";

export default class Meta {
    protected responder: Responder;
    protected path: string;
    protected query: any; // parsed request query parameters as key-value object
    protected origin: string;
    protected url: string;

    constructor(responder: Responder) {
        this.responder = responder
        let req = this.responder.getReq()
        this.path = req.path
        this.query = Object.assign({}, req.query) // query object
        this.origin = this.responder.getOrigin()
        this.url = this.responder.getUrl() // url string
    }

    public getMetaTags() {
        let tags = []
        if (this.query.ra) {
            delete this.query.ra
            let canonical = new MetaTag('canonical', {href: this.origin + this.path + this.getQueryStr()})
            tags.push(canonical)
        }
        return tags
    }

    public getQueryStr() {
        let str = ''
        let first = true
        for (let prop in this.query)
        {
            if (first)
                str += '?'
            else
                str += '&'
            str += prop + '=' + this.query[prop]
            first = false
        }
        return str
    }
}