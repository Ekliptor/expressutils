export default class MetaTag {
    protected tagName: string;
    protected properties: any;

    constructor(tagName, properties = {}) {
        this.tagName = tagName
        this.properties = properties
    }

    public getTagName() {
        return this.tagName
    }

    public getProperties() {
        return this.properties
    }
}