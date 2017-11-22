var cropcalcJS = require("cropcalc-js");

function salieo(userOptions) {
    var loadedImages = [];
    var salieoDataCache = {};

    var options = {
        "class": "salieo",
        "zoom": false,
        "debug": false,
        "onresize": true
    }

    //Check if we might be in debug mode
    if (window.opener) {
        //Could be in a popup so possibly in edit mode
        window.addEventListener("message", triggerEditMode);
    }

    setOpts(options, userOptions);
    refresh();

    if(options.onresize) {
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
        if (options["debug"]) {
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
            "target-width": displayWidth,
            "target-height": displayHeight,
            "actual-width": salieoData["original-width"] / DPR,
            "actual-height": salieoData["original-height"] / DPR,
            "output-units": "pixel",
            "zoom": false
        }

        setOpts(cropOptions, currentImage.cropOptions); //Override defaults if any cropOptions are already set for this element

        returnedCrop = cropcalcJS.findCrop(salieoData, cropOptions);

        var scale = (displayWidth) / ((returnedCrop["x2"] - returnedCrop["x1"]) * DPR);
        var offsetX = returnedCrop["x1"] * -1 * scale * DPR;
        var offsetY = returnedCrop["y1"] * -1 * scale * DPR;

        if (currentImage.isIMG) {
            //Dealing with <img>
            element.style.boxSizing = "border-box";
            element.style.paddingLeft = "100%";
            element.style.background = "url(" + element.src + ")";
        }
        //Dealing with CSS background image
        element.style.backgroundPosition = offsetX + "px " + offsetY + "px";
        element.style.backgroundSize = Math.ceil(salieoData["original-width"] * scale) + "px " + Math.ceil(salieoData["original-height"] * scale) + "px";
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
                logDebug("Background image not found for element with ID: " + element.id, options);
                return;
            }
            isIMG = false;
            imageURL = style.backgroundImage.slice(4, -1).replace(/"/g, "");
        }

        if (imageURL === "" || typeof imageURL === "undefined") {
            logDebug("Image URL could not be determined for element with ID: " + element.id, options);
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

        request.open('GET', 'https://api.salieo.com/cached/?url=' + encodeURIComponent(currentImage.url) + '&id=' + options["siteid"], true);
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                //Success!
                var salieoData = JSON.parse(this.response);
                if (typeof salieoData["suggested-crops"] === 'undefined') {
                    //Uh oh
                    logDebug("Salieo encountered an error while processing " + imageURL);
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
                logDebug("Salieo encountered an error while processing " + imageURL);
            }
        };
        request.onerror = function () {
            logDebug("Could not establish connection with Salieo API to process " + imageURL);
        };
        request.send();
    }

    function addAvoidArea(currentImage, avoidAreas) {
        var element = currentImage.element;
        var elementRect = currentImage.elementRect;
        var displayWidth = currentImage.elementRect.width;
        var displayHeight = currentImage.elementRect.height;
        var avoidRect;

        for(var j = 0; j < avoidAreas.length; j++) {
            if(avoidAreas[j].top >= elementRect.top && avoidAreas[j].bottom <= elementRect.bottom && avoidAreas[j].left >= elementRect.left && avoidAreas[j].right <= elementRect.right) {
                avoidRect = avoidAreas[j];
                break;
            }
        }

        if(!avoidRect) {
            return;
        }

        var topAmt = (avoidRect.top - elementRect.top) / elementRect.height;
        var bottomAmt = (elementRect.bottom - avoidRect.bottom) / elementRect.height;
        var leftAmt = (avoidRect.left - elementRect.left) / elementRect.width;
        var rightAmt = (elementRect.right - avoidRect.right) / elementRect.width;
        
        var amtArr = [topAmt, leftAmt, bottomAmt, rightAmt];
        
        var bestZone = 0;
        for (var i = 1; i < amtArr.length; i++) {
            if (amtArr[i] > amtArr[bestZone]) {
                bestZone = i;
            }
        }
        
        if(amtArr[bestZone] > amtArr[(bestZone + 2) % amtArr.length] + 0.2) { //Has to be at least 20% bigger than its opposite side
            //We're good to go
            switch (bestZone) {
                case 0:
                    //Top is greatest
                    currentImage.cropOptions["focus-region"] = {"y1": 0, "y2": topAmt * displayHeight};
                    break;
                case 1:
                    //Left is greatest
                    currentImage.cropOptions["focus-region"] = {"x1": 0, "x2": leftAmt * displayWidth};
                    break;
                case 2:
                    //Bottom is greatest
                    currentImage.cropOptions["focus-region"] = {"y1": (1 - bottomAmt) * displayHeight, "y2": displayHeight};
                    break;
                case 3:
                    //Right is greatest
                    currentImage.cropOptions["focus-region"] = {"x1": (1 - rightAmt) * displayWidth, "x2": displayWidth};
                    break;
            }
            currentImage.cropOptions["zoom"] = "focus-fit";
        }
    }

    function addAttributes(currentImage) {
        var dataset = currentImage.element.dataset; //Dataset is not supported by <= IE10
        if(dataset.salieoZoom) {
            currentImage.cropOptions.zoom = parseInt(dataset.salieoZoom);
        }
    }

    function refresh() {
        var rawElements = document.getElementsByClassName(options["class"]);
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
        var avoidElements = document.querySelectorAll("[class*='salieo-avoid']");
        var avoidAreas = [];
        for(var i = 0; i < avoidElements.length; i++) {
            avoidAreas.push(avoidElements[i].getBoundingClientRect());
        }

        var tmpElementRect;
        for(var i = 0; i < loadedImages.length; i++) {  
            loadedImages[i].elementRect = loadedImages[i].element.getBoundingClientRect();
            loadedImages[i].cropOptions = {};

            addAvoidArea(loadedImages[i], avoidAreas);
            addAttributes(loadedImages[i]);
            processImage(loadedImages[i]);
        }
    }

    this.refresh = refresh;
}

module.exports = salieo;