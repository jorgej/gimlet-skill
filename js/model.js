function Model(rawAttrs) {
    this.underlyingAttributes = rawAttrs;

    this.get = function(key) {
        return this.underlyingAttributes[key];
    }

    this.set = function(key, val) {
        this.underlyingAttributes[key] = val;
    }

    this.del = function(key) {
        delete this.underlyingAttributes[key];
    }
}

module.exports = Model;
