(function results = {
	function Results() {}
	
	Results.prototype.initializeTimeline = function() {
		var resultFrameWidth = $("#results-frame").css("width").substring(0,($("#results-frame").css("width").length-2));
		//console.log(resultFrameWidth);
		//console.log($("#time-line"));
		$('#time-line').find('.timeline-time').detach();
    	var timeCount = 0;
    	while (timeCount * 50 < resultFrameWidth) {
    	//console.log("Appending "+timeCount+"-th timeline element");
    		var time = new Date(new Date().getTime()+5*timeCount*60000);
    		$('<span/>')
    			.addClass('timeline-time')
    			.css("margin-left",(50*timeCount+"px"))
    		    .html("<span>"+(time.getHours() < 10 ? "0"+time.getHours() : time.getHours() )+":"+(time.getMinutes() < 10 ? "0"+time.getMinutes() : time.getMinutes())+"</span>")
    			.appendTo($('#time-line'));
    		timeCount++;
    	}
	}
	
	Results.prototype.processServices = function(route, services) {
	    var times = [];
	    if (typeof services != "object" || route == "") {} else {
	        $.each(services,
	        function(destination, time) {
	            var chompedD = destination.substring(0, destination.length - 2);
	            console.log("Route " + route + " Service to " + chompedD + " in/at " + time);
	            var minutePattern = /min/;
	                var timeP;
	                var scheduled = new Date();
	                var now = new Date();
	                if (Date.parse(time)) {
	                    console.log(Date.parse(time));
	                    scheduled = new Date(Date.parse(time));
	                } else {
	                    var timeComponents = time.split(":");
	                    scheduled.setHours(timeComponents[0]);
	                    console.log(timeComponents[1].match(/(\d+)/)[0]);
	                    scheduled.setMinutes(timeComponents[1].match(/(\d+)/)[0]);
	                    console.log(scheduled);
	                    if (timeComponents[0] < now.getHours()) {
	                        scheduled.setDate(now.getDate() + 1)
	                    }
	                }
	                var diff = Math.floor((scheduled.getTime() - now.getTime()) / 60000);
	                //console.log(Math.floor(diff));
	                timeP = Mustache.render(DBL.Templates.service,{"route": route, "diff": diff*10, "chompedD": chompedD});
	            //}
	            //console.log(timeP);
	            times.push(timeP);
	        });
	        console.log(times);
	        return times;
	    }
	}
	
	Results.prototype.fetchResultsForStop = function(stop, routeId) {
	    if (stop.match(/^\d+$/)) { // It seems we only have a stop ID
	    	if (localStorage.length > 1000) {// Ensure we've loaded a few stops already
	    		for (var i = 0; i < localStorage.length; i++) {
	    			if (localStorage.key(i).match(/^(\d+)/)[0] == stop) {
	    				console.log(localStorage.key(i));
	    				console.log(localStorage.getItem(localStorage.key(i)));
	    				stop = localStorage.key(i);
	    				break;
	    			}
	    		}
	    	}
	    }
	    $('#fetchSpinner').fadeIn();
	    $('#stopSearch').val(stop);
	    DBL.suggestionsAllowed = 0;
	    if (DBL.currentRequest) DBL.currentRequest.abort();
	    DBL.currentRequest = $.post("/", {
	        "stop": stop,
	        "route": routeId
	    },
	    function(results, textStatus, xhr) {
	        if (xhr.status == 204) {
	            $('#fetchSpinner').fadeOut();
	            $('#suggestions').fadeOut();
	            $('#results-frame').find('#results').detach();
	            $('<div/>', {
	                'id': 'results','class': 'no-results',
	                html: "<span id='sign' data-icon='!'>It seems there are no departures at this time.</span>"
	            }).appendTo($('#results-frame'));
	        } else {
	            console.log(results);
	            var times = [];
	            if (routeId == "" || routeId == undefined) {
	                $.each(results,
	                function(route, services) {
	                    if (services != null && services != "1") {
	                        console.log(route);
	                        times = times.concat(processServices(route, services));
	                    }
	                });
	            } else {
	
	                times = processServices(routeId, results);
	            }
	            $.each(times,
	            function(timeIndex) {
	                for (var compareTime = timeIndex + 1; compareTime < times.length; compareTime++) {
	                    var stringT = times[timeIndex];
	                    var matchT = stringT.match(/(\d+)px/)[0];
	                    matchT = Number(matchT.substring(0, matchT.length - 2));
	                    var stringC = times[compareTime];
	                    //console.log(stringC);
	                    var matchC = stringC.match(/(\d+)px/)[0];
	                    matchC = Number(matchC.substring(0, matchC.length - 2));
	                    //console.log(matchT + " " + matchC);
	                    if (matchC <= matchT) {
	                        var temp = times[timeIndex];
	                        times[timeIndex] = times[compareTime];
	                        times[compareTime] = temp;
	                    }
	
	                }
	
	            })
	            //$('#results').detach();
	            $('#fetchSpinner').fadeOut();
	            $('#suggestions').fadeOut();
	            $('#results-frame').find('#results').detach();
	            //$('<div/>', {'id': 'results', html: times.join('')}).appendTo('#times');
	            
	            $('<div/>', {
	                'id': 'results',
	                html: times.join('')
	            }).appendTo($('#results-frame'));
	            $('#stopDirection a').detach();
	                $('<a/>', {
	                'href': 'http://maps.google.com/maps?q=' + stop + '%40' + JSON.parse(localStorage.getItem(stop))["lat"] + ',' + JSON.parse(localStorage.getItem(stop))["long"] + '&sll=' + JSON.parse(localStorage.getItem(stop))["lat"] + ',' + JSON.parse(localStorage.getItem(stop))["long"] + '&sspn=0.037249,0.10849&t=m&z=15">',
	                 class: 'mapLink button',
	                 html: !(DBL.position == undefined) ? "Show stop in Google Maps ("+ DBL.Util.roundToNDecimals(DBL.Util.haversineDistance(DBL.position.coords.latitude,DBL.position.coords.longitude,JSON.parse(localStorage.getItem(stop))["lat"],JSON.parse(localStorage.getItem(stop))["long"]),2)+" km away)" : "Show stop in Google Maps"
	             }).appendTo('#stopDirection');
	            initializeTimeline();
	            DBL.suggestionIndex = -1;
	            DBL.suggestionsAllowed = 1;
	            DBL.currentStop = stop;
	        }
	        DBL.reloadTimeout = setTimeout(function() {fetchResultsForStop(stop,'')},10000);
	    },
	    "json");
	    
	}

	
	DBL.Results = new Results();
	
}());