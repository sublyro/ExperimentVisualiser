chrome.extension.onRequest.addListener(function (details) {

	$("#app-form-no-optimizely").hide();
	$("#app-form").show();

    setEventListeners();

    $("#account-id").val(details[0].projectId);

    $("#visualise-results").hide();
    if ((localStorage[$("#account-id").val()]) !== undefined) {
    	// we already have results for this site
        $("#visualise-results").show();

        tmp = JSON.parse(localStorage[$("#account-id").val()]);

        var date = new Date(tmp.date);
        var month = date.getUTCMonth() + 1; //months from 1-12
        var day = date.getUTCDate();
        var year = date.getUTCFullYear();
        var seconds = date.getSeconds();
        var minutes = date.getMinutes();
        var hours = date.getHours();


        newdate = day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;

        $("#dataset").val(tmp.datasetSize);

        window.explorer = new ExperimentExplorer($("#token").val(), $("#account-id").val());
        tmp = JSON.parse(localStorage[$("#account-id").val()]);
        window.explorer.experiments = tmp.experiments;
        window.explorer.dataset = tmp.dataset;
        window.explorer.processingIndex = tmp.processingIndex;
        window.explorer.totalExperiments = tmp.totalExperiments;
        explorer.URL = "";
        chrome.tabs.getSelected(null, function (tab) {
            explorer.URL = tab.url;
        });

        var i = setInterval(function () {
            if (explorer.URL != "") {
                clearInterval(i);

                window.explorer.clean();
                $.each(window.explorer.experiments, function (key, ex) {
                    if (ex != null) {
                        window.explorer.visualiseResults(ex.id);
                    }
                });
            }
        }, 50);

        $("<div id='last-updated'>Data last updated " + newdate + "</div>Data last refreshed on ").insertBefore("#start");

    }

    $("#start").click(function () {
        //$(".in-form").hide();
        init();
        chrome.tabs.getSelected(null, function (tab) {
            explorer.URL = tab.url;
        });
        explorer.fetchExperiments();

    });
});

document.addEventListener('DOMContentLoaded', function () {

	$("#app-form").hide();
    chrome.windows.getCurrent(function (currentWindow) {
        chrome.tabs.query({
            active: true,
            windowId: currentWindow.id
        }, function (activeTabs) {
            chrome.tabs.executeScript(
            activeTabs[0].id, {
                file: 'get_details.js',
                allFrames: true
            });
        });
    });
});


function setEventListeners() {
    $("body").delegate(".sidebar-element .accordion__link", "click", function () {
        if ($(this).parent().hasClass('closed')) {
            $(this).parent().removeClass('closed');
        } else {
            $(this).parent().addClass('closed');
        }
    });

    $("body").delegate(".experiment-link", "click", function () {
        $("#experiment-details").removeClass("closed");
        $("#experiment-details").css({
            'display': 'block',
            'visibility': 'visible'
        });
        experiment = window.explorer.experiments[$(this).attr('id')];
        $("#e_id span").html(experiment.id);
        $("#e_url span").html("<a href=\"#\" class=\"iframe-url-link\">" + experiment.obj.edit_url + "</a>");
        $("#e_desc span").html(experiment.obj.description);
        $("#res-link").attr("href", "https://app.optimizely.com/results2?experiment_id=" + experiment.id);
        $("#editor-link").attr("href", "https://app.optimizely.com/edit?experiment_id=" + experiment.id);
        //("#e_code").html(experiment.code);
        return false;
    });

    $("body").delegate(".experiment-link", "mouseover", function () {
        explorer.fillBox("." + $(this).attr('id'));
    });

    $("body").delegate(".experiment-link", "mouseout", function () {
        explorer.emptyBox("." + $(this).attr('id'));
    });

    $("body").delegate(".cb", "click", function (index) {
        if ($(this).is(":checked")) {
            explorer.showHighlight("." + $(this).parent().find("a").attr("id"));
        } else {
            explorer.hideHighlight("." + $(this).parent().find("a").attr("id"));
        }
    });

    $("body").delegate("#e_url", "click", function () {
        var url = $("#e_url a").html();
        if (url !== 'undefined' && url != '') {
            window.explorer.changeURL(url);
            // TODO
            /* 
			chrome.tabs.query({'active': true}, function(tabs) {
			  chrome.tabs.update(tabs[0].id, {url: 'http://www.yahoo.fr'});
			});
			*/
        }
        window.explorer.clean();
        return false;
    });

    $("body").delegate("#visualise-results", "click", function () {
        //$(".in-form").hide();
        window.explorer = new ExperimentExplorer($("#token").val(), $("#account-id").val());
        tmp = JSON.parse(localStorage[$("#account-id").val()]);
        window.explorer.experiments = tmp.experiments;
        window.explorer.dataset = tmp.dataset;
        window.explorer.processingIndex = tmp.processingIndex;
        window.explorer.totalExperiments = tmp.totalExperiments;
        explorer.URL = "";
        chrome.tabs.getSelected(null, function (tab) {
            explorer.URL = tab.url;
        });

        var i = setInterval(function () {
            if (explorer.URL != "") {
                clearInterval(i);

                window.explorer.clean();
                $.each(window.explorer.experiments, function (key, ex) {
                    if (ex != null) {
                        window.explorer.visualiseResults(ex.id);
                    }
                });
            }
        }, 50);
    });

}


Experiment = function (experiment) {
    this.obj = experiment;
    this.id = experiment.id;
    this.primaryGoal = experiment.primary_goal_id;
    this.uplift = 0;
    this.selectors = [];
    this.code = "";
    this.index = 0;
    this.code = 0;
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


function init() {
    console.log("Initialising Experiment Explorer for account " + $("#account-id").val() + " with token " + $("#token").val());
    window.explorer = new ExperimentExplorer($("#token").val(), $("#account-id").val());

    // clean
    explorer.clean();
}




ExperimentExplorer.prototype = {
    constructor: ExperimentExplorer,

    clean: function () {
        explorer.removeAllHighlights();
        $("#active-experiments-lst li").remove();
        $("#inactive-experiments-lst li").remove();
        $(".log-item").remove();
        $("#last-updated").remove();
    },

    call: function (type, endpoint, data, success_callback, error_callback, param) {
        window.explorer.processingIndex += 1;
        window.explorer.updatePendingRequestsCount();
        var self = this;

        var options = {
            url: "https://www.optimizelyapis.com/experiment/v1/" + endpoint,
            type: type,
            headers: {
                "Token": this.token
            },
            contentType: 'application/json',
            success: function (response) {
                window.explorer.processingIndex -= 1;
                window.explorer.updatePendingRequestsCount();
                success_callback(response, param);
            },
            error: function (jqXhr, textStatus) {
                window.explorer.processingIndex -= 1;
                window.explorer.updatePendingRequestsCount();
                error_callback(param, jqXhr);
            }
        }

        if (data) {
            options.data = JSON.stringify(data);
            options.dataType = 'json';
        }

        //this.outstandingRequests += 1;
        $.ajax(options);

    },

    get: function (endpoint, success_callback, error_callback, param) {
        this.call('GET', endpoint, "", success_callback, error_callback, param);
    },


    fetchExperiments: function () {
        window.explorer.get("projects/" + window.explorer.projectId + "/experiments", window.explorer.postProcessExperiment, null, null);
        window.explorer.date = new Date();
    },

    updatePendingRequestsCount: function () {
        $("#pending-requests div:eq(0)").html(window.explorer.processingIndex);
        if (window.explorer.processingIndex == 0) {
            localStorage[window.explorer.projectId] = JSON.stringify(window.explorer);
            $("#visualise-results").show();
        }
    },

    postProcessResultsError: function (res, jqXhr) {
        if (jqXhr.status == 429) {
            console.log("TOO MANY REQUEST... RETRYING");
            console.log(res);
            console.log(jqXhr);
            window.explorer.get("experiments/" + res + "/stats", window.explorer.postProcessResults, window.explorer.postProcessResultsError, res);
        } else if (jqXhr.status == 400 && jqXhr.responseText.indexOf('before January 21') > -1) {
            // fetch the old results
            window.explorer.get("experiments/" + res + "/results", window.explorer.postProcessResults, window.explorer.postProcessResultsError, res);
        } else {
            console.log("ERROR " + res);
            console.log(res);
            console.log(jqXhr);
            console.log('removing experiment ' + res + ' from array');
            window.explorer.experiments[res] = null;
        }
    },

    postProcessExperiment: function (res) {
        window.explorer.pushLog("This project has " + res.length + " experiments");
        window.explorer.totalExperiments = res.length;
        index = 0;
        var cutoff_date = new Date();
        window.explorer.datasetSize = $("#dataset").val();
        if ($("#dataset").val() == "10d") {
            cutoff_date.setDate(cutoff_date.getDate() - 10);
        } else if ($("#dataset").val() == "1m") {
            cutoff_date.setMonth(cutoff_date.getMonth() - 1);
        } else if ($("#dataset").val() == "3m") {
            cutoff_date.setMonth(cutoff_date.getMonth() - 3);
        } else if ($("#dataset").val() == "6m") {
            cutoff_date.setMonth(cutoff_date.getMonth() - 6);
        } else {
            cutoff_date.setDate(cutoff_date.getDate() - 365);
        }

        thisIndex = 0;
        $.each(res, function (key, experiment) {
            var d = new Date(experiment.last_modified);
            if (d >= cutoff_date && experiment.status != "Not started") {
                window.explorer.dataset++;
                window.explorer.experiments[experiment.id] = new Experiment(experiment);
                thisIndex++;
                window.explorer.pushLog("Fetching experiment results for " + experiment.id, thisIndex);
                window.explorer.experiments[experiment.id].index = thisIndex;
                window.explorer.get("experiments/" + experiment.id + "/stats", window.explorer.postProcessResults, window.explorer.postProcessResultsError, experiment.id);

            } else {
                //window.explorer.pushLog("Not in the dataset " +experiment.id);
            }
        });
        window.explorer.pushLog("Number of experiments in dataset: " + window.explorer.dataset);
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

    postProcessResults: function (results, experiment_id) {
        experiment = window.explorer.experiments[experiment_id];
        window.explorer.pushLog("Processing results for " + experiment_id, experiment.index);
        if (results.length > 0) {

            var uplift = 0;
            var winning_variation = 0;
            if (experiment !== null) {
                $.each(results, function (key, result) {
                    //console.log(result);
                    if ((experiment.primaryGoal !== null && experiment.primaryGoal == result.goal_id) || (experiment.primaryGoal === null && result.goal_name == 'Engagement')) {
                        //console.log(experiment_id +" Found primary goal " +result.improvement +" " +result.status);
                        if (result.status == "winner" && result.improvement > uplift) {
                            uplift = result.improvement;
                            winning_variation = result.variation_id;
                        } else if (result.status == "loser" && result.improvement < uplift) {
                            uplift = result.improvement;
                            winning_variation = result.variation_id;
                        } else if (winning_variation === 0 && result.status != 'baseline') {
                            winning_variation = result.variation_id;
                        }
                    }
                });

                uplift = Math.round(uplift * 100 * 10) / 10;
                window.explorer.pushLog("Final improvement for " + experiment_id + " is " + uplift + " for variation " + winning_variation, experiment.index);
                window.explorer.experiments[experiment_id].uplift = uplift;

                // fetch the variation code to extract selectors
                if (winning_variation !== 0) {
                    window.explorer.get("variations/" + winning_variation, window.explorer.postProcessVariation, uplift);
                }
            }
        } else {
            window.explorer.pushLog("No results found for " + experiment_id, experiment.index);
            window.explorer.experiments[experiment_id] = null;
        }
    },

    postProcessVariation: function (variation, uplift) {
        experiment = window.explorer.experiments[variation.experiment_id];
        window.explorer.pushLog("Process variation " + variation.id + " results for " + variation.experiment_id, experiment.index);
        if (variation.js_component != "") {
            experiment.code = variation.js_component;
            var selectors = variation.js_component.match(/\$\(["'][^"']*["']\)/g);
            if (selectors != null) {
                $.each(selectors, function (key, s) {
                    s = s.substring(3, s.length - 2);
                    var add = true;
                    for (i = 0; i < window.explorer.experiments[variation.experiment_id].selectors.length; i++) {
                        if (window.explorer.experiments[variation.experiment_id].selectors[i] == s) {
                            add = false;
                        }
                    }
                    if (add == true) {
                        window.explorer.pushLog("Found selector " + s + " for variation " + variation.id, experiment.index);
                        window.explorer.experiments[variation.experiment_id].selectors.push(s);
                    }
                });
            } else {
                window.explorer.pushLog("Found no selector for variation " + variation.id, experiment.index);
            }
        } else {
            window.explorer.pushLog("Found no variation code for variation " + variation.id, experiment.index);
        }
        window.explorer.visualiseResults(variation.experiment_id);
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
        console.log("posting message[highlightElements]... " + selector);
        var code = "e = $('" + selector + "');if (e !== 'undefined' && e.position() !== undefined && e.length > 0 && e.is(':visible')) { $.each(e, function (ek, ev) { if ($(this).context.localName != 'html') { if ($(this).next('.optlyMarkup').length == 0) { $('<div class=\"optlyMarkup " + id + "\"><p class=\"uplift\" style=\"visibility:hidden\">" + id + "</p></div>').insertAfter($(this)) .css({ 'visibility': 'visible', 'color': 'red', 'border-color': '" + color + "', 'border-width': '3px', 'border-style': 'solid', 'z-index': '9999', 'width': $(this).width() + 10, 'height': $(this).height() + 10, 'top': ($(this).position().top - 5) + 'px', 'left': ($(this).position().left - 5) + 'px', 'position': 'absolute' }); } else { $(this).next('.optlyMarkup').append('<p class=\"uplift\" style=\"visibility:hidden\">" + id + "</p>'); $(this).next('.optlyMarkup').addClass(" + id + "); } } else { console.log('Cannot add element on top level html element'); } }); }";
        console.log(code);


        chrome.tabs.executeScript(null, {
            file: "jQuery.js"
        }, function () {
            chrome.tabs.executeScript(null, {
                code: code
            });
        });
    },

    /*highlightElementsInIframe: function(id, selector, color) {
    	console.log("posting message[highlightElementsInIframe]... " +selector); 
    	var msg = "highlight&" +selector + "&" +id +"&" +color;
    	$.postMessage(msg, window.explorer.iframeURL, $('#embedded-site-0').get(0).contentWindow); 
    },*/

    changeURL: function (url) {
        console.log("posting message[changeURL]... ");
        var code = "window.location='" + url + "';";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    removeAllHighlights: function () {
        console.log("posting message[removeAllHighlights]... ");
        var code = "$('.optlyMarkup').remove();";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    fillBox: function (selector) {
        console.log("posting message[fillBox]... " + selector);
        var code = "$('" + selector + "').css({'background-color':$('" + selector + "').css('border-color'),'z-index':'999999'});";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    emptyBox: function (selector) {
        console.log("posting message[emptyBox]... " + selector);
        var code = "$('" + selector + "').css({'background-color':'','z-index':'9999'});";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    showHighlight: function (selector) {
        console.log("posting message[showHighlight]... " + selector);
        var code = "$('" + selector + "').show();";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    hideHighlight: function (selector) {
        console.log("posting message[showHighlight]... " + selector);
        var code = "$('" + selector + "').hide();";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    visualiseResults: function (experiment_id) {
        console.log("visualiseResults " + experiment_id);
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

        /*if (window.explorer.processingIndex == 0) {
            $("#visualise-results").css({
                'display': 'block',
                'visibility': 'visible'
            });
            $("#pending-requests label").remove();
        }*/
    },

    /*processIncomingMessage: function() {
		$.receiveMessage(
			function(e){
				var msg = e.data.split("&");
				if (msg[0] == 'url') {
					window.explorer.setIFrameURL(msg[1]);
				}
			}
		);
    },*/

}