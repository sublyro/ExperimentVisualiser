chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('[visualiser] Got a message ' +request);
    switch(request.type) {
        case 'process_details':
            process_details(JSON.parse(request));
            break;
        case 'enableVisualiser':
            enableVisualiser();
            break;
        case 'disableVisualiser':
            disableVisualiser();
            break;
        case 'refresh':
            process_details(request);
            setEventListeners();
            break;
    }

    /*request = JSON.parse(request);
    console.log(request);
    switch(request.type) {
        case 'init':
            // check if we already have data for this domain
            console.log("Running init");
            project_id = request.projectId;
            console.log("Setting project Id to " +project_id);
            ls = localStorage[request.projectId];
            if (ls === undefined) {
                console.log("Not initialised for this domain yet");
                // do nothing
            } else {
                console.log("Starting viualisation: " +project_id);
                sendResponse({projectId: project_id});
            }
            break;
        case 'get_details':
            console.log("Returning details: " +project_id);
            sendResponse({projectId: project_id});
            break;
        default:
            console.log("unknown message");
    } */

  }
);


/**
 * When the popup is loaded we request the project id from the background script and process the result accordingly
 */
document.addEventListener('DOMContentLoaded', function () {

    console.log("Visualiser popup loaded");
    $("#token").val(localStorage.getItem("token"));
    sendMessageToBackgroundScript({type: 'get_details'}, process_details);
});

function process_details(response) {

    console.log("process_details");
    console.log(response);
    // show the form 
    console.log("Project id is " +response.projectId +" enabled?" +response.enabled);
    if (response.enabled == false) {
        disableVisualiser();
    } else if (response.projectId != 0) {
        //console.log("We alreasy have data for this domain");
        $("#app-form-no-optimizely").hide();
        $("#app-form").show();


        setEventListeners();

        $("#account-id").val(response.projectId);

        $("#visualise-results, #clear-all").hide();
        if ((localStorage[$("#account-id").val()] !== undefined) && (localStorage[$("#account-id").val()] !== '')) {
            // we already have results for this domain
            $("#visualise-results, #clear-all").show();

            tmp = JSON.parse(localStorage[$("#account-id").val()]);

            var date = new Date(tmp.date);
            var month = date.getUTCMonth() + 1; //months from 1-12
            var day = date.getUTCDate();
            var year = date.getUTCFullYear();
            var seconds = date.getSeconds();
            var minutes = date.getMinutes();
            var hours = date.getHours();


            newdate = day + "/" + month + "/" + year + " " + hours + ":" + minutes + ":" + seconds;

            $("#dataset").val(tmp.datasetSize != '' ? tmp.datasetSize : '10d');

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

            $("#info").html("Data last updated on" + newdate);

        }

        $("#start").click(function () {
            init();
            $("#info").html('');
            chrome.tabs.getSelected(null, function (tab) {
                explorer.URL = tab.url;
            });
            explorer.fetchExperiments();
        });
        
    } else {
        // optimizely is not setup on this page
        $("#app-form-no-optimizely").show();
        $("#app-form").hide();
    }
}


function sendMessageToBackgroundScript(message, callback) {
    //console.log("[visualiser] Sending message to background script..... " + message);
    chrome.runtime.sendMessage(JSON.stringify(message), callback);
}

function sendMessageToContentScript(message) {
        //console.log("[visualiser] Sending message to content script..... " + message);

        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, JSON.stringify(message), function (response) {
                console.log(response.farewell);
            });
        });
}

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
        // should we add optimizely_disable=true at the end of url?
        $("#e_url span").html("<a href=\"#\" class=\"iframe-url-link\">" + experiment.obj.edit_url + "</a>");
        $("#e_desc span").html(experiment.obj.description);
        $("#res-link").attr("href", "https://app.optimizely.com/results2?experiment_id=" + experiment.id);
        $("#editor-link").attr("href", "https://app.optimizely.com/edit?experiment_id=" + experiment.id);
        $("#e_code").text(experiment.code);
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

    $("body").delegate("#clear-all", "click", function () {
        window.explorer.removeAllHighlights();
    });

    $("body").delegate("#enable-visualiser", "click", function() {
        sendMessageToBackgroundScript({type: 'enable'}, enableVisualiser);
    });

    $("body").delegate("#disable-visualiser", "click", function() {
        sendMessageToBackgroundScript({type: 'disable'}, disableVisualiser);
        self.close();
    });

    $("#token").blur(function() {
        localStorage.setItem("token", $("#token").val());
    });

}

function enableVisualiser() {
    sendMessageToBackgroundScript({type: 'get_details'}, process_details);
    $(".lego-pane").show();
    $("#enable-visualiser").addClass("lego-button--highlight");
    $("#disable-visualiser").removeClass("lego-button--highlight");
}

function disableVisualiser() {
    $(".lego-pane").hide();
    localStorage.clear();
    $("#disable-visualiser").addClass("lego-button--highlight");
    $("#enable-visualiser").removeClass("lego-button--highlight");
    $("body").delegate("#enable-visualiser", "click", function() {
        sendMessageToBackgroundScript({type: 'enable'}, enableVisualiser);
    });
    var msg = new Object();
    msg.type = 'removeAllHighlights';
    sendMessageToContentScript(msg);
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
    this.redirect = false;
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
    this.enabled = true;
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
        $("#error").html('');
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
        window.explorer.get("projects/" + window.explorer.projectId + "/experiments", window.explorer.postProcessExperiment, window.explorer.postProcessExperimentError, window.explorer.projectId);
        window.explorer.date = new Date();
    },

    updatePendingRequestsCount: function () {
        $("#pending-requests div:eq(0)").html(window.explorer.processingIndex);
        if (window.explorer.processingIndex == 0) {
            localStorage[window.explorer.projectId] = JSON.stringify(window.explorer);
            $("#visualise-results, #clear-all").show();
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
            $("#error").html("Error: " +jqXhr.message +" (experiment " +res +")");
            localStorage[res] = '';
            window.explorer.pushLog("Error: " +jqXhr.message +" (experiment " +res +")");
        }
    },

    postProcessExperimentError: function (res, jqXhr) {
        if (jqXhr.status == 403) {
            $("#error").html("Connection refused. Make sure the token is valid");
            localStorage[res] = '';
            window.explorer.pushLog("Error: Connection refused. Make sure the token is valid");
        } else {
            $("#error").html("Error: " +jqXhr.message);
            localStorage[res] = '';
            window.explorer.pushLog("Error: " +jqXhr.message);
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

            var personalisation = false;
            if (experiment.obj.variation_ids.length == 1) {
                personalisation = true;
                winning_variation = experiment.obj.variation_ids[0];
            }
            window.explorer.experiments[experiment_id].personalisation = personalisation;
            window.explorer.pushLog("Is personalisation? " + personalisation, experiment.index);

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
                // TODO we might need to fetch variation 1 and not original
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
            // check if this is a redirect experiment
            if (experiment.code.indexOf("_optimizely_redirect") > -1) {
                // this is a redirect experiment
                experiment.redirect = true;
            } else {
                var selectors = variation.js_component.match(/\$y?\(["'][^"']*["']\)/g);
                if (selectors != null) {
                    $.each(selectors, function (key, s) {
                        s = s.substring(3, s.length - 2);
                        if (s != "body" && s != "head") {
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
                        }
                    });
                } else {
                    window.explorer.pushLog("Found no selector for variation " + variation.id, experiment.index);
                }
            }
        } else {
            window.explorer.pushLog("Found no variation code for variation " + variation.id, experiment.index);
        }
        window.explorer.visualiseResults(variation.experiment_id);
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
            // the experiment ran on the current page
            $("#active-experiments-lst").append("<li><input type=\"checkbox\" class=\"cb\" checked>" + window.explorer.buildExperimentResultLink(experiment) +(experiment.redirect == true ? " (redirect)" : "") +"<li>");
            var color = "blue";
            if (experiment.uplift < 0) {
                color = "red";
            } else if (experiment.uplift > 0) {
                color = "green";
            }
            if (experiment.personalisation == true) {
                color = "orange";
            }

            for (i = 0; i < experiment.selectors.length; i++) {
                //tab_index = 0;
                window.explorer.highlightElements(experiment.id, window.explorer.experiments[experiment_id].selectors[i], color);
            }
        } else {
            // the experiment did not run on the current page
            $("#inactive-experiments-lst").append("<li>" + window.explorer.buildExperimentResultLink(experiment) + "<li>");
        }
    },

    buildExperimentResultLink: function (experiment) {
        if (experiment.personalisation == true) {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link yellow-link'>" + experiment.obj.description + "</a>";
        }
        if (experiment.uplift > 0) {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link green-link'>" + experiment.obj.description + " (" + experiment.uplift + "%)</a>";
        } else if (experiment.uplift < 0) {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link red-link'>" + experiment.obj.description + " (" + experiment.uplift + "%)</a>";
        } else {
            return "<a href='#' target='_blank' id='" + experiment.id + "' class='experiment-link blue-link'>" + experiment.obj.description + "</a>";
        }
    },

    highlightElements: function (id, selector, color) {
        var msg = new Object();
        msg.type = 'highlight';
        msg.selector = selector;
        msg.color = color;
        msg.id = id;
        sendMessageToContentScript(msg);
    },

    changeURL: function (url) {
        console.log("posting message[changeURL]... ");
        var code = "window.location='" + url + "';";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },

    removeAllHighlights: function () {
        var msg = new Object();
        msg.type = 'removeAllHighlights';
        sendMessageToContentScript(msg);
    },

    fillBox: function (selector) {
        /*console.log("posting message[fillBox]... " + selector);
        var code = "$('" + selector + "').css({'background-color':$('" + selector + "').css('border-color'),'z-index':'999999'});";
        chrome.tabs.executeScript(null, {
            code: code
        });*/
        var msg = new Object();
        msg.type = 'fillBox';
        msg.selector = selector;
        sendMessageToContentScript(msg);
    },

    emptyBox: function (selector) {
        /*console.log("posting message[emptyBox]... " + selector);
        var code = "$('" + selector + "').css({'background-color':'','z-index':'9999'});";
        chrome.tabs.executeScript(null, {
            code: code
        });*/
        var msg = new Object();
        msg.type = 'emptyBox';
        msg.selector = selector;
        sendMessageToContentScript(msg);
    },

    showHighlight: function (selector) {
        /*console.log("posting message[showHighlight]... " + selector);
        var code = "$('" + selector + "').show();";
        chrome.tabs.executeScript(null, {
            code: code
        });*/
        var msg = new Object();
        msg.type = 'showHighlight';
        msg.selector = selector;
        sendMessageToContentScript(msg);
    },

    hideHighlight: function (selector) {
        /*console.log("posting message[showHighlight]... " + selector);
        var code = "$('" + selector + "').hide();";
        chrome.tabs.executeScript(null, {
            code: code
        });*/
        var msg = new Object();
        msg.type = 'hideHighlight';
        msg.selector = selector;
        sendMessageToContentScript(msg);
    },

    /*clearAll: function () {
        console.log("posting message[clearAll]... ");
        $('li input').removeAttr( 'checked')
        var code = "$('.optlyMarkup').remove();";
        chrome.tabs.executeScript(null, {
            code: code
        });
    },
*/
    

}