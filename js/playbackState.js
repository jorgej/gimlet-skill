module.exports = function(track, msOffset) {
    this.track = track;
    this.msOffset = msOffset || 0;

    this.markFinished = function() {
        this.msOffset = Infinity;
    }

    this.isFinished = function() {
        return this.msOffset === Infinity;
    }
}
