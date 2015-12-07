/*var projectId = 0;
var details = [];

console.log("get_details.js script is running");

var scripts = [].slice.apply(document.getElementsByTagName('script'));
script = scripts.map(function(element) {
  if (element.src.indexOf("//cdn.optimizely.com/js/") > -1 && element.src.indexOf("geo") == -1) {
    projectId = element.src.substring(element.src.lastIndexOf("/")+1, element.src.lastIndexOf("."));
    details['projectId'] = projectId;
  }
});

if (projectId != 0) {
  var details = [];
  details.push({projectId: projectId});
  chrome.extension.sendRequest(details);
}*/