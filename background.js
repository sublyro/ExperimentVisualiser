var project_id = 0;
var enabled = true;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('[background] Got a message ' +request);

    request = JSON.parse(request);
    console.log(request);
    switch(request.type) {
	    case 'init':
	    	// check if we already have data for this domain
	        console.log("Running init");
	        project_id = request.projectId;
	        console.log("Setting project Id to " +project_id);

            if (enabled == true) {
                sendResponse({type: 'enableVisualiser'});

    	        ls = localStorage[request.projectId];
    	        if (ls === undefined) {
    	        	console.log("Not initialised for this domain yet");
    	        	// do nothing
    	        } else {
    	        	console.log("Starting viualisation: " +project_id);
    	    		visualise_results(project_id);
    	        }
            } else {
                sendResponse({type: 'disableVisualiser'});
                console.log("Visualiser is disabled");
            }
	        break;
	    case 'get_details':
	    	console.log("Returning details: " +project_id);
	    	sendResponse({type: 'start', projectId: project_id, enabled: enabled});
	    	break;
        case 'enable':
            console.log("Enabling Visualiser...");
            if (enabled == false) { enabled = true; }
            sendResponse({type: 'enableVisualiser'});
            break;
        case 'disable':
            console.log("Disabling Visualiser...");
            if (enabled == true) { enabled = false; }
            sendResponse({type: 'disableVisualiser'});
            break;
	    default:
	        console.log("Unknown message");
    } 
});


function sendMessage(message, callback) {
    console.log("[background] Sending message..... " + message);

    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, JSON.stringify(message), function (response) {
            console.log(response.farewell);
        });
    });
}



function visualise_results(project_id) {

    // TODO surely there is no need for duplicating the code below
    // move all the actual experimentExplorer things to background and only popup stuff in visualiser
    var views = chrome.extension.getViews({ type: "popup" });
    if (views.length > 0) {

        chrome.runtime.sendMessage({type: 'refresh', projectId: project_id, enabled: enabled}, function(b) {
            // 
        });
    } else {

        //sendMessage({type: 'start', projectId: project_id, enabled: enabled}, null);

    	tmp = JSON.parse(localStorage[project_id]);

    	token = tmp.token;
    	console.log(tmp);

        window.explorer = new ExperimentExplorer(token, project_id);  
        window.explorer.experiments = tmp.experiments;
        window.explorer.dataset = tmp.dataset;
        window.explorer.processingIndex = tmp.processingIndex;
        window.explorer.totalExperiments = tmp.totalExperiments;
        window.explorer.URL = "";
        chrome.tabs.getSelected(null, function (tab) {
        	window.explorer.URL = tab.url;
        });

        var i = setInterval(function () {
        	if (explorer.URL != "") {
        		console.log("URL is " +explorer.URL);
                clearInterval(i);
                $.each(window.explorer.experiments, function (key, ex) {
                    if (ex != null) {
                    	console.log(ex);
                        window.explorer.visualiseResults(ex.id);
                    }
                });
            }
         }, 50);
    }
}




ExperimentExplorer = function (token, projectId) {
    console.log("New ExperimentExplorer with " + token + " and " + projectId);
    this.projectId = projectId;
    this.token = token;
    this.experiments = new Object();
    this.totalExperiments = 0;
    this.dataset = 0;
    this.processingIndex = 0;
    this.URL = "";
    this.date = "";
    this.datasetSize = "";
}


ExperimentExplorer.prototype = {
    constructor: ExperimentExplorer,


    visualiseResults: function (experiment_id) {
        window.explorer.pushLog("visualiseResults " + experiment_id);
        var experiment = window.explorer.experiments[experiment_id];
        var tab_url = window.explorer.URL;
        var found_page = false;
        $.each(experiment.obj.url_conditions, function (key2, url_condition) {
            match = window.explorer.URLMatch(tab_url, url_condition.value, url_condition.match_type);
            if (match && url_condition.negate == false) {
                found_page = true;
                return false;
            }
        });
        if (found_page && experiment.selectors != null) {
            $("#active-experiments-lst").append("<li><input type=\"checkbox\" class=\"cb\" checked>" + window.explorer.buildExperimentResultLink(experiment) + "<li>");
            var color = "blue";
            if (experiment.uplift < 0) {
                color = "red";
            } else if (experiment.uplift > 0) {
                color = "green";
            }

            for (i = 0; i < experiment.selectors.length; i++) {
                tab_index = 0;
                window.explorer.highlightElements(experiment.id, window.explorer.experiments[experiment_id].selectors[i], color);
            }
        } else {
            $("#inactive-experiments-lst").append("<li>" + window.explorer.buildExperimentResultLink(experiment) + "<li>");
        }
    },

    buildExperimentResultLink: function (experiment) {
        if (experiment.uplift > 0) {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link green-link'>" + experiment.obj.description + " (" + experiment.uplift + "%)</a>";
        } else if (experiment.uplift < 0) {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link red-link'>" + experiment.obj.description + " (" + experiment.uplift + "%)</a>";
        } else {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link blue-link'>" + experiment.obj.description + "</a>";
        }
    },

    highlightElements: function (id, selector, color) {
        console.log("[background] Posting message[highlightElements]... " + selector);

		var msg = new Object();
		msg.type = 'highlight';
		msg.selector = selector;
		msg.color = color;
        msg.id = id;
		sendMessage(msg, null);
    },

    URLMatch: function (tab_url, experiment_url, match_type) {
        if (match_type == 'simple' && window.explorer.simpleMatch(tab_url, experiment_url)) {
            return true;
        } else if (match_type == 'substring' && window.explorer.substringMatch(tab_url, experiment_url)) {
            return true;
        } else if (match_type == 'exact' && window.explorer.exactMatch(tab_url, experiment_url)) {
            return true;
        } else if (match_type == 'regex' && window.explorer.regexMatch(tab_url, experiment_url)) {
            return true;
        }
        return false;
    },


    simpleMatch: function (url1, url2) {
        if (url1.lastIndexOf("/") == url1.length - 1) {
            url1 = url1.substring(0, url1.length - 1);
        }
        if (url2.lastIndexOf("/") == url2.length - 1) {
            url2 = url2.substring(0, url2.length - 1);
        }
        url1 = url1.replace("http://", "").replace("https://", "").replace("www.", "");
        url1 = url1.indexOf('?') > -1 ? url1.substring(0, url1.indexOf('?')) : url1;
        url2 = url2.replace("http://", "").replace("https://", "").replace("www.", "");
        url2 = url2.indexOf('?') > -1 ? url2.substring(0, url2.indexOf('?')) : url2;

        return url1 == url2;
    },
    exactMatch: function (url1, url2) {
        return url1 == url2;
    },
    substringMatch: function (url1, url2) {
        return url1.indexOf(url2) != -1;
    },
    regexMatch: function (url1, url2) {
        return url1.match(url2) !== null;
    },

    pushLog: function (txt, index) {

        if (index != undefined && index !== null) {
            console.log("[" + index + "] " + txt);
            $("#log").append("<div class='log-item'>[" + index + "] " + txt + "</div>");
        } else {
            console.log(txt);
            $("#log").append("<div class='log-item'>" + txt + "</div>");
        }
    },


}