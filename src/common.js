module.exports.Singleton = class {
    _instance;

    constructor(object = undefined) {
        if (!this._instance) {
            this._instance = object || this;
        } else return this._instance;
    }
}