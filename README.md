# salieo.js

[![salieo.js on NPM](https://img.shields.io/npm/v/salieo.js.svg?style=flat-square)](https://www.npmjs.com/package/salieo.js) [![Build Status](https://img.shields.io/travis/salieo/salieo.js.svg?style=flat-square)](https://travis-ci.org/salieo/salieo.js) [![jsDelivr Hits](https://data.jsdelivr.com/v1/package/npm/salieo.js/badge)](https://www.jsdelivr.com/package/npm/salieo.js)

Intelligently responsify your site's images in seconds. To use salieo.js you'll need to set up your site on [www.salieo.com](https://www.salieo.com) first.

## Introduction

salieo.js is a lightweight browser library that automatically positions and scales your images so they display properly on all devices with any aspect ratio or pixel density while retaining the most important parts of your images in view. salieo.js uses [cropcalc-js](https://github.com/salieo/cropcalc-js) to calculate the best crop for an image based on data returned from the Salieo API. 

salieo.js requests crop direction information from the Salieo API for all enabled images on your site. If the Salieo API has not processed this image before it may take a second to do so (resulting in a small delay between the time your images load and when they are repositioned and/or scaled by salieo.js). Don't worry though, this only happens once.

After the images are processed the first time by the Salieo API, the results are cached on a global CDN to enable near instantaneous delivery of the data for future page loads anywhere in the world. This way, subsequent page loads should not see any visible jump when salieo.js repositions the images. The data is loaded and the transformations are applied all before the image loads.

salieo.js can work on any element with a CSS `background-image` or any `<img>` element. Just add the `salieo` class (or the custom class you specified with the [img_class](#img_class) option) and you're off to the races.

## Browser Compatability

All modern browsers (and IE11) are supported by salieo.js:

![Chrome](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/43.2.0/chrome/chrome_24x24.png) ![Firefox](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/43.2.0/firefox/firefox_24x24.png) ![Edge](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/43.2.0/edge/edge_24x24.png) ![Opera](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/43.2.0/opera/opera_24x24.png) ![Safari](https://cdnjs.cloudflare.com/ajax/libs/browser-logos/43.2.0/safari/safari_24x24.png) ![IE](https://raw.githubusercontent.com/alrra/browser-logos/master/src/archive/internet-explorer_9-11/internet-explorer_9-11_24x24.png)

**NOTE:** IE11 and Edge currently have an issue with allowing script access to [window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) when a page is accessed locally with `file://`  As a result, salieo.js will not function on IE11 and Edge on pages loaded in this fashion. salieo.js works just fine on IE11 and Edge when pages are loaded over `http://` and works fine with pages loaded through `file://` on all other browsers.

## Setup

Get started quickly by including salieo.js in your site's `<head>` with the following:

```html
<script src="https://cdn.jsdelivr.net/npm/salieo.js@0/dist/salieo.min.js" defer></script>
```

Or if you'd rather use your own build system that's fine too. As salieo.js is built as a UMD bundle, you can use it with just about any module loader you like.

```shell
npm install salieo.js
```

## Getting Started

Create an instance, passing in your [options](#options).

```javascript
var instance;
document.addEventListener("DOMContentLoaded", function() {
    instance = new salieo({
        site_id: "YOURSITEID"
    });
});
```

**NOTE:** If an salieo instance isn't initialized early enough during page load, your images may not be positioned properly before they are displayed resulting in a noticeable jump when they reposition. To avoid this, ensure the following:

1. As mentioned in [setup](#setup), if you are using a `<script>` tag to load salieo.js you should include it in your `<head>` *not* at the end of `<body>` as one may be used to. As long as the script is loaded with the `defer` tag it won't block rendering while loading and will ensure salieo.js is fully loaded before the `DOMContentLoaded` event fires.
2. A salieo instance should be created when the the `DOMContentLoaded` event fires. Creating the instance before the DOM has fully loaded could result in salieo not finding all images that need processing. Conversly, creating the instance after the `DOMContentLoaded` event, (i.e. on the `load` event) will likely not give salieo enough time to reposition the images before they are displayed.

## API

### .refresh()
Repopulates the list of images and [avoid areas](#avoid-areas) and reprocesses all images, fetching data from the Salieo API if nessecary for new images.

## Options

Required options have a *

### site_id *
The ID of your site used for identification with the Salieo API. This can be found from your Salieo Dashboard.

```javascript
var options = {
    site_id: "ABCDEF"
};
```

### img_class
**Default:** `"salieo"`

The class of `<img>` or objects with a `background-image` to that should be processed.

### avoid_class
**Default:** `"salieo-avoid"`

The class of objects that should be avoided when positioning a subject. More information is in the [Avoid Areas](#avoid-areas) section.

### watch_resize
**Default:** `true`

If enabled, salieo.js will call [`refresh()`](#refresh) when changes to the size of any [avoid area](#avoid-areas) or image is detected using [ResizeObserver](https://developers.google.com/web/updates/2016/10/resizeobserver).

As a sidenote, due to the poor [browser support](https://caniuse.com/#feat=resizeobserver) for [ResizeObserver](https://developers.google.com/web/updates/2016/10/resizeobserver), salieo.js bundles a [polyfill](https://github.com/que-etc/resize-observer-polyfill).

### crop_options
**Default:** `undefined`

Can be set to an object of [cropcalc-js options](https://github.com/salieo/cropcalc-js#options) that will apply to all images. These options can be overridden on a per-image basis by setting [Crop Options](#crop-options) on an image.

***NOTE:** The `target_width`, `target_height`, `actual_width` and `actual_height` options cannot be specified here as they are set on a per-image basis.

```javascript
var options = {
    crop_options: {
        zoom: "auto"
    }
    ...
};
```

### debug
**Default:** `false`

If enabled with `true`, salieo will not suppress any error messages resulting from failed API calls, helping pinpoint any issues.

## Crop Options

Options that modify how an image is cropped can be specified on a per-image basis through the use of `data-salieo-OPTION` attributes. These options are passed directly to the [cropcalc-js](https://github.com/salieo/cropcalc-js) algorithm. A full list of avaiable options can be found [here](https://github.com/salieo/cropcalc-js#options).

**NOTE:** The `target_width`, `target_height`, `actual_width` and `actual_height` options cannot be specified as they will always be overridden by the salieo with the appropirate values for a given image.

**NOTE 2:** salieo.js automatically takes DPR into account by dividing the `actual_width` and `actual_height` of an image by the DPR before passing them to [cropcalc-js](https://github.com/salieo/cropcalc-js). Thus, salieo.js will never provide a crop that forces the image to be scaled up past a 1:1 ratio with the physical pixels on the screen *unless* an image with insufficient resolution to fill the desired area has been provided. salieo.js will always force images to at least cover the avaiable area.

**Example:**

This example sets the [cropcalc-js](https://github.com/salieo/cropcalc-js) option `zoom` to `"auto"` for this image.

```html
<img src="https://www.example.com/example.jpg" data-salieo-zoom="auto">
```

### Option Mappings

Below are the mappings from the [cropcalc-js options](https://github.com/salieo/cropcalc-js#options) to the associated `data-salieo-OPTION`:

`zoom`     -> `data-salieo-zoom`  
`focus.x1` -> `data-salieo-focus-x1`  
`focus.x2` -> `data-salieo-focus-x2`  
`focus.y1` -> `data-salieo-focus-y1`  
`focus.y2` -> `data-salieo-focus-y2`

**NOTE:** Unlike the [cropcalc-js options](https://github.com/salieo/cropcalc-js#options), the focus sides should *not* be specified in pixels. Instead they should be specified in percentage values (just the number, without the `%` sign). This way when the viewport resizes, the desired focus area can still be achieved with the new size of the image.

**Example:**

This example sets the focus area for this image to be the left half of the crop.

```html
<img src="https://www.example.com/example.jpg" class="salieo" data-salieo-focus-x2="50">
```

## Avoid Areas

Avoid areas provide an easy way to ensure the subject of an image is positioned in free space, not behind text or another overlay. See a [JSFiddle example](https://jsfiddle.net/tv7ndhvg/).

The `salieo-avoid` class (or a custom class as specified with [`avoid_class`](#avoid_class)) can be applied to any object that is positioned over an image that salieo will process. Salieo will then automatically set the [`focus`](https://github.com/salieo/cropcalc-js#focus-1) for that image to be the largest rectangle of free space either to the right, left, top or bottom of that object. The [`zoom`](https://github.com/salieo/cropcalc-js#zoom) option for that image will also be set to [`"focus"`](https://github.com/salieo/cropcalc-js#focus).

**NOTE:** [Crop Options](#crop-options) specified on an image *always* take precedence and will override any settings set by the avoid area calculation. For example, you could set `data-salieo-zoom` to `false` on an image while still using an avoid area to simply shift the image into the appropirate position without any zooming. Global [`crop_options`](#crop_options) set in the options passed when initializing salieo.js will, however, be overridden by the options set through the avoid area calculation.

### Avoid Area Options

The behaviour of an avoid area can optionally be controlled by applying the `data-salieo-avoid` attribute to the element with the [avoid_class](#avoid_class).

**NOTE:** The `data-salieo-avoid` attribute should be applied to the element to be avoided, *not* the image.

**Example:**

This example sets any images that fall below this text element to center the subject in the free space to the right of the text element.

```html
<p class="salieo-avoid" data-salieo-avoid="right">Avoid this!</p>
```

#### auto

This is the default setting. The area of free space to the left, right, top and bottom of the element to be avoided will be calculated. The free space region with the largest area will be selected and the subject of the image being positioned will be centered within it.

If the area of the largest region is *not* at least 20% larger than its opposite region (i.e. the left region is opposite the right region, and the top opposite the bottom, etc.) the avoid area will be ignored and the focus area will be the entire width and height of the image element. For example, this is especially helpful for responsive designs where an element to be avoided may be positioned near the left for larger screen sizes (resulting in the right region being selected for the focus area) but center positioned for smaller screen sizes resulting in the avoid area being ignored and the subject being centered behind the text.

For more control, the behaviour of the avoid area region selection can be selected manually with one of the options below.

#### left

The region to the left of the element to be avoided will always be selected as the focus area.

#### right

The region to the right of the element to be avoided will always be selected as the focus area.

#### top

The region above the element to be avoided will always be selected as the focus area.

#### bottom

The region below the element to be avoided will always be selected as the focus area.


## Licence

MIT. © 2017 Salieo

[![Certified Awesome](https://img.shields.io/badge/certified-awesome-orange.svg?style=flat-square)](https://www.salieo.com)


