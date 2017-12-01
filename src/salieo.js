var cropcalcJS = require("cropcalc-js");

function salieo(userOptions) {
    var loadedImages = [];
    var salieoDataCache = {};

    var options = {
        img_class: "salieo",
        avoid_class: "salieo-avoid",
        watch_resize: true,
        crop_options: {},
        debug: false
    }

    //Check if we might be in debug mode
    if (window.opener) {
        //Could be in a popup so possibly in edit mode
        window.addEventListener("message", triggerEditMode);
    }

    setOpts(options, userOptions);
    refresh();

    if(options.watch_resize) {
        window.addEventListener('resize', function(event) {
            refresh();
        });
    }

    //Handy to use functions
    function setOpts(standard, user) {
        if (typeof user === 'object') {
            for (var key in user) {
                standard[key] = user[key];
            }
        }
    }

    function logDebug(message) {
        if (options.debug) {
            console.log(message);
        }
    }

    function triggerEditMode(event) {
        if (event.data === "edit") {
            window.removeEventListener("message", triggerEditMode);
            debugMode(imgElements, event.source);
        }
    }

    function getCacheKey(url) {
        return "_salieo_" + url;
    }

    function positionElement(currentImage) {
        var element = currentImage.element;
        var displayWidth = currentImage.elementRect.width;
        var displayHeight = currentImage.elementRect.height;
        var salieoData = salieoDataCache[currentImage.url]; //Get cached Salieo data for this image

        var DPR = window.devicePixelRatio;
        
        var cropOptions = {
            target_width: displayWidth,
            target_height: displayHeight,
            actual_width: salieoData.orig_width / DPR,
            actual_height: salieoData.orig_height / DPR
        }

        setOpts(cropOptions, currentImage.cropOptions); //Override defaults if any cropOptions are already set for this element

        returnedCrop = cropcalcJS.findCrop(salieoData, cropOptions);

        var scale = (displayWidth) / ((returnedCrop.x2 - returnedCrop.x1) * DPR);
        var offsetX = returnedCrop.x1 * -1 * scale * DPR;
        var offsetY = returnedCrop.y1 * -1 * scale * DPR;

        if (currentImage.isIMG) {
            //Dealing with <img>
            element.style.boxSizing = "border-box";
            element.style.paddingLeft = "100%";
            element.style.background = "url(" + element.src + ")";
        }
        //Dealing with CSS background image
        element.style.backgroundPosition = offsetX + "px " + offsetY + "px";
        element.style.backgroundSize = Math.ceil(salieoData.orig_width * scale) + "px " + Math.ceil(salieoData.orig_height * scale) + "px";
    }

    function getElementURL(element) {
        var isIMG = true;
        
        if (element.tagName === "IMG") {
            imageURL = element.src;
        } else {
            // Get the image id, style and the url from it
            var style = element.currentStyle || window.getComputedStyle(element, false);
            // For IE we need to remove quotes to the proper url
            if (!style.backgroundImage) {
                logDebug("Background image not found for element with ID: " + element.id);
                return;
            }
            isIMG = false;
            imageURL = style.backgroundImage.slice(4, -1).replace(/"/g, "");
        }

        if (imageURL === "" || typeof imageURL === "undefined") {
            logDebug("Image URL not found for element with ID: " + element.id);
            return;
        }

        //Returns an array with the URL of the image and a boolean indicating if the image is from an <img> tag.
        return [imageURL, isIMG];
    }

    function processImage(currentImage) {
        var cacheKey = getCacheKey(currentImage.url);

        if(salieoDataCache[currentImage.url]) {
            if(salieoDataCache[currentImage.url].elementRect) {
                salieoDataCache[currentImage.url] = currentImage;
                return; //This image data is currently being fetched so don't try to request it again.
            }

            //We have this data in memory so no need to fetch it from the API
            positionElement(currentImage);
            return;
        } else if (localStorage.getItem(cacheKey)) {
            //We have this data cached in localStorage so no need to fetch it from the API (unless it has expired)
            var cachedData = JSON.parse(localStorage.getItem(cacheKey));
            if(cachedData.expires < Date.now()) {
                //Drat..it expired. We gotta remove it and fetch the data as usual.
                localStorage.removeItem(cacheKey);
            } else {
                //We have the data and it hasn't expired. Celebrations! Let's load it into a local variable.
                salieoDataCache[currentImage.url] = cachedData.data;
                positionElement(currentImage);
                return;
            }
        }

        //If we've gotten to this point we don't have data for this image cached, send the request to the API
        var request = new XMLHttpRequest();
        salieoDataCache[currentImage.url] = currentImage;

        request.open('GET', 'https://api.salieo.com/cached/?url=' + encodeURIComponent(currentImage.url) + '&id=' + options.site_id, true);
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                //Success!
                var salieoData = JSON.parse(this.response);
                if (typeof salieoData.crops.suggested === 'undefined') {
                    //Uh oh
                    logDebug("Error while processing: " + imageURL);
                } else {
                    var continueWith = salieoDataCache[currentImage.url]; //Continue with positioning the latest img object
                    salieoDataCache[currentImage.url] = salieoData; //Cache the data from the API
                    localStorage.setItem(getCacheKey(currentImage.url), JSON.stringify({
                        expires: Date.now() + 86400000, //Expires 1 day from now
                        data: salieoData
                    })); //Cache the data in localStorage
                    positionElement(continueWith);
                }
            } else {
                //Server returned error
                logDebug("Error while processing: " + imageURL);
            }
        };
        request.onerror = function () {
            logDebug("Could connect to Salieo API to process: " + imageURL);
        };
        request.send();
    }

    function addAvoidArea(currentImage, avoidAreas) {
        var element = currentImage.element;
        var elementRect = currentImage.elementRect;
        var displayWidth = currentImage.elementRect.width;
        var displayHeight = currentImage.elementRect.height;
        var avoidElem;
        var avoidRect;

        for(var j = 0; j < avoidAreas.length; j++) {
            avoidRect = avoidAreas[j].elementRect;
            if(avoidRect.top >= elementRect.top && avoidRect.bottom <= elementRect.bottom && avoidRect.left >= elementRect.left && avoidRect.right <= elementRect.right) {
                avoidElem = avoidAreas[j];
                break;
            }
        }

        if(!avoidElem) {
            return;
        }

        var topAmt = (avoidRect.top - elementRect.top) / elementRect.height;
        var bottomAmt = (elementRect.bottom - avoidRect.bottom) / elementRect.height;
        var leftAmt = (avoidRect.left - elementRect.left) / elementRect.width;
        var rightAmt = (elementRect.right - avoidRect.right) / elementRect.width;

        var bestZoneMapping = {top: 0, bottom: 1, left: 2, right: 3};
        var bestZone = avoidElem.dataset.salieoAvoid ? bestZoneMapping[avoidElem.dataset.salieoAvoid] : undefined;

        if(!bestZone && bestZone !== 0) { //Either a specific zone wasn't specified, or "auto" was specified if this is true
            var amtArr = [topAmt, leftAmt, bottomAmt, rightAmt];

            bestZone = 0;
            for (var i = 1; i < amtArr.length; i++) {
                if (amtArr[i] > amtArr[bestZone]) {
                    bestZone = i;
                }
            }
            if(amtArr[bestZone] <= amtArr[(bestZone + 2) % amtArr.length] + 0.2) { //Has to be at least 20% bigger than its opposite side
                return;
            }
        }

        switch (bestZone) {
            case 0:
                //Top is greatest
                currentImage.cropOptions.focus = {y2: topAmt * displayHeight};
                break;
            case 1:
                //Left is greatest
                currentImage.cropOptions.focus = {x2: leftAmt * displayWidth};
                break;
            case 2:
                //Bottom is greatest
                currentImage.cropOptions.focus = {y1: (1 - bottomAmt) * displayHeight};
                break;
            case 3:
                //Right is greatest
                currentImage.cropOptions.focus = {x1: (1 - rightAmt) * displayWidth};
                break;
        }
        currentImage.cropOptions.zoom = "focus";
    }

    function addAttributes(currentImage) {
        var dataset = currentImage.element.dataset; //Dataset is not supported by <= IE10

        // Add zoom option
        if(dataset.salieoZoom) {
            currentImage.cropOptions.zoom = isNaN(dataset.salieoZoom) ? dataset.salieoZoom : parseInt(dataset.salieoZoom);
        }

        // Add focus options
        var focusSides = ["X1", "X2", "Y1", "Y2"];
        for(var i = 0; i < focusSides.length; i++) {
            if(dataset["salieoFocus" + focusSides[i]]) {
                currentImage.cropOptions.focus = currentImage.cropOptions.focus || {};
                currentImage.cropOptions.focus[toLowerCase(focusSides[i])] = (parseInt(dataset["salieoFocus" + focusSides[i]]) / 100) 
                    * (i < 2 ? currentImage.elementRect.width : currentImage.elementRect.height);
            }
        }

    }

    function refresh() {
        var rawElements = document.getElementsByClassName(options.img_class);
        var newSalieoDataCache = {};
        var tmpImgInfo, currentImage;

        loadedImages = [];

        for(var i = 0; i < rawElements.length; i++) {
            tmpImgInfo = getElementURL(rawElements[i]);
            if(!tmpImgInfo) {
                continue; //Error getting image URL
            }

            if(salieoDataCache.hasOwnProperty(tmpImgInfo[0])) {
                //Retain cache data if old cache had data for this URL
                newSalieoDataCache[tmpImgInfo[0]] = salieoDataCache[tmpImgInfo[0]];
            }

            currentImage = {
                element: rawElements[i],
                url: tmpImgInfo[0],
                isIMG: tmpImgInfo[1]
            };

            loadedImages.push(currentImage);
        }

        reprocess();
    }
    
    function reprocess() {
        //Get information for avoid areas
        var avoidElements = document.getElementsByClassName(options.avoid_class);
        var avoidAreas = [];
        for(var i = 0; i < avoidElements.length; i++) {
            avoidAreas.push({elementRect: avoidElements[i].getBoundingClientRect(), dataset: avoidElements[i].dataset});
        }

        var tmpElementRect;
        for(var i = 0; i < loadedImages.length; i++) {  
            loadedImages[i].elementRect = loadedImages[i].element.getBoundingClientRect();
            loadedImages[i].cropOptions = options.crop_options;

            addAvoidArea(loadedImages[i], avoidAreas);
            addAttributes(loadedImages[i]);
            processImage(loadedImages[i]);
        }
    }

    this.refresh = refresh;
}

module.exports = salieo;