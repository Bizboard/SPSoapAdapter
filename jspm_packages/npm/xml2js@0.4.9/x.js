/* */ 
var util = require("util");
var xml2js = require("./lib/xml2js");
var myxml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?> \
<Items> \
  <Item> \
    <id>1</id> \
    <color>green</color> \
  </Item> \
  <Item> \
    <id>2</id> \
    <color>red</color> \
  </Item> \
  <Item> \
    <id>3</id> \
    <color>yellow</color> \
  </Item> \
</Items>";
var myxml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\
<empty />";
xml2js.parseString(myxml, function(e, r) {
  console.log(util.inspect(r, false, null));
});
