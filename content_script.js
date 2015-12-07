console.log("starting content_script.js");
var details = new Object();
var scripts = [].slice.apply(document.getElementsByTagName('script'));
script = scripts.map(function(element) {
if (element.src.indexOf("//cdn.optimizely.com/js/") > -1 && element.src.indexOf("geo") == -1) {
    projectId = element.src.substring(element.src.lastIndexOf("/")+1, element.src.lastIndexOf("."));
    details.type = 'init';
    details.projectId = projectId;
    console.log(details);
    sendMessage(details, null);
    //console.log("message sent");
  }
});


   /* chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.tabs.sendMessage(
                tabs[0].id,
                {from: 'popup', subject: 'DOMInfo'},
                'setDOMInfo');
    });*/


    /*chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, 'JSON.stringify(message)', function (response) {
            console.log(response);
        });
    });*/



function sendMessage(message, callback) {
	chrome.runtime.sendMessage(JSON.stringify(message), function(response) {
	  console.log(response);
	});
}



/*chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log('[content_script] Got a message ' +request);

    console.log(JSON.parse(request));



  }
);*/

chrome.runtime.onMessage.addListener(

function (request, sender, sendResponse) {
console.log("[content_script] Message received");
console.log(request);
    res = JSON.parse(request);
    switch (res.type) {
        case "highlight":
            highlightElement(res.id, res.selector, res.color);
            break;
        case "removeAllHighlights":
            RemoveAllHighlights();
            break;
        case "fillBox":
            fillBox(res.selector);
            break;
        case "emptyBox":
            emptyBox(res.selector);
            break;
        case "showHighlight":
            showHighlight(res.selector);
            break;
        case "hideHighlight":
            hideHighlight(res.selector);
            break;
        case "start":
        	console.log("Starting....");
        	break;
        default:
            console.log("[content_script] ERROR: No default message handler");
            console.log(request);
    }

});

/**
 * highlight the given element in the given color 
 */
function highlightElement(id, selector, color) {
	console.log("[content_script] Highlighting element id:" +id +" sel:" +selector +" in " +color);
    e = $(selector);
    if (e !== 'undefined' && e.position() !== undefined && e.length > 0 && e.is(':visible')) {
        $.each(e, function (ek, ev) {
            if ($(this).context.localName != 'html') {
                if ($(this).next('.optlyMarkup').length == 0) {
                    $('<div class=\"optlyMarkup ' + id + '\"><p class=\"uplift\" style=\"visibility:hidden\">' + id + '</p></div>').insertAfter($(this)).css({
                        'visibility': 'visible',
                            'color': 'red',
                            'border-color': color,
                            'border-width': '3px',
                            'border-style': 'solid',
                            'z-index': '9999',
                            'width': $(this).width() + 10,
                            'height': $(this).height() + 10,
                            'top': ($(this).position().top - 5) + 'px',
                            'left': ($(this).position().left - 5) + 'px',
                            'position': 'absolute'
                    });
                } else {
                    $(this).next('.optlyMarkup').append('<p class=\"uplift\" style=\"visibility:hidden\">' + id + '</p>');
                    $(this).next('.optlyMarkup').addClass(id);
                }
            } else {
                console.log('Cannot add element on top level html element');
            }
        });
    }

    // remove the highlight box after one sec of mouse over to allow navigation
    var timeout;
    $(".optlyMarkup." +id).mouseover(function(e){
        var e = $(this)
        timeout = setTimeout(function() {
        console.log(e);
            $(e).hide();
        }, 1000);
    });

    $(".optlyMarkup."+id).mouseleave(function() {
        clearTimeout(timeout);
    });
}

/**
 * remove all highlights from the current page 
 */
function RemoveAllHighlights() {
    console.log("[content_script] Remove all highlights");
    $('.optlyMarkup').remove();
}

/**
 * fill the highlight box content in plain color
 */
function fillBox(selector) {
    console.log("[content_script] fillBox " +selector);
    $(selector).css({'background-color':$(selector).css('border-color'),'z-index':'999999'});
}

/**
 * remove the plain color overlay
 */
function emptyBox(selector) {
    console.log("[content_script] emptyBox " +selector);
    $(selector).css({'background-color':'','z-index':'9999'});
}

/**
 * show this element
 */
function showHighlight(selector) {
    console.log("[content_script] showHighlight " +selector);
    $(selector).show();
}

/**
 * hide this element
 */
function hideHighlight(selector) {
    console.log("[content_script] showHighlight " +selector);
    $(selector).hide();
}



	