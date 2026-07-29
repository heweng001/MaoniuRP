let async11 =
  ".richtext.is-magic .flex-layout-h{flex:1;display:flex;flex-direction:row;flex-wrap:wrap;justify-content:space-between}.richtext.is-magic .flex-layout-v{flex:1;display:flex;flex-direction:column}";

const aliClassConvert = {
  convert(document) {
    let styleString = async11;
    let styleKeyValueArray = [];
    styleString.split("}").forEach((style) => {
      let item = {};
      item.key = style.substring(0, style.indexOf("{"));
      item.value = style.substring(style.indexOf("{") + 1);
      if (item.key && item.value) {
        styleKeyValueArray.push(item);
      }
    });
    styleKeyValueArray.forEach(({ key, value }) => {
      if (key.startsWith(".")) {
        try {
          document.querySelectorAll(key).forEach((node) => {
            let oldValue = node.getAttribute("style");
            if (oldValue) {
              value = oldValue + ";" + value;
            }
            node.setAttribute("style", value);
          });
        } catch (e) {
          //ignore selector error}
        }
      }
    });
  },
};

export default aliClassConvert;
