if (!String.prototype.indexOfEnd) {
  String.prototype.indexOfEnd = function indexOfEnd(string) {
    const index = this.indexOf(string);
    return index === -1 ? index : index + string.length;
  };
}
